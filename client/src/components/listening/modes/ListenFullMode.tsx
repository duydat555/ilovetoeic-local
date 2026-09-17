import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Headphones,
  Languages,
  ListMusic,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Repeat,
  RotateCcw,
  Volume2,
} from 'lucide-react';
import type { ListeningSentence } from '../../../types';
import { useLanguage } from '../../../context/LanguageContext';

export interface ListenFullModeProps {
  sentences: ListeningSentence[];
  currentSentenceIndex: number;
  onSelectSentence: (idx: number) => void;
  activeWordIndex?: number;
  isPlaying?: boolean;
  onJumpToWord?: (startSeconds: number) => void;
  onNextSentence?: () => void;
  onPreviousSentence?: () => void;
  onTogglePlay?: () => void;
  autoPlayNext?: boolean;
  onToggleAutoPlayNext?: (val: boolean) => void;
}

type SubtitleMode = 'bilingual' | 'english_only' | 'blind';
type ViewMode = 'script' | 'focus';

export const ListenFullMode: React.FC<ListenFullModeProps> = ({
  sentences,
  currentSentenceIndex,
  onSelectSentence,
  activeWordIndex = -1,
  isPlaying = false,
  onJumpToWord,
  onNextSentence,
  onPreviousSentence,
  onTogglePlay,
  autoPlayNext = true,
  onToggleAutoPlayNext,
}) => {
  const { language } = useLanguage();
  // View preferences
  const [viewMode, setViewMode] = useState<ViewMode>('script');
  const [subtitleMode, setSubtitleMode] = useState<SubtitleMode>('bilingual');
  const [showPhonetics, setShowPhonetics] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [isLoopingCurrent, setIsLoopingCurrent] = useState(false);

  const activeSentenceRef = useRef<HTMLDivElement | null>(null);
  const currentSentence = sentences[currentSentenceIndex];

  // Auto-scroll to active sentence in script view
  useEffect(() => {
    if (autoScroll && viewMode === 'script' && activeSentenceRef.current) {
      activeSentenceRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [currentSentenceIndex, autoScroll, viewMode]);

  // Render Karaoke words for a sentence
  const renderKaraokeWords = (
    sentence: ListeningSentence,
    isCurrentSentence: boolean
  ) => {
    // Blind listening mode: blurred text to train ear first
    if (subtitleMode === 'blind') {
      return (
        <div className="group/blind relative cursor-pointer py-1 select-none">
          <p className="text-base font-bold leading-relaxed text-content filter blur-sm transition-all duration-200 group-hover/blind:blur-none sm:text-lg">
            {sentence.text}
          </p>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity group-hover/blind:opacity-0">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-elevated/90 px-3 py-1 text-xs font-bold text-content-muted shadow-sm backdrop-blur-xs">
              <EyeOff className="size-3 text-accent-strong" />
              <span>
                {language === 'en'
                  ? 'Subtitles hidden for blind listening (Hover to reveal)'
                  : 'Đang ẩn chữ để luyện nghe chay (Rê chuột để xem)'}
              </span>
            </span>
          </div>
        </div>
      );
    }

    // Active sentence with word-level timestamps: real-time karaoke highlight & sweep
    if (isCurrentSentence && sentence.words && sentence.words.length > 0) {
      return (
        <div className="flex flex-wrap items-baseline gap-1 py-1 text-base font-bold leading-relaxed select-none sm:text-lg">
          {sentence.words.map((w, wIdx) => {
            const isWActive =
              activeWordIndex !== undefined &&
              activeWordIndex !== -1 &&
              wIdx === activeWordIndex;
            const isWPassed =
              activeWordIndex !== undefined &&
              activeWordIndex !== -1 &&
              wIdx < activeWordIndex;
            const wordDuration = Math.max(0.08, w.end - w.start);

            return (
              <button
                key={`${w.word}-${wIdx}`}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onJumpToWord?.(w.start);
                }}
                title={`Nhấp để tua đến từ "${w.word}" (${w.start.toFixed(2)}s)`}
                className={`relative inline-block overflow-hidden rounded-lg px-2 py-0.5 mx-0.5 my-0.5 text-left transition-all duration-150 cursor-pointer ${
                  isWActive
                    ? 'bg-accent/20 border border-accent/40 text-accent-strong font-black ring-1 ring-accent/30 shadow-xs scale-105'
                    : 'text-content font-bold border border-transparent hover:bg-surface-elevated'
                }`}
              >
                {/* Active sweep runner with accent design tokens */}
                {isWActive && (
                  <span
                    className="pointer-events-none absolute inset-y-0 left-0 rounded-md bg-accent/30 dark:bg-accent/40"
                    style={{
                      animation: `karaoke-sweep ${wordDuration}s linear forwards`,
                      animationPlayState: isPlaying ? 'running' : 'paused',
                    }}
                  />
                )}
                <span className="relative z-10">{w.word}</span>
              </button>
            );
          })}
        </div>
      );
    }

    // Standard transcript line
    return (
      <p
        className={`text-base font-bold leading-relaxed transition-colors sm:text-lg ${
          isCurrentSentence ? 'text-accent-strong' : 'text-content'
        }`}
      >
        {sentence.text}
      </p>
    );
  };

  return (
    <div className="space-y-4">
      {/* 1. Immersion Toolbar Header */}
      <div className="rounded-3xl border border-line bg-surface p-4 shadow-sm sm:p-5 space-y-3.5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-line/60 pb-3.5">
          {/* Title & Badge */}
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-xl bg-accent/15 text-accent-strong">
              <Headphones className="size-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-content">
                  {language === 'en' ? 'Immersive Karaoke Listening' : 'Luyện nghe ngấm Karaoke'}
                </h2>
                <span className="rounded-full bg-surface-elevated border border-line px-2 py-0.5 text-[10px] font-bold text-content-muted">
                  {language === 'en' ? 'Practice only' : 'Không chấm điểm'}
                </span>
              </div>
              <p className="text-xs text-content-muted">
                {language === 'en'
                  ? 'Seamless listening with synchronized text to develop audio reflexes'
                  : 'Nghe liền mạch kèm lời chạy theo giọng đọc để ngấm phản xạ âm thanh'}
              </p>
            </div>
          </div>

          {/* View Mode Switcher: Kịch bản toàn bài (Script) vs Tập trung (Focus) */}
          <div className="inline-flex rounded-xl border border-line bg-surface-elevated/60 p-1 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('script')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                viewMode === 'script'
                  ? 'bg-surface text-content shadow-xs font-extrabold'
                  : 'text-content-muted hover:text-content'
              }`}
            >
              <ListMusic className="size-3.5" />
              <span>{language === 'en' ? 'Full script' : 'Toàn bài'}</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('focus')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                viewMode === 'focus'
                  ? 'bg-surface text-content shadow-xs font-extrabold'
                  : 'text-content-muted hover:text-content'
              }`}
            >
              <Maximize2 className="size-3.5" />
              <span>{language === 'en' ? 'Focus' : 'Tập trung'}</span>
            </button>
          </div>
        </div>

        {/* Immersion Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Left: Subtitle Display Options */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-content-muted mr-1 hidden sm:inline">
              {language === 'en' ? 'Display:' : 'Hiển thị:'}
            </span>

            {/* Song ngữ */}
            <button
              type="button"
              onClick={() => setSubtitleMode('bilingual')}
              className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 font-bold transition ${
                subtitleMode === 'bilingual'
                  ? 'border-accent bg-accent/15 text-accent-strong'
                  : 'border-line text-content-muted hover:bg-surface-hover hover:text-content'
              }`}
            >
              <Languages className="size-3" />
              <span>{language === 'en' ? 'Bilingual' : 'Song ngữ'}</span>
            </button>

            {/* Chỉ tiếng Anh */}
            <button
              type="button"
              onClick={() => setSubtitleMode('english_only')}
              className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 font-bold transition ${
                subtitleMode === 'english_only'
                  ? 'border-accent bg-accent/15 text-accent-strong'
                  : 'border-line text-content-muted hover:bg-surface-hover hover:text-content'
              }`}
            >
              <BookOpen className="size-3" />
              <span>{language === 'en' ? 'English only' : 'Chỉ tiếng Anh'}</span>
            </button>

            {/* Nghe chay (Ẩn chữ) */}
            <button
              type="button"
              onClick={() => setSubtitleMode('blind')}
              title={language === 'en' ? 'Blur subtitles for pure listening practice' : 'Làm mờ chữ để luyện nghe thuần túy không đọc lướt'}
              className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 font-bold transition ${
                subtitleMode === 'blind'
                  ? 'border-accent bg-accent/15 text-accent-strong'
                  : 'border-line text-content-muted hover:bg-surface-hover hover:text-content'
              }`}
            >
              <EyeOff className="size-3" />
              <span>{language === 'en' ? 'Blind listening' : 'Nghe chay'}</span>
            </button>
          </div>

          {/* Right: Phonetics & Auto-Scroll Toggles */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Toggle IPA Phonetics */}
            <button
              type="button"
              onClick={() => setShowPhonetics((prev) => !prev)}
              className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 font-bold transition ${
                showPhonetics
                  ? 'border-line bg-surface-elevated text-content'
                  : 'border-line text-content-muted/60 hover:text-content'
              }`}
            >
              <span className="font-mono text-[11px]">/IPA/</span>
              <span>{showPhonetics ? (language === 'en' ? 'On' : 'Bật') : (language === 'en' ? 'Off' : 'Tắt')}</span>
            </button>

            {/* Toggle Auto-Scroll (only applicable in script view) */}
            {viewMode === 'script' && (
              <button
                type="button"
                onClick={() => setAutoScroll((prev) => !prev)}
                className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 font-bold transition ${
                  autoScroll
                    ? 'border-line bg-surface-elevated text-content'
                    : 'border-line text-content-muted/60 hover:text-content'
                }`}
              >
                <span>
                  {language === 'en'
                    ? `Auto-scroll: ${autoScroll ? 'On' : 'Off'}`
                    : `Tự cuộn: ${autoScroll ? 'Bật' : 'Tắt'}`}
                </span>
              </button>
            )}

            {/* Toggle Continuous Play */}
            {onToggleAutoPlayNext && (
              <button
                type="button"
                onClick={() => onToggleAutoPlayNext(!autoPlayNext)}
                title={language === 'en' ? 'Auto play next sentence when current sentence finishes' : 'Tự động phát câu tiếp theo khi câu hiện tại kết thúc'}
                className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 font-bold transition ${
                  autoPlayNext
                    ? 'border-accent/40 bg-accent/10 text-accent-strong'
                    : 'border-line text-content-muted/60 hover:text-content'
                }`}
              >
                <Repeat className="size-3" />
                <span>
                  {language === 'en'
                    ? `Continuous: ${autoPlayNext ? 'On' : 'Off'}`
                    : `Chạy liên tục: ${autoPlayNext ? 'Bật' : 'Tắt'}`}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. FOCUS KARAOKE VIEW (Hero card for active sentence immersion) */}
      {viewMode === 'focus' && currentSentence && (
        <section className="space-y-6 rounded-3xl border border-line bg-surface p-6 shadow-sm sm:p-8">
          {/* Header Meta */}
          <div className="flex items-center justify-between border-b border-line/60 pb-3">
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-lg bg-accent text-xs font-black text-accent-contrast">
                {currentSentenceIndex + 1}
              </span>
              <span className="text-xs font-extrabold uppercase tracking-wider text-content-muted">
                {language === 'en'
                  ? `Sentence ${currentSentenceIndex + 1} / ${sentences.length}`
                  : `Câu ${currentSentenceIndex + 1} / ${sentences.length}`}
              </span>
            </div>

            {/* Loop current sentence toggle */}
            <button
              type="button"
              onClick={() => setIsLoopingCurrent((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                isLoopingCurrent
                  ? 'border-accent bg-accent/15 text-accent-strong'
                  : 'border-line text-content-muted hover:bg-surface-hover hover:text-content'
              }`}
            >
              <Repeat className="size-3.5" />
              <span>{language === 'en' ? 'Loop this sentence' : 'Lặp lại câu này'}</span>
            </button>
          </div>

          {/* Large Karaoke Display */}
          <div className="space-y-3 py-2">
            {renderKaraokeWords(currentSentence, true)}

            {showPhonetics && currentSentence.phoneticUs && (
              <p className="font-mono text-sm font-semibold text-accent-strong/90">
                /{currentSentence.phoneticUs}/
              </p>
            )}

            {subtitleMode === 'bilingual' && currentSentence.translationVi && (
              <p className="border-t border-line/60 pt-3 text-sm font-medium leading-relaxed text-content-muted sm:text-base">
                {currentSentence.translationVi}
              </p>
            )}
          </div>

          {/* Quick Focus Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/60 pt-4">
            <div className="flex items-center gap-2">
              {/* Previous */}
              <button
                type="button"
                onClick={onPreviousSentence}
                disabled={currentSentenceIndex === 0}
                className="inline-flex h-9 items-center gap-1 rounded-xl border border-line px-3 text-xs font-bold text-content-muted transition hover:bg-surface-hover hover:text-content disabled:opacity-40"
              >
                <ChevronLeft className="size-4" />
                <span className="hidden sm:inline">{language === 'en' ? 'Previous' : 'Câu trước'}</span>
              </button>

              {/* Play / Pause */}
              <button
                type="button"
                onClick={onTogglePlay}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-accent px-4 text-xs font-black text-accent-contrast shadow-sm transition hover:brightness-105 active:scale-95"
              >
                {isPlaying ? (
                  <>
                    <Pause className="size-4 fill-current" />
                    <span>{language === 'en' ? 'Pause' : 'Tạm dừng'}</span>
                  </>
                ) : (
                  <>
                    <Play className="size-4 fill-current translate-x-0.5" />
                    <span>{language === 'en' ? 'Play this' : 'Phát câu này'}</span>
                  </>
                )}
              </button>

              {/* Next */}
              <button
                type="button"
                onClick={onNextSentence}
                disabled={currentSentenceIndex === sentences.length - 1}
                className="inline-flex h-9 items-center gap-1 rounded-xl border border-line px-3 text-xs font-bold text-content-muted transition hover:bg-surface-hover hover:text-content disabled:opacity-40"
              >
                <span className="hidden sm:inline">{language === 'en' ? 'Next' : 'Câu sau'}</span>
                <ChevronRight className="size-4" />
              </button>
            </div>

            {/* Jump to script view */}
            <button
              type="button"
              onClick={() => setViewMode('script')}
              className="text-xs font-bold text-accent-strong hover:underline"
            >
              {language === 'en' ? 'View full audio script →' : 'Xem toàn bộ kịch bản bài nghe →'}
            </button>
          </div>
        </section>
      )}

      {/* 3. FULL SCRIPT KARAOKE VIEW (Scrollable timeline of all sentences) */}
      {viewMode === 'script' && (
        <div className="space-y-3">
          {sentences.map((sent, idx) => {
            const isCurrent = idx === currentSentenceIndex;

            return (
              <div
                key={sent.id}
                ref={isCurrent ? activeSentenceRef : null}
                onClick={() => onSelectSentence(idx)}
                className={`group cursor-pointer rounded-3xl border p-4.5 transition-all duration-200 sm:p-6 ${
                  isCurrent
                    ? 'border-accent bg-accent/5 ring-1 ring-accent/30 shadow-sm'
                    : 'border-line bg-surface hover:border-accent/40 hover:bg-surface-hover/50'
                }`}
              >
                <div className="flex items-start justify-between gap-3 sm:gap-4">
                  <div className="flex items-start gap-3 sm:gap-4">
                    {/* Sentence Index Badge with live audio wave pulse */}
                    <span
                      className={`grid size-8 shrink-0 place-items-center rounded-xl text-xs font-black transition-all ${
                        isCurrent
                          ? 'bg-accent text-accent-contrast shadow-xs'
                          : 'bg-surface-elevated text-content-muted group-hover:bg-accent/15 group-hover:text-accent-strong'
                      }`}
                    >
                      {idx + 1}
                    </span>

                    {/* Sentence Content */}
                    <div className="space-y-1.5">
                      {/* English Text & Karaoke Words */}
                      {renderKaraokeWords(sent, isCurrent)}

                      {/* US Phonetics (if enabled) */}
                      {showPhonetics && sent.phoneticUs && (
                        <p className="font-mono text-xs font-medium text-accent-strong/80">
                          /{sent.phoneticUs}/
                        </p>
                      )}

                      {/* Vietnamese Translation (if bilingual enabled) */}
                      {subtitleMode === 'bilingual' && sent.translationVi && (
                        <p className="text-xs font-medium leading-relaxed text-content-muted sm:text-sm">
                          {sent.translationVi}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Play Action Button */}
                  <button
                    type="button"
                    title={isCurrent && isPlaying
                      ? (language === 'en' ? 'Pause' : 'Tạm dừng')
                      : (language === 'en' ? 'Play from this sentence' : 'Phát từ câu này')}
                    className={`grid size-9 shrink-0 place-items-center rounded-xl border transition-all active:scale-95 ${
                      isCurrent
                        ? 'border-accent bg-accent text-accent-contrast shadow-sm'
                        : 'border-line text-content-muted opacity-60 group-hover:opacity-100 hover:bg-surface-elevated hover:text-content'
                    }`}
                  >
                    {isCurrent && isPlaying ? (
                      <Volume2 className="size-4 animate-pulse" />
                    ) : (
                      <Play className="size-4 fill-current translate-x-0.5" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ListenFullMode;
