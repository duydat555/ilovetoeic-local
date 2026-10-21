import React, { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Check,
  Coins,
  Crown,
  Headphones,
  History,
  KeyRound,
  LockKeyhole,
  Medal,
  Minus,
  Plus,
  Swords,
  Timer,
  Trophy,
  UsersRound,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { BoneyardSkeleton } from "../../components/common/BoneyardSkeleton";
import {
  arenaApi,
  ArenaHistoryItem,
  ArenaLeader,
  ArenaLobby,
  ArenaMatch,
  ArenaMode,
  ArenaTransaction,
} from "../../services/arena";
import { normalizeMediaUrl } from "../../utils/mediaUrl";
import { ArenaDialog } from "./ArenaDialog";
import { ArenaSnowfall } from "./ArenaSnowfall";
import { useArenaAudio } from "./useArenaAudio";
import "./arena.css";

const names = {
  speed: "Part 5 Speed Duel",
  vocabulary: "Vocabulary Blitz",
  listening: "Listening Fill-in",
};
const format = (n: number) => n.toLocaleString("vi-VN");
const terminal = (m: ArenaMatch) =>
  ["finished", "cancelled"].includes(m.status);

function Avatar({ name, src }: { name: string; src?: string | null }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="arena-avatar">
      {src && !failed ? (
        <img src={src} alt="" onError={() => setFailed(true)} />
      ) : (
        name.slice(0, 1).toUpperCase()
      )}
    </span>
  );
}

function Leaderboard({
  leaders,
  full = false,
}: {
  leaders: ArenaLeader[];
  full?: boolean;
}) {
  const champion = leaders[0];
  if (!champion)
    return (
      <div className="arena-empty">
        <Crown size={40} />
        <h3>Ngôi vương đang chờ bạn</h3>
        <p>Hoàn thành trận đấu đầu tiên để ghi tên trên bảng xếp hạng.</p>
      </div>
    );
  return (
    <>
      <div className="arena-champion">
        <Crown size={32} />
        <Avatar name={champion.name} src={champion.avatar} />
        <h3>{champion.name}</h3>
        <small>NGÔI VƯƠNG</small>
        <strong>
          <Coins size={21} />
          {format(champion.earned_xp)}
        </strong>
        <p>
          {champion.wins} thắng / {champion.losses} bại
        </p>
      </div>
      <ol className="arena-leaders">
        {leaders.slice(1, full ? 50 : 10).map((p, i) => (
          <li key={p.user_id}>
            <span className="arena-position">{i + 2}</span>
            <Avatar name={p.name} src={p.avatar} />
            <span className="arena-player-name">
              <b>{p.name}</b>
              <small>
                {p.wins} thắng / {p.losses} bại
              </small>
            </span>
            <strong>+{format(p.earned_xp)}</strong>
          </li>
        ))}
      </ol>
    </>
  );
}

