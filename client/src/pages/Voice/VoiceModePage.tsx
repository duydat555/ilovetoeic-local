import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, History, Mic, SlidersHorizontal } from 'lucide-react';
import { aiService, loadVoiceSettings, saveVoiceSettings, type AiStatus, type VoiceSettings } from '../../services/ai';
import { useVoiceSession } from '../../hooks/useVoiceSession';
import { VoiceOrb } from '../../components/voice/VoiceOrb';
import { VoiceControls } from '../../components/voice/VoiceControls';
import { VoiceSettingsSheet } from '../../components/voice/VoiceSettingsSheet';
import { VoiceHistoryDrawer } from '../../components/voice/VoiceHistoryDrawer';
import { VoiceSummary } from '../../components/voice/VoiceSummary';
import { MODE_OPTIONS, SCENARIOS, STATE_LABEL } from '../../components/voice/voiceOptions';
import { VOICE_THEME, focusRing } from '../../components/voice/voiceTheme';
import { BoneyardSkeleton } from '../../components/common/BoneyardSkeleton';

const iconButton = `grid size-11 place-items-center rounded-full text-[var(--vo-text)] hover:bg-[var(--vo-surface)] ${focusRing}`;

export const VoiceModePage: React.FC = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<VoiceSettings>(loadVoiceSettings);
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [statusFailed, setStatusFailed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const session = useVoiceSession(settings);
  const { state } = session;

  useEffect(() => saveVoiceSettings(settings), [settings]);

  // Check once whether the assistant is reachable, so the learner is told before they press start.
  useEffect(() => {
    if (state.phase !== 'idle') return undefined;
    let cancelled = false;
    setStatus(null);
    setStatusFailed(false);
    aiService.getStatus()
      .then((result) => { if (!cancelled) setStatus(result); })
      .catch(() => { if (!cancelled) setStatusFailed(true); });
    return () => { cancelled = true; };
  }, [state.phase]);

  // Lock page scroll behind the full-screen view.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, []);

  const begin = () => {
    const next = settings.mode === 'roleplay' && !settings.scenario
      ? { ...settings, scenario: SCENARIOS[0].prompt }
      : settings;
    if (next !== settings) setSettings(next);
    void session.start();
  };

  const live = state.phase === 'connecting' || state.phase === 'live' || state.phase === 'ending';
  const lastAssistant = useMemo(
    () => [...state.entries].reverse().find((entry) => entry.role === 'assistant'),
    [state.entries],
  );
  const lastUser = useMemo(
    () => [...state.entries].reverse().find((entry) => entry.role === 'user'),
    [state.entries],
  );
  const modeLabel = MODE_OPTIONS.find((option) => option.value === settings.mode)?.label ?? '';
  const ready = status?.available ?? false;

  const statusText = state.phase === 'ending'
    ? 'Đang tổng kết cuộc trò chuyện…'
    : STATE_LABEL[state.agent] ?? '';

  return (
    <div style={VOICE_THEME} className="fixed inset-0 z-[90] flex flex-col bg-[var(--vo-ground)] font-sans text-[var(--vo-text)]">
      <header className="flex items-center justify-between gap-3 px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5">
        {state.phase === 'idle' || state.phase === 'error' ? (
          <button type="button" onClick={() => navigate(-1)} aria-label="Quay lại" className={iconButton}>
            <ArrowLeft className="size-5" aria-hidden="true" />
          </button>
        ) : (
          <button type="button" onClick={() => setShowHistory(true)} aria-label="Xem lịch sử trò chuyện" className={iconButton}>
            <History className="size-5" aria-hidden="true" />
          </button>
        )}

        {live && state.serverLabel && (
          <p className="truncate rounded-full border border-[var(--vo-line)] px-3.5 py-1.5 text-[13px] font-medium text-[var(--vo-muted)]">
            Đang chạy trên {state.serverLabel}
          </p>
        )}

        <div className="flex items-center gap-1">
          {state.phase === 'idle' && (
            <button type="button" onClick={() => setShowHistory(true)} aria-label="Xem lịch sử trò chuyện" className={iconButton}>
              <History className="size-5" aria-hidden="true" />
            </button>
          )}
          <button type="button" onClick={() => setShowSettings(true)} aria-label="Mở cài đặt trò chuyện" className={iconButton}>
            <SlidersHorizontal className="size-5" aria-hidden="true" />
          </button>
        </div>
      </header>

      {state.phase === 'summary' && state.summary ? (
        <main className="flex-1 overflow-y-auto">
          <VoiceSummary
            summary={state.summary}
            onAgain={() => { session.leave(); begin(); }}
            onHistory={() => setShowHistory(true)}
            onExit={() => { session.leave(); navigate('/dashboard'); }}
          />
        </main>
      ) : (
        <>
          <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 overflow-y-auto px-6 text-center">
            <VoiceOrb state={state.agent} getLevel={session.getLevel} className="w-[min(74vw,340px)] sm:w-[380px]" />

            <div className="min-h-[7.5rem] w-full max-w-lg space-y-3">
              {state.phase === 'idle' && (
                <>
                  <h1 className="text-balance text-3xl font-bold leading-tight">Trò chuyện với AI</h1>
                  <p className="text-balance text-[15px] leading-relaxed text-[var(--vo-muted)]">
                    {status === null && !statusFailed
                      ? 'Đang kiểm tra trợ lý…'
                      : ready
                        ? 'Nói tiếng Việt hay tiếng Anh đều được. Trợ lý sẽ trả lời bằng giọng nói.'
                        : 'Trợ lý đang nghỉ ngơi. Bạn quay lại sau ít phút nhé.'}
                  </p>
                  <button type="button" onClick={() => setShowSettings(true)}
                    className={`min-h-11 rounded-full border border-[var(--vo-line)] px-4 text-sm font-semibold text-[var(--vo-text)] hover:bg-[var(--vo-surface)] ${focusRing}`}>
                    {modeLabel}
                  </button>
                </>
              )}

              {live && (
                <>
                  <p role="status" aria-live="polite" className="text-lg font-semibold">{statusText}</p>
                  {state.notice && <p className="text-sm text-[var(--vo-warm)]">{state.notice}</p>}
                  {settings.captions && lastAssistant && state.phase === 'live' && (
                    <p className="line-clamp-3 text-balance text-[15px] leading-relaxed text-[var(--vo-muted)]">{lastAssistant.text}</p>
                  )}
                  {settings.captions && lastUser && state.agent === 'thinking' && (
                    <p className="line-clamp-2 text-sm text-[var(--vo-muted)]">“{lastUser.text}”</p>
                  )}
                </>
              )}

              {state.phase === 'error' && (
                <>
                  <p role="alert" className="text-balance text-lg font-semibold">{state.error}</p>
                  <div className="flex flex-wrap justify-center gap-2.5 pt-1">
                    <button type="button" onClick={() => { session.leave(); begin(); }}
                      className={`min-h-12 rounded-full bg-[var(--vo-text)] px-6 text-[15px] font-bold text-[var(--vo-ground)] ${focusRing}`}>
                      Thử lại
                    </button>
                    <button type="button" onClick={() => { session.leave(); navigate(-1); }}
                      className={`min-h-12 rounded-full border border-[var(--vo-line)] px-6 text-[15px] font-semibold ${focusRing}`}>
                      Thoát
                    </button>
                  </div>
                </>
              )}
            </div>
          </main>

          <footer className="mx-auto w-full max-w-xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
            {state.phase === 'idle' ? (
              status === null && !statusFailed ? (
                <div aria-hidden="true"><BoneyardSkeleton name="voice-start-button" height={56} /></div>
              ) : (
                <button type="button" onClick={begin} disabled={!ready}
                  className={`flex min-h-14 w-full items-center justify-center gap-2.5 rounded-full bg-[var(--vo-text)] px-6 text-base font-bold text-[var(--vo-ground)] transition-colors hover:bg-white disabled:bg-[var(--vo-surface-2)] disabled:text-[var(--vo-muted)] ${focusRing}`}>
                  <Mic className="size-5" aria-hidden="true" />
                  Bắt đầu trò chuyện
                </button>
              )
            ) : live ? (
              <VoiceControls
                muted={state.muted}
                disabled={state.phase === 'ending'}
                onToggleMute={() => session.setMuted(!state.muted)}
                onEnd={() => { session.end(); }}
                onSend={session.sendText}
              />
            ) : null}
          </footer>
        </>
      )}

      <VoiceSettingsSheet
        open={showSettings}
        settings={settings}
        inConversation={live}
        onChange={setSettings}
        onClose={() => setShowSettings(false)}
      />
      <VoiceHistoryDrawer open={showHistory} entries={state.entries} onClose={() => setShowHistory(false)} />
    </div>
  );
};

export default VoiceModePage;
