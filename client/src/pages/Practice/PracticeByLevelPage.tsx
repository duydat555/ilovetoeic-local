import React, { useEffect, useMemo, useState } from 'react';
import { Award, ChevronDown, Database, Play, RefreshCcw, RotateCcw, Trash2 } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { BoneyardSkeleton } from '../../components/common/BoneyardSkeleton';
import { TopToast } from '../../components/common/TopToast';
import { DeleteWrongQuestionsModal } from '../../components/mock-test/DeleteTestHistoryModal';
import { LevelSlider } from '../../components/practice/LevelSlider';
import { SkillToggle } from '../../components/practice/SkillToggle';
import { useAuth } from '../../context/AuthContext';
import {
  LEVEL_LABELS,
  PRACTICE_LEVEL_PARTS,
  PracticeSkill,
} from '../../data/practiceByLevelData';
import { apiService } from '../../services/api';
import { backendService } from '../../services/backend';
import { StudyAttempt } from '../../types';
import { countLevelPracticeSessions, deleteLevelPracticeSessions } from '../../utils/practiceSessions';

type CountMap = Record<number, Record<number, number>>;
type DeleteHistoryScope = { part: number; level: number; label: string; attemptCount: number; displayCount: number };

const createFallbackCounts = (): CountMap => Object.fromEntries(
  PRACTICE_LEVEL_PARTS.map((part) => [part.part, part.fallbackQuestionCounts]),
);

const getAverageDescription = (level: number) => {
  if (level < 1.5) return 'Đang xây nền tảng';
  if (level < 2.5) return 'Cơ bản vững vàng';
  if (level < 3.5) return 'Trung bình khá';
  if (level < 4.5) return 'Khá nâng cao';
  return 'Nâng cao';
};

const getLevelAttempt = (attempt: StudyAttempt) => {
  if (attempt.metadata?.source !== 'level_practice') return null;
  const part = Number(attempt.part ?? attempt.metadata?.selected_part);
  const level = Number(attempt.metadata?.selected_level);
  if (!Number.isInteger(part) || !Number.isInteger(level)) return null;
  return { part, level, passed: attempt.accuracyRate >= 70 };
};