export default function ArenaPage() {
  const { user, refreshSession } = useAuth();
  const [lobby, setLobby] = useState<ArenaLobby | null>(null);
  const [leaders, setLeaders] = useState<ArenaLeader[]>([]);
  const [history, setHistory] = useState<ArenaHistoryItem[]>([]);
  const [transactions, setTransactions] = useState<ArenaTransaction[]>([]);
  const [match, setMatch] = useState<ArenaMatch | null>(null);
  const [mode, setMode] = useState<ArenaMode>("speed");
  const [wager, setWager] = useState(20);
  const [code, setCode] = useState("");
  const [copiedCode, setCopiedCode] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [connection, setConnection] = useState("");
  const [leaderError, setLeaderError] = useState("");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [dialog, setDialog] = useState<
    "create" | "history" | "leaderboard" | "leave" | null
  >(null);
  const [now, setNow] = useState(Date.now());
  const offset = useRef(0);
  const mounted = useRef(true);
  const actionInFlight = useRef(false);
  const close = useCallback(() => setDialog(null), []);
  useEffect(() => {
    if (!copiedCode) return;
    const timer = setTimeout(() => setCopiedCode(""), 2500);
    return () => clearTimeout(timer);
  }, [copiedCode]);

  const accept = useCallback((next: ArenaMatch) => {
    offset.current = next.serverTime * 1000 - Date.now();
    setMatch(next);
    setConnection("");
  }, []);
  const loadLeaders = useCallback(async () => {
    try {
      setLeaders(await arenaApi.leaders());
      setLeaderError("");
    } catch {
      setLeaderError("Chưa tải được bảng xếp hạng.");
    }
  }, []);
  const loadLobby = useCallback(
    async (restore = false) => {
      const next = await arenaApi.lobby();
      if (!mounted.current) return;
      setLobby(next);
      if (restore && next.active) accept(next.active);
    },
    [accept],
  );
  useEffect(() => {
    mounted.current = true;
    void loadLobby(true).catch((e) =>
      setError(e instanceof Error ? e.message : "Không thể tải đấu trường."),
    );
    void loadLeaders();
    return () => {
      mounted.current = false;
    };
  }, [loadLobby, loadLeaders]);

  useEffect(() => {
    if (!match || terminal(match) || busy) return;
    let stopped = false;
    let failures = 0;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      if (document.hidden) {
        timer = setTimeout(poll, 2500);
        return;
      }
      try {
        const next = await arenaApi.state(match.id);
        if (stopped) return;
        accept(next);
        failures = 0;
      } catch {
        failures += 1;
        if (!stopped)
          setConnection("Đang kết nối lại… Trận đấu và XP vẫn được lưu.");
      }
      if (!stopped)
        timer = setTimeout(
          poll,
          failures
            ? Math.min(15000, 1000 * 2 ** failures)
            : match.status === "playing"
              ? 1000
              : 2500,
        );
    };
    timer = setTimeout(poll, 800);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [match?.id, match?.status, accept, busy]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now() + offset.current), 200);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    setAnswer("");
  }, [match?.id, match?.round]);
  useEffect(() => {
    if (!match || !terminal(match)) return;
    void loadLobby().catch(() => undefined);
    void loadLeaders();
    void refreshSession();
  }, [match?.id, match?.status, loadLobby, loadLeaders, refreshSession]);

  const run = async (work: () => Promise<ArenaMatch>) => {
    if (actionInFlight.current) return;
    actionInFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const next = await work();
      accept(next);
      setDialog(null);
      await loadLobby();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Chưa thể thực hiện. Vui lòng thử lại.",
      );
    } finally {
      actionInFlight.current = false;
      setBusy(false);
    }
  };
  const openHistory = () => {
    setDialog("history");
    setHistoryLoading(true);
    setHistoryError("");
    void Promise.all([arenaApi.history(), arenaApi.transactions()])
      .then(([h, t]) => {
        setHistory(h);
        setTransactions(t);
      })
      .catch(() => setHistoryError("Chưa tải được lịch sử trận đấu."))
      .finally(() => setHistoryLoading(false));
  };
  const own = match?.players.find((p) => p.id === user?.id);
  const canAfford = Boolean(
    lobby &&
      wager <= lobby.balance &&
      Number.isInteger(wager) &&
      wager >= 10 &&
      wager <= 1000,
  );
  const playing = match?.status === "playing";
  const seconds = match?.endsAt
    ? Math.max(0, Math.ceil(match.endsAt - now / 1000))
    : 0;
  const duration =
    lobby?.modes.find((m) => m.id === match?.mode)?.seconds || 15;
  const countdown = match?.endsAt
    ? Math.ceil(match.endsAt - duration - now / 1000)
    : 0;
  const isActive = match && !terminal(match);
  const nextTier = lobby?.ranks.find((r) => r.wager > lobby.balance);
  const { sound, toggleSound, playTap } = useArenaAudio(
    match,
    user?.id,
    seconds,
    countdown,
  );

  return (
    <div
      className="arena-surface arena-page"
      onClickCapture={(event) => {
        if ((event.target as HTMLElement).closest("button")) playTap();
      }}
    >
      <ArenaSnowfall />
      <div className="arena-content">
        <header className="arena-header">
          <div className="arena-title">
            <span className="arena-title-icon">
              <Swords />
            </span>
            <div>
              <h1>Thách đấu</h1>
              <p>Đấu XP với bạn bè</p>
            </div>
          </div>
          <div className="arena-header-actions">
            <div className="arena-balance">
              <strong>
                <Coins size={19} />
                {lobby ? format(lobby.balance) : "…"}
              </strong>
              <small>XP khả dụng</small>
            </div>
            <button onClick={openHistory}>
              <History size={17} />
              <span>Lịch sử & BXH</span>
            </button>
            <button
              className="arena-icon-button"
              aria-label={sound ? "Tắt âm thanh" : "Bật âm thanh"}
              aria-pressed={sound}
              onClick={toggleSound}
            >
              {sound ? <Volume2 size={19} /> : <VolumeX size={19} />}
            </button>
          </div>
        </header>
        {error && (
          <div className="arena-error" role="alert">
            <span>{error}</span>
            <button
              onClick={() => {
                setError("");
                void loadLobby(true).catch((e) => setError(e.message));
              }}
            >
              Thử lại
            </button>
          </div>
        )}
        {connection && (
          <p className="arena-connection" role="status">
            {connection}
          </p>
        )}
        {isActive &&
          match.players.some((p) => p.id !== user?.id && !p.online) && (
            <p className="arena-connection" role="status">
              Đối thủ đang mất kết nối và có thể quay lại. Thời gian trận đấu
              vẫn tiếp tục.
            </p>
          )}
        {!lobby && !error ? (
          <div
            className="arena-grid"
            role="status"
            aria-label="Đang tải đấu trường"
          >
            <BoneyardSkeleton name="arena-main" height={490} />
            <BoneyardSkeleton name="arena-leaders" height={490} />
          </div>
        ) : (
          lobby && (
            <div className="arena-grid">
              <section className="arena-main" aria-label="Thi đấu">
                {!isActive && !match && (
                  <>
                    <h2 className="arena-label">CHỌN CHẾ ĐỘ</h2>
                    <div className="arena-modes">
                      {lobby.modes.map((m) => {
                        const Icon = m.id === "listening" ? Headphones : Zap;
                        return (
                          <button
                            key={m.id}
                            aria-pressed={mode === m.id}
                            className={mode === m.id ? "is-selected" : ""}
                            onClick={() => setMode(m.id)}
                          >
                            <span className="arena-mode-icon">
                              <Icon size={20} />
                            </span>
                            <span>
                              <b>{m.name}</b>
                              <small>
                                {m.rounds} vòng · {m.seconds}s/vòng
                              </small>
                            </span>
                            {mode === m.id && <Check size={17} />}
                          </button>
                        );
                      })}
                    </div>
                    <h2 className="arena-label">CHỌN MỨC CƯỢC</h2>
                    <div className="arena-ranks">
                      {lobby.ranks.map((r, i) => {
                        const locked = r.wager > lobby.balance;
                        return (
                          <button
                            key={r.wager}
                            className={`arena-rank rank-${i} ${wager === r.wager ? "is-selected" : ""}`}
                            aria-pressed={wager === r.wager}
                            disabled={locked}
                            onClick={() => setWager(r.wager)}
                          >
                            <span>
                              <Medal size={24} />
                              <b>{r.name}</b>
                              {locked && <LockKeyhole size={17} />}
                            </span>
                            <strong>
                              <Coins size={18} />
                              {format(r.wager)} XP
                            </strong>
                            <div className="arena-outcomes">
                              <span>+{(r.wager * 70) / 100}</span>
                              <span>−{r.wager}</span>
                            </div>
                            <small>
                              {locked
                                ? `Cần thêm ${format(r.wager - lobby.balance)} XP`
                                : wager === r.wager
                                  ? "Đã chọn"
                                  : "Có thể tham gia"}
                            </small>
                          </button>
                        );
                      })}
                    </div>
                    <section className="arena-wager">
                      <div>
                        <h3>Tự chọn mức cược</h3>
                        <small>10–1.000 XP</small>
                      </div>
                      <div className="arena-wager-row">
                        <div className="arena-stepper">
                          <button
                            aria-label="Giảm mức cược"
                            disabled={wager <= 10}
                            onClick={() => setWager(Math.max(10, wager - 10))}
                          >
                            <Minus size={18} />
                          </button>
                          <input
                            aria-label="Mức cược XP"
                            type="number"
                            min={10}
                            max={1000}
                            step={1}
                            value={wager}
                            onChange={(e) => setWager(Number(e.target.value))}
                          />
                          <button
                            aria-label="Tăng mức cược"
                            disabled={wager >= 1000}
                            onClick={() => setWager(Math.min(1000, wager + 10))}
                          >
                            <Plus size={18} />
                          </button>
                        </div>
                        <div className="arena-payout">
                          <span>
                            Thắng +{format(Math.floor((wager * 70) / 100))}
                          </span>
                          <span>Thua −{format(wager)}</span>
                        </div>
                      </div>
                      {!canAfford && (
                        <p className="arena-warning">
                          {wager > lobby.balance
                            ? `Cần thêm ${format(wager - lobby.balance)} XP`
                            : "Chọn mức cược từ 10 đến 1.000 XP."}
                        </p>
                      )}
                    </section>
                    <div className="arena-cta-row">
                      <button
                        className="arena-primary"
                        disabled={busy || !canAfford}
                        onClick={() =>
                          void run(() => arenaApi.create(mode, wager, true))
                        }
                      >
                        <UsersRound size={22} />
                        Tìm trận nhanh
                      </button>
                      <button
                        disabled={busy || !canAfford}
                        onClick={() => setDialog("create")}
                      >
                        <KeyRound size={22} />
                        Tạo phòng
                      </button>
                    </div>
                    <form
                      className="arena-join"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void run(() => arenaApi.join(code));
                      }}
                    >
                      <label htmlFor="arena-code">
                        <KeyRound size={23} />
                        <span>Mã phòng</span>
                      </label>
                      <input
                        id="arena-code"
                        value={code}
                        maxLength={6}
                        autoComplete="off"
                        placeholder="NHẬP MÃ PHÒNG"
                        onChange={(e) =>
                          setCode(
                            e.target.value
                              .toUpperCase()
                              .replace(/[^A-Z2-9]/g, ""),
                          )
                        }
                      />
                      <button
                        className="arena-primary"
                        disabled={busy || code.length !== 6}
                      >
                        Vào <ArrowRight size={17} />
                      </button>
                    </form>
                    <p className="arena-rule">
                      XP cược được tạm giữ khi vào phòng. Hủy trước trận hoặc
                      hòa sẽ được hoàn lại.
                    </p>
                    {nextTier && (
                      <div className="arena-unlock">
                        <label htmlFor="arena-rank-progress">
                          Mở mức cược {nextTier.name}: {format(lobby.balance)} /{" "}
                          {format(nextTier.wager)} XP
                        </label>
                        <progress
                          id="arena-rank-progress"
                          value={lobby.balance}
                          max={nextTier.wager}
                        />
                      </div>
                    )}
                    <div className="arena-my-stats">
                      <span>
                        <b>{lobby.stats.wins}</b> Trận thắng
                      </span>
                      <span>
                        <b>{lobby.stats.losses}</b> Trận thua
                      </span>
                      <span>
                        <b>{lobby.stats.draws}</b> Trận hòa
                      </span>
                    </div>
                  </>
                )}

                {match && !playing && !terminal(match) && (
                  <div className="arena-session">
                    <Swords className="arena-session-icon" size={48} />
                    <h2>
                      {match.status === "searching"
                        ? "Đang tìm đối thủ"
                        : "Phòng chờ"}
                    </h2>
                    <p>
                      {names[match.mode]} · {match.wager} XP
                    </p>
                    <div className="arena-room-code">
                      <small>Mã phòng</small>
                      <strong>{match.code}</strong>
                      <button
                        onClick={async () => {
                          try {
                            if (!navigator.clipboard)
                              throw new Error("clipboard unavailable");
                            await navigator.clipboard.writeText(match.code);
                            setCopiedCode(match.code);
                          } catch {
                            setError(
                              `Mã phòng: ${match.code}. Bạn có thể nhập mã này để tham gia.`,
                            );
                          }
                        }}
                      >
                        Sao chép mã
                      </button>
                      <span role="status" aria-live="polite">
                        {copiedCode === match.code
                          ? "Đã sao chép mã phòng"
                          : ""}
                      </span>
                    </div>
                    <div className="arena-waiting-players">
                      {match.players.map((p) => (
                        <div key={p.id}>
                          <Avatar name={p.name} src={p.avatar} />
                          <b>{p.name}</b>
                          <small>
                            {p.ready ? "Đã sẵn sàng" : "Đang chuẩn bị"}
                            {p.id === match.hostId ? " · Chủ phòng" : ""}
                          </small>
                        </div>
                      ))}
                      {match.players.length < 2 && (
                        <div className="arena-opponent-slot">
                          <UsersRound size={32} />
                          <b>Chờ người chơi</b>
                          <small>Chia sẻ mã để mời bạn bè</small>
                        </div>
                      )}
                    </div>
                    <p className="arena-muted">
                      Phòng hết hạn sau{" "}
                      {Math.max(0, Math.ceil(match.expiresAt - now / 1000))}{" "}
                      giây
                    </p>
                    <div className="arena-session-actions">
                      <button
                        disabled={
                          busy || own?.ready || match.status === "searching"
                        }
                        className="arena-primary"
                        onClick={() =>
                          void run(() => arenaApi.action(match.id, "ready"))
                        }
                      >
                        {own?.ready ? "Đã sẵn sàng" : "Sẵn sàng"}
                      </button>
                      {match.hostId === user?.id && (
                        <button
                          disabled={
                            busy ||
                            match.players.length !== 2 ||
                            !match.players.every((p) => p.ready)
                          }
                          onClick={() =>
                            void run(() => arenaApi.action(match.id, "start"))
                          }
                        >
                          Bắt đầu trận
                        </button>
                      )}
                      <button
                        disabled={busy}
                        onClick={() =>
                          void run(() => arenaApi.action(match.id, "leave"))
                        }
                      >
                        Hủy tìm / Rời phòng
                      </button>
                    </div>
                  </div>
                )}

                {playing && match && (
                  <section className="arena-session arena-game">
                    <div className="arena-game-top">
                      <span>{names[match.mode]}</span>
                      <strong>
                        <Timer size={18} />
                        {countdown > 0
                          ? `Bắt đầu sau ${countdown}s`
                          : `${seconds}s`}
                      </strong>
                    </div>
                    <div className="arena-round">
                      Vòng {match.round} / {match.rounds}
                    </div>
                    <progress
                      aria-label="Tiến trình trận đấu"
                      value={match.round}
                      max={match.rounds}
                    />
                    <div className="arena-scoreboard">
                      {match.players.map((p) => (
                        <div key={p.id}>
                          <Avatar name={p.name} src={p.avatar} />
                          <span>
                            <b>{p.name}</b>
                            <small>
                              {p.answered ? "Đã trả lời" : "Đang suy nghĩ"}
                            </small>
                          </span>
                          <strong>{p.score ?? "…"}</strong>
                        </div>
                      ))}
                    </div>
                    <h2 className="arena-question">{match.question?.prompt}</h2>
                    {match.question?.audio && (
                      <audio
                        key={`${match.id}-${match.round}`}
                        controls
                        src={normalizeMediaUrl(match.question.audio)}
                        onLoadedMetadata={(event) => {
                          event.currentTarget.currentTime =
                            match.question?.audioStart || 0;
                        }}
                        onPlay={(event) => {
                          const audio = event.currentTarget;
                          const start = match.question?.audioStart || 0;
                          const end = match.question?.audioEnd;
                          if (
                            audio.currentTime < start ||
                            (end != null && audio.currentTime >= end)
                          )
                            audio.currentTime = start;
                        }}
                        onTimeUpdate={(event) => {
                          const end = match.question?.audioEnd;
                          if (
                            end != null &&
                            event.currentTarget.currentTime >= end
                          )
                            event.currentTarget.pause();
                        }}
                        onError={() =>
                          setError(
                            "Chưa phát được bài nghe. Hãy kiểm tra kết nối.",
                          )
                        }
                      />
                    )}
                    {Boolean(match.question?.options.length) ? (
                      <div className="arena-answers">
                        {match.question?.options.map((text, i) => (
                          <button
                            key={i}
                            disabled={
                              busy ||
                              match.submitted ||
                              seconds === 0 ||
                              countdown > 0 ||
                              Boolean(match.feedback)
                            }
                            className={`${answer === "ABCD"[i] ? "is-selected" : ""} ${match.feedback?.answer === "ABCD"[i] ? "is-correct" : ""}`}
                            onClick={() => {
                              setAnswer("ABCD"[i]);
                              void run(() =>
                                arenaApi.answer(
                                  match.id,
                                  match.round,
                                  "ABCD"[i],
                                ),
                              );
                            }}
                          >
                            <span>{"ABCD"[i]}</span>
                            {text}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <form
                        className="arena-fill"
                        onSubmit={(e) => {
                          e.preventDefault();
                          void run(() =>
                            arenaApi.answer(
                              match.id,
                              match.round,
                              answer.trim(),
                            ),
                          );
                        }}
                      >
                        <label htmlFor="arena-answer">Từ còn thiếu</label>
                        <input
                          id="arena-answer"
                          value={answer}
                          maxLength={160}
                          autoComplete="off"
                          disabled={match.submitted || countdown > 0}
                          onChange={(e) => setAnswer(e.target.value)}
                        />
                        <button
                          className="arena-primary"
                          disabled={
                            busy ||
                            !answer.trim() ||
                            match.submitted ||
                            seconds === 0 ||
                            countdown > 0
                          }
                        >
                          Gửi đáp án
                        </button>
                      </form>
                    )}
                    <div className="arena-feedback" aria-live="polite">
                      {match.feedback ? (
                        <p
                          className={
                            match.feedback.correct
                              ? "arena-success"
                              : "arena-warning"
                          }
                        >
                          {match.feedback.correct
                            ? "Chính xác!"
                            : "Chưa chính xác."}{" "}
                          Đáp án: {match.feedback.answer}
                        </p>
                      ) : match.submitted ? (
                        <p>Đã nhận câu trả lời. Đang chờ đối thủ…</p>
                      ) : seconds === 0 ? (
                        <p>Hết giờ. Đang chuyển vòng…</p>
                      ) : (
                        <p>
                          Đúng: 100 điểm + tối đa 50 điểm theo tốc độ trả lời.
                        </p>
                      )}
                    </div>
                    <button
                      className="arena-leave"
                      onClick={() => setDialog("leave")}
                    >
                      Rời trận
                    </button>
                  </section>
                )}

                {match && terminal(match) && (
                  <section className="arena-session arena-result">
                    <Trophy size={56} />
                    <h2>
                      {match.status === "cancelled"
                        ? "Đã hủy phòng"
                        : !match.winnerId
                          ? "Trận đấu hòa"
                          : match.winnerId === user?.id
                            ? "Bạn đã chiến thắng!"
                            : "Hẹn bạn ở trận tiếp theo"}
                    </h2>
                    <p>
                      {match.status === "cancelled"
                        ? "XP cược đã được hoàn lại."
                        : `${names[match.mode]} · ${match.rounds} vòng`}
                    </p>
                    <strong className="arena-result-xp">
                      {(own?.xpDelta || 0) >= 0 ? "+" : ""}
                      {own?.xpDelta || 0} XP
                    </strong>
                    <div className="arena-result-scores">
                      {match.players.map((p) => (
                        <div key={p.id}>
                          <Avatar name={p.name} src={p.avatar} />
                          <b>{p.name}</b>
                          <strong>{p.score} điểm</strong>
                        </div>
                      ))}
                    </div>
                    <button
                      className="arena-primary"
                      onClick={() => {
                        setMatch(null);
                        void loadLobby().catch((e) => setError(e.message));
                      }}
                    >
                      Chơi tiếp
                    </button>
                    <button onClick={openHistory}>Xem lịch sử</button>
                  </section>
                )}
              </section>
              <aside className="arena-leaderboard">
                <header>
                  <span className="arena-title-icon">
                    <Crown />
                  </span>
                  <div>
                    <h2>Vua trò chơi</h2>
                    <p>Top cao thủ kiếm nhiều XP nhất</p>
                  </div>
                </header>
                {leaderError ? (
                  <div className="arena-empty" role="alert">
                    <p>{leaderError}</p>
                    <button onClick={() => void loadLeaders()}>Thử lại</button>
                  </div>
                ) : (
                  <Leaderboard leaders={leaders} />
                )}
                <button
                  className="arena-full-leaders"
                  onClick={() => setDialog("leaderboard")}
                >
                  Xem toàn bộ BXH <ArrowRight size={16} />
                </button>
              </aside>
            </div>
          )
        )}
        <AnimatePresence>
          {dialog && (
            <ArenaDialog
              key={dialog}
              title={
                dialog === "create"
                  ? "Tạo phòng thách đấu"
                  : dialog === "history"
                    ? "Lịch sử & BXH"
                    : dialog === "leave"
                      ? "Rời trận đấu?"
                      : "Bảng xếp hạng thách đấu"
              }
              close={close}
            >
              {dialog === "create" && (
                <>
                  <p>
                    {names[mode]} · Cược {format(wager)} XP
                  </p>
                  <p>
                    XP được tạm giữ khi tạo phòng. Mời bạn bè bằng mã phòng gồm
                    6 ký tự.
                  </p>
                  <button
                    disabled={busy}
                    className="arena-primary"
                    onClick={() => void run(() => arenaApi.create(mode, wager))}
                  >
                    Xác nhận tạo phòng
                  </button>
                </>
              )}
              {dialog === "leave" && (
                <>
                  <p>
                    Rời khi trận đã bắt đầu được tính là thua và mất{" "}
                    {match?.wager} XP.
                  </p>
                  <button
                    disabled={busy}
                    className="arena-danger"
                    onClick={() =>
                      match &&
                      void run(() => arenaApi.action(match.id, "leave"))
                    }
                  >
                    Rời trận
                  </button>
                  <button onClick={close}>Tiếp tục chơi</button>
                </>
              )}
              {dialog === "leaderboard" &&
                (leaderError ? (
                  <p role="alert">{leaderError}</p>
                ) : (
                  <Leaderboard leaders={leaders} full />
                ))}
              {dialog === "history" && (
                <>
                  <button onClick={() => setDialog("leaderboard")}>
                    Bảng xếp hạng <ArrowRight size={16} />
                  </button>
                  {historyLoading ? (
                    <BoneyardSkeleton name="arena-history" height={160} />
                  ) : historyError ? (
                    <p role="alert">{historyError}</p>
                  ) : !history.length ? (
                    <div className="arena-empty">
                      <History size={36} />
                      <h3>Chưa có trận đấu</h3>
                      <p>Lịch sử sẽ xuất hiện sau trận đầu tiên.</p>
                    </div>
                  ) : (
                    <ol className="arena-history">
                      {history.map((h) => (
                        <li key={h.id}>
                          <div>
                            <b>
                              {h.status === "cancelled"
                                ? "Đã hủy"
                                : h.winner_id === user?.id
                                  ? "Chiến thắng"
                                  : h.winner_id
                                    ? "Thất bại"
                                    : "Hòa"}{" "}
                              · {h.opponent || "Phòng chờ"}
                            </b>
                            <small>
                              {names[h.mode]} ·{" "}
                              {new Date(h.finished_at * 1000).toLocaleString(
                                "vi-VN",
                                { timeZone: "Asia/Ho_Chi_Minh" },
                              )}
                            </small>
                          </div>
                          <strong>
                            {h.xp_delta >= 0 ? "+" : ""}
                            {h.xp_delta} XP
                          </strong>
                        </li>
                      ))}
                    </ol>
                  )}
                </>
              )}
              {dialog === "history" &&
                !historyLoading &&
                !historyError &&
                transactions.length > 0 && (
                  <section className="arena-transactions">
                    <h3>Giao dịch XP</h3>
                    <ol className="arena-history">
                      {transactions.map((t) => (
                        <li key={t.id}>
                          <div>
                            <b>
                              {t.xp_amount < 0
                                ? "Tạm giữ XP cược"
                                : t.xp_amount === 0
                                  ? "Kết thúc trận"
                                  : "Hoàn cược / Nhận thưởng"}
                            </b>
                            <small>
                              {new Date(
                                t.created_at.endsWith("Z")
                                  ? t.created_at
                                  : `${t.created_at}Z`,
                              ).toLocaleString("vi-VN", {
                                timeZone: "Asia/Ho_Chi_Minh",
                              })}
                            </small>
                          </div>
                          <strong>
                            {t.xp_amount >= 0 ? "+" : ""}
                            {t.xp_amount} XP
                          </strong>
                        </li>
                      ))}
                    </ol>
                  </section>
                )}
              {error && (
                <p role="alert" className="arena-warning">
                  {error}
                </p>
              )}
            </ArenaDialog>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