export const PracticeByLevelPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [skill, setSkill] = useState<PracticeSkill>('listening');
  const [selectedLevels, setSelectedLevels] = useState<Record<number, number>>(
    () => Object.fromEntries(PRACTICE_LEVEL_PARTS.map((part) => [part.part, 3])),
  );
  const [counts, setCounts] = useState<CountMap>(createFallbackCounts);
  const [attempts, setAttempts] = useState<StudyAttempt[]>([]);
  const [wrongCounts, setWrongCounts] = useState<Record<string, number>>({});
  const [deleteScope, setDeleteScope] = useState<DeleteHistoryScope | null>(null);
  const [deletingWrong, setDeletingWrong] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    let active = true;
    const loadPageData = async () => {
      setIsLoading(true);
      const [countResult, historyResult, wrongResult] = await Promise.allSettled([
        apiService.getPracticeLevelSummary(),
        user ? backendService.getStudyHistory(user.id) : Promise.resolve([]),
        user ? backendService.getWrongQuestions('level') : Promise.resolve([]),
      ]);
      if (!active) return;

      if (countResult.status === 'fulfilled' && countResult.value.length > 0) {
        const liveCounts = createFallbackCounts();
        PRACTICE_LEVEL_PARTS.forEach((part) => {
          liveCounts[part.part] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        });
        countResult.value.forEach((item) => {
          if (liveCounts[item.part]) liveCounts[item.part][item.level] = item.questionCount;
        });
        setCounts(liveCounts);
        setUsingFallback(false);
      } else {
        setCounts(createFallbackCounts());
        setUsingFallback(true);
      }

      if (historyResult.status === 'fulfilled' && Array.isArray(historyResult.value)) {
        setAttempts(historyResult.value);
      }
      if (wrongResult.status === 'fulfilled') {
        const next: Record<string, number> = {};
        wrongResult.value.forEach((item) => {
          if (item.level !== null) {
            const key = `${item.part}:${item.level}`;
            next[key] = (next[key] || 0) + 1;
          }
        });
        setWrongCounts(next);
      } else {
        setWrongCounts({});
      }
      setIsLoading(false);
    };
    void loadPageData();
    return () => { active = false; };
  }, [user?.id]);

  useEffect(() => {
    if (!toastMessage) return undefined;
    const timeout = window.setTimeout(() => setToastMessage(''), 3200);
    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  useEffect(() => {
    if (!user) return undefined;
    let active = true;
    const loadWrongCounts = () => {
      void backendService.getWrongQuestions('level').then((items) => {
        if (!active) return;
        const next: Record<string, number> = {};
        items.forEach((item) => {
          if (item.level !== null) {
            const key = `${item.part}:${item.level}`;
            next[key] = (next[key] || 0) + 1;
          }
        });
        setWrongCounts(next);
      }).catch(() => {
        if (!active) return;
        setWrongCounts({});
      });
    };
    window.addEventListener('wrong-questions-updated', loadWrongCounts);
    return () => {
      active = false;
      window.removeEventListener('wrong-questions-updated', loadWrongCounts);
    };
  }, [user?.id]);

  const completedByPart = useMemo(() => {
    const result: Record<number, number[]> = {};
    attempts.forEach((attempt) => {
      const parsed = getLevelAttempt(attempt);
      if (!parsed?.passed) return;
      result[parsed.part] = Array.from(new Set([...(result[parsed.part] || []), parsed.level]));
    });
    return result;
  }, [attempts]);

  const currentPartLevels = useMemo(() => Object.entries(completedByPart)
    .filter(([, levels]) => levels.length > 0)
    .map(([part, levels]) => ({ part: Number(part), level: Math.max(...levels) }))
    .sort((a, b) => a.part - b.part), [completedByPart]);

  const averageLevel = useMemo(() => {
    if (currentPartLevels.length === 0) return null;
    return currentPartLevels.reduce((total, item) => total + item.level, 0) / currentPartLevels.length;
  }, [currentPartLevels]);

  const visibleParts = PRACTICE_LEVEL_PARTS.filter((part) => part.skill === skill);

  if (isLoading) {
    return (
      <div
        className="mx-auto w-full max-w-7xl space-y-4 pb-10 text-content"
        role="status"
        aria-label="Đang tải dữ liệu luyện tập theo Level"
        aria-busy="true"
      >
        <header>
          <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">Luyện tập theo Level</h1>
          <p className="mt-1 text-xs text-content-muted sm:text-sm">Chọn độ khó phù hợp với trình độ hiện tại của bạn.</p>
        </header>

        <BoneyardSkeleton
          name="practice-level-summary"
          height={108}
          className="rounded-2xl"
        />

        <div className="flex justify-center sm:justify-start">
          <BoneyardSkeleton
            name="practice-level-skill-toggle"
            variant="button"
            width={224}
            height={40}
            className="rounded-full"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2" aria-hidden="true">
          {Array.from({ length: 4 }, (_, index) => (
            <BoneyardSkeleton
              key={index}
              name={`practice-level-part-${index + 1}`}
              variant="card"
              height={238}
              className="rounded-2xl"
            />
          ))}
        </div>
      </div>
    );
  }

  const updatePartLevel = (part: number, level: number) => {
    setSelectedLevels((current) => ({ ...current, [part]: level }));
  };

  const closeDeleteModal = () => {
    if (deletingWrong) return;
    setDeleteScope(null);
    setDeleteError('');
  };

  const handleDeleteHistory = async () => {
    if (!deleteScope || deletingWrong) return;
    setDeletingWrong(true);
    setDeleteError('');
    try {
      const historyResult = await backendService.deleteLevelStudyHistory(
        deleteScope.part,
        deleteScope.level,
      );
      const wrongResult = await backendService.deleteWrongQuestions('level', {
        part: deleteScope.part,
        level: deleteScope.level,
      });
      await backendService.deletePracticeSessionsForLevel(deleteScope.part, deleteScope.level);
      deleteLevelPracticeSessions(deleteScope.part, deleteScope.level);
      const key = `${deleteScope.part}:${deleteScope.level}`;
      setAttempts((current) => current.filter((attempt) => {
        const parsed = getLevelAttempt(attempt);
        return !parsed || parsed.part !== deleteScope.part || parsed.level !== deleteScope.level;
      }));
      setWrongCounts((current) => ({ ...current, [key]: 0 }));
      setToastMessage(`Đã xoá ${historyResult.deletedCount} lượt làm và ${wrongResult.deletedCount} câu sai của ${deleteScope.label}.`);
      setDeleteScope(null);
    } catch (requestError) {
      setDeleteError(requestError instanceof Error ? requestError.message : 'Không thể xoá lịch sử làm bài.');
    } finally {
      setDeletingWrong(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 pb-10 text-content">
      <header>
        <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">Luyện tập theo Level</h1>
        <p className="mt-1 text-xs text-content-muted sm:text-sm">Chọn độ khó phù hợp với trình độ hiện tại của bạn.</p>
      </header>

      <section className="surface overflow-hidden rounded-2xl p-4 sm:p-5" aria-labelledby="current-level-title">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="icon-box size-9 rounded-xl"><Award className="size-4" /></div>
            <div>
              <h2 id="current-level-title" className="text-xs font-bold text-content-muted">Level trung bình hiện tại</h2>
              <div className="mt-0.5 flex items-baseline gap-2">
                <strong className="text-3xl font-black tracking-tight text-content">
                  {averageLevel === null ? '--' : averageLevel.toFixed(1)}
                </strong>
                <span className="text-xs font-bold text-content-muted">
                  {averageLevel === null ? 'Chưa có dữ liệu' : getAverageDescription(averageLevel)}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] font-semibold text-content-muted">
                {currentPartLevels.length}/7 Part đã được xác định
              </p>
            </div>
          </div>
          <p className="max-w-md text-xs leading-relaxed text-content-muted">
            {averageLevel === null
              ? 'Hoàn thành một bài với ít nhất 70% câu đúng để bắt đầu ghi nhận Level.'
              : 'Kết quả được tính từ Level cao nhất bạn đã hoàn thành ở từng Part.'}
          </p>
        </div>

        <details className="group mt-4 border-t border-line pt-3">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-extrabold text-content marker:hidden">
            <span>Cách tính Level trung bình</span>
            <ChevronDown className="size-3.5 shrink-0 text-content-muted transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="mt-3 rounded-xl bg-surface-elevated px-3.5 py-3 text-xs leading-relaxed text-content-muted">
            <ol className="space-y-1.5">
              <li><strong className="text-content">1.</strong> Một Level được hoàn thành khi bạn trả lời đúng ít nhất 70% số câu.</li>
              <li><strong className="text-content">2.</strong> Với mỗi Part, hệ thống lấy Level cao nhất bạn đã hoàn thành.</li>
              <li><strong className="text-content">3.</strong> Cộng Level của các Part đủ điều kiện, chia cho số Part đó và làm tròn một chữ số thập phân.</li>
            </ol>
            {currentPartLevels.length > 0 ? (
              <div className="mt-3 border-t border-line pt-2.5">
                <p className="font-bold text-content">
                  Công thức hiện tại: ({currentPartLevels.map((item) => item.level).join(' + ')}) ÷ {currentPartLevels.length} = {averageLevel?.toFixed(1)}
                </p>
                <p className="mt-1">
                  {currentPartLevels.map((item) => `Part ${item.part}: Level ${item.level}`).join(', ')}
                </p>
              </div>
            ) : (
              <p className="mt-3 border-t border-line pt-2.5 font-semibold text-content">
                Chưa có Part nào đạt ngưỡng 70%. Kết quả đầu tiên sẽ xuất hiện sau khi bạn hoàn thành một Level.
              </p>
            )}
          </div>
        </details>
      </section>

      <div className="flex justify-center sm:justify-start">
        <SkillToggle value={skill} onChange={setSkill} />
      </div>

      {usingFallback && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200" role="status">
          <Database className="mt-0.5 size-3.5 shrink-0" />
          <span>Chưa kết nối được dữ liệu số lượng thực. Trang đang hiển thị số liệu mẫu và sẽ kiểm tra lại khi tải lại.</span>
        </div>
      )}

      <section
        id={`${skill}-parts`}
        role="tabpanel"
        aria-labelledby={`practice-skill-${skill}`}
        className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2"
      >
        {visibleParts.map((part) => {
          const selectedLevel = selectedLevels[part.part];
          const questionCount = counts[part.part]?.[selectedLevel] ?? 0;
          const wrongCount = wrongCounts[`${part.part}:${selectedLevel}`] || 0;
          const attemptCount = attempts.filter((attempt) => {
            const parsed = getLevelAttempt(attempt);
            return parsed?.part === part.part && parsed.level === selectedLevel;
          }).length;
          const savedSessionCount = countLevelPracticeSessions(part.part, selectedLevel);
          const displayCount = Math.max(attemptCount, savedSessionCount);
          const hasHistory = displayCount > 0 || wrongCount > 0;
          return (
            <article key={part.part} className="surface flex flex-col rounded-2xl p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base font-extrabold tracking-tight">Part {part.part}: {part.title}</h2>
                  <p className="mt-1 text-xs leading-relaxed text-content-muted">{part.description}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1 text-content-muted">
                  <button
                    type="button"
                    disabled={wrongCount === 0}
                    onClick={() => navigate(`/practice/runner/${part.part}?level=${selectedLevel}&wrongSource=level`)}
                    aria-label={`Làm lại ${wrongCount} câu sai Part ${part.part} Level ${selectedLevel}`}
                    title={wrongCount === 0 ? 'Không có câu sai để làm lại' : `Làm lại ${wrongCount} câu sai`}
                    className="relative grid size-8 place-items-center rounded-lg transition-colors hover:bg-negative/10 hover:text-negative disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <RotateCcw className="size-3.5" />
                    <span className="absolute -right-1 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-negative px-1 text-[9px] font-black leading-none text-white">
                      {wrongCount}
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={!hasHistory}
                    onClick={() => {
                      setDeleteError('');
                      setDeleteScope({
                        part: part.part,
                        level: selectedLevel,
                        label: `Part ${part.part} - Level ${selectedLevel}`,
                        attemptCount,
                        displayCount,
                      });
                    }}
                    aria-label={`Xoá lịch sử làm bài Part ${part.part} Level ${selectedLevel}`}
                    title={!hasHistory ? 'Chưa có lịch sử làm bài để xoá' : 'Xoá lịch sử làm bài'}
                    className="grid size-8 place-items-center rounded-lg transition-colors hover:bg-negative/10 hover:text-negative disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                  <span className="ml-1 grid size-8 place-items-center rounded-lg bg-accent/15 text-[11px] font-black text-accent-strong ring-1 ring-accent/25 dark:text-brand-300">
                    {part.part}
                  </span>
                </div>
              </div>

              <LevelSlider
                value={selectedLevel}
                onChange={(level) => updatePartLevel(part.part, level)}
                completedLevels={completedByPart[part.part] || []}
                className="mt-4"
                label={`Chọn độ khó cho Part ${part.part}`}
              />

              <div className="mt-4 flex flex-col gap-3 border-t border-line pt-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div aria-live="polite">
                  <p className="text-xs font-extrabold">Level {selectedLevel}: {LEVEL_LABELS[selectedLevel - 1]}</p>
                  <p className="mt-0.5 text-xs font-semibold text-content-muted">
                    {isLoading ? 'Đang kiểm tra số câu...' : `${questionCount} câu khả dụng`}
                  </p>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto">
                  <button
                    type="button"
                    disabled={isLoading || usingFallback || questionCount === 0}
                    onClick={() => navigate(`/practice/runner/${part.part}?level=${selectedLevel}`)}
                    className="btn-primary w-full whitespace-nowrap text-xs sm:w-auto"
                  >
                    {usingFallback || questionCount === 0 ? <RefreshCcw className="size-3.5" /> : <Play className="size-3.5 fill-current" />}
                    {usingFallback ? 'Thử lại sau' : questionCount === 0 ? 'Chưa có câu hỏi' : 'Bắt đầu luyện tập'}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </section>
      <AnimatePresence initial={false}>
        {deleteScope && (
          <DeleteWrongQuestionsModal
            key={`delete-level-${deleteScope.part}-${deleteScope.level}`}
            scopeLabel={deleteScope.label}
            wrongCount={deleteScope.displayCount}
            deleting={deletingWrong}
            error={deleteError}
            title="Xoá lịch sử làm bài?"
            description={<>Toàn bộ <strong className="text-content">{deleteScope.displayCount} lượt hoặc phiên làm bài đã lưu</strong>, gồm kết quả câu đúng và câu sai của <strong className="text-content">{deleteScope.label}</strong>, sẽ bị xoá khỏi database và trình duyệt. Thao tác này không thể hoàn tác.</>}
            confirmLabel="Xoá toàn bộ lịch sử"
            closeLabel="Đóng xác nhận xoá lịch sử làm bài"
            onConfirm={() => void handleDeleteHistory()}
            onClose={closeDeleteModal}
          />
        )}
        {toastMessage && <TopToast key={toastMessage} message={toastMessage} />}
      </AnimatePresence>
    </div>
  );
};

export default PracticeByLevelPage;
