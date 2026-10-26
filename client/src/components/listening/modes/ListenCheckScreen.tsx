import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Gauge,
  Languages,
  Minus,
  Pause,
  PenTool,
  Play,
  Plus,
  Repeat,
  RotateCcw,
  SkipBack,
  SkipForward,
  Type,
  Volume2,
} from 'lucide-react';
import { soundFX } from '../../../utils/soundEffects';
import { useLanguage } from '../../../context/LanguageContext';

/* ==========================================================================
   1. TOP NAVIGATION TABS COMPONENT
   ========================================================================== */

export interface TabItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const DEFAULT_TABS: TabItem[] = [
  { id: 'mean_select', label: 'Chọn nghĩa', icon: Languages },
  { id: 'word_select', label: 'Chọn từ', icon: CheckCircle2 },
  { id: 'dictation', label: 'T Điền Từ', icon: Type },
  { id: 'listen_check', label: 'Nghe Check', icon: Eye },
  { id: 'transcribe', label: 'Nghe Chép', icon: PenTool },
  { id: 'listen_full', label: 'Nghe Full', icon: Volume2 },
];

export interface TopTabsProps {
  tabs?: TabItem[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
}

export const TopTabs: React.FC<TopTabsProps> = ({
  tabs = DEFAULT_TABS,
  activeTab = 'listen_check',
  onTabChange,
}) => {
  return (
    <nav
      aria-label="Chế độ luyện tập"
      className="inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl border border-line bg-surface p-1.5 shadow-sm scrollbar-none sm:rounded-full"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange?.(tab.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition active:scale-95 sm:rounded-full ${
              isActive
                ? 'bg-accent text-accent-contrast shadow-xs font-extrabold'
                : 'text-content-muted hover:bg-surface-hover hover:text-content'
            }`}
          >
            <Icon className="size-3.5 shrink-0" />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

/* ==========================================================================
   2. HEADER SECTION COMPONENT
   ========================================================================== */

export interface HeaderSectionProps {
  partMeta?: string;
  sentenceTitle?: string;
}

export const HeaderSection: React.FC<HeaderSectionProps> = ({
  partMeta = 'PART 1 · 1/24',
  sentenceTitle = 'Câu 1',
}) => {
  return (
    <header className="space-y-0.5">
      <div className="text-xs font-semibold uppercase tracking-wider text-content-muted">
        {partMeta}
      </div>
      <h1 className="text-2xl font-black tracking-tight text-content sm:text-3xl">
        {sentenceTitle}
      </h1>
    </header>
  );
};

/* ==========================================================================
   3. AUDIO PLAYER (AUDIO CONTROL CARD) COMPONENT
   ========================================================================== */

export interface AudioControlCardProps {
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onReplay?: () => void;
  playbackSpeed?: number;
  onSpeedChange?: (speed: number) => void;
  autoReplayLabel?: string;
  onAutoReplayClick?: () => void;
  currentTime?: string;
  duration?: string;
  progressPercent?: number;
  onSeek?: (fraction: number) => void;
  loopA?: string | null;
  loopB?: string | null;
  onSetLoopA?: () => void;
  onSetLoopB?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

const SPEED_OPTIONS = [0.5, 0.6, 0.75, 0.9, 1.0, 1.25, 1.5, 2.0];
const MIN_RATE = 0.5;
const MAX_RATE = 2.0;
const RATE_STEP = 0.05;

export const AudioControlCard: React.FC<AudioControlCardProps> = ({
  isPlaying = false,
  onTogglePlay,
  onPrevious,
  onNext,
  onReplay,
  playbackSpeed = 1.0,
  onSpeedChange,
  autoReplayLabel = 'Auto 5x/2s',
  onAutoReplayClick,
  currentTime = '0:01',
  duration = '0:01',
  progressPercent = 35,
  onSeek,
  loopA = null,
  loopB = null,
  onSetLoopA,
  onSetLoopB,
  hasPrevious = true,
  hasNext = true,
}) => {
  const [speedDropdownOpen, setSpeedDropdownOpen] = useState(false);
  const speedRef = useRef<HTMLDivElement>(null);

  const applySpeed = (rawSpeed: number) => {
    const clamped = Math.min(MAX_RATE, Math.max(MIN_RATE, Number(rawSpeed.toFixed(2))));
    onSpeedChange?.(clamped);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (speedRef.current && !speedRef.current.contains(e.target as Node)) {
        setSpeedDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-4 rounded-3xl border border-line bg-surface p-4 shadow-sm sm:p-5">
      {/* Top Controls Row */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
        {/* Left cluster: Previous (<), Play/Pause (circular button), Replay, Speed, Auto */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Previous (<) */}
          <button
            type="button"
            onClick={onPrevious}
            disabled={!hasPrevious}
            title="Câu trước đó"
            className="grid size-9 place-items-center rounded-xl border border-line text-content-muted transition hover:bg-surface-hover hover:text-content active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 sm:size-10"
          >
            <ChevronLeft className="size-4 sm:size-5" />
          </button>

          {/* Play/Pause (nút tròn lớn màu xanh dương/accent với icon play màu trắng) */}
          <button
            type="button"
            onClick={onTogglePlay}
            title={isPlaying ? 'Tạm dừng' : 'Phát âm thanh'}
            className="grid size-11 place-items-center rounded-full bg-accent text-accent-contrast shadow-md transition hover:brightness-105 active:scale-95 sm:size-12"
          >
            {isPlaying ? (
              <Pause className="size-5 fill-current" />
            ) : (
              <Play className="size-5 fill-current translate-x-0.5" />
            )}
          </button>

          {/* Phát lại (icon mũi tên xoay) */}
          <button
            type="button"
            onClick={onReplay}
            title="Phát lại câu hiện tại"
            className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-2 text-xs font-bold text-content-muted transition hover:bg-surface-hover hover:text-content active:scale-95"
          >
            <RotateCcw className="size-3.5" />
            <span className="text-content">Phát lại</span>
          </button>

          {/* 1x (Tốc độ) */}
          <div className="relative" ref={speedRef}>
            <button
              type="button"
              onClick={() => setSpeedDropdownOpen((prev) => !prev)}
              title="Tốc độ phát"
              className="inline-flex items-center gap-1 rounded-xl border border-line px-2.5 py-2 text-xs font-bold text-content-muted transition hover:bg-surface-hover hover:text-content active:scale-95"
            >
              <Gauge className="size-3.5" />
              <span className="font-mono text-content">{Number(playbackSpeed.toFixed(2))}x</span>
              <ChevronDown
                className={`size-3 transition-transform duration-200 ${
                  speedDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {speedDropdownOpen && (
              <div className="absolute top-full left-0 z-50 mt-2 w-72 rounded-2xl border border-line bg-surface p-3.5 shadow-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-content">
                    Tốc độ phát
                  </span>
                  <div className="flex items-center gap-1.5">
                    {playbackSpeed !== 1 && (
                      <button
                        type="button"
                        onClick={() => applySpeed(1)}
                        className="rounded-lg border border-line bg-surface-elevated px-2 py-0.5 text-[10px] font-bold text-content-muted transition hover:bg-surface-hover hover:text-content"
                      >
                        Mặc định (1x)
                      </button>
                    )}
                    <span className="rounded-lg bg-accent/15 px-2 py-0.5 font-mono text-xs font-black text-accent-strong">
                      {Number(playbackSpeed.toFixed(2))}x
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => applySpeed(playbackSpeed - RATE_STEP)}
                    disabled={playbackSpeed <= MIN_RATE}
                    aria-label="Giảm tốc độ"
                    className="grid size-7 shrink-0 place-items-center rounded-lg border border-line bg-surface-elevated text-content-muted transition hover:bg-surface-hover hover:text-content disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Minus className="size-3.5" />
                  </button>

                  <input
                    type="range"
                    min={MIN_RATE}
                    max={MAX_RATE}
                    step={RATE_STEP}
                    value={playbackSpeed}
                    onChange={(e) => applySpeed(Number(e.target.value))}
                    aria-label="Thanh trượt điều chỉnh tốc độ phát"
                    className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-slate-200 accent-brand-600 dark:bg-slate-700 dark:accent-brand-400"
                  />

                  <button
                    type="button"
                    onClick={() => applySpeed(playbackSpeed + RATE_STEP)}
                    disabled={playbackSpeed >= MAX_RATE}
                    aria-label="Tăng tốc độ"
                    className="grid size-7 shrink-0 place-items-center rounded-lg border border-line bg-surface-elevated text-content-muted transition hover:bg-surface-hover hover:text-content disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>

                <div className="mt-1 flex justify-between px-1 font-mono text-[10px] font-semibold text-content-muted">
                  <span>0.5x</span>
                  <span>1.0x</span>
                  <span>2.0x</span>
                </div>

                <div className="mt-3 border-t border-line pt-2.5">
                  <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-content-muted">
                    Mức chọn nhanh
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {SPEED_OPTIONS.map((speed) => {
                      const isActive = Math.abs(playbackSpeed - speed) < 0.01;
                      return (
                        <button
                          key={speed}
                          type="button"
                          onClick={() => applySpeed(speed)}
                          className={`flex items-center justify-center rounded-xl border py-1.5 font-mono text-xs font-bold transition ${
                            isActive
                              ? 'border-accent bg-accent text-accent-contrast shadow-xs font-extrabold'
                              : 'border-line bg-surface-elevated text-content-muted hover:border-accent/40 hover:text-content'
                          }`}
                        >
                          {speed}x
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Auto 5x/2s (nút có icon, styled theo design tokens) */}
          <button
            type="button"
            onClick={onAutoReplayClick}
            title="Cài đặt phát lại tự động"
            className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface-elevated/80 px-3 py-2 text-xs font-bold text-content transition hover:bg-surface-hover hover:border-accent/40 active:scale-95"
          >
            <Repeat className="size-3.5 text-accent-strong" />
            <span>{autoReplayLabel}</span>
          </button>
        </div>

        {/* Right cluster: Next (>) */}
        <button
          type="button"
          onClick={onNext}
          disabled={!hasNext}
          title="Câu kế tiếp"
          className="grid size-9 place-items-center rounded-xl border border-line text-content-muted transition hover:bg-surface-hover hover:text-content active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 sm:size-10"
        >
          <ChevronRight className="size-4 sm:size-5" />
        </button>
      </div>

      {/* Bottom Row: Progress bar & A-B Loop Controls */}
      <div className="space-y-2 border-t border-line/50 pt-3">
        {/* Progress Bar with left & right timestamps */}
        <div className="flex items-center gap-3">
          <span className="w-9 text-xs font-bold tabular-nums text-content">
            {currentTime}
          </span>

          <div
            className="group relative flex h-3 flex-1 cursor-pointer items-center"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const fraction = Math.max(
                0,
                Math.min(1, (e.clientX - rect.left) / rect.width)
              );
              onSeek?.(fraction);
            }}
          >
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-elevated transition-all group-hover:h-2">
              <div
                className="h-full rounded-full bg-accent transition-all duration-150"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <span className="w-9 text-right text-xs font-semibold tabular-nums text-content-muted">
            {duration}
          </span>
        </div>

        {/* Sub-bar: A, B & Vòng lặp đoạn (A-B) */}
        <div className="flex items-center gap-2 pt-1 text-xs text-content-muted">
          <button
            type="button"
            onClick={onSetLoopA}
            className={`rounded-lg border px-2 py-0.5 text-xs font-extrabold transition active:scale-95 ${
              loopA !== null
                ? 'border-accent bg-accent/15 text-accent-strong'
                : 'border-line hover:bg-surface-hover hover:text-content'
            }`}
          >
            A
          </button>

          <button
            type="button"
            onClick={onSetLoopB}
            className={`rounded-lg border px-2 py-0.5 text-xs font-extrabold transition active:scale-95 ${
              loopB !== null
                ? 'border-accent bg-accent/15 text-accent-strong'
                : 'border-line hover:bg-surface-hover hover:text-content'
            }`}
          >
            B
          </button>

          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-content-muted">
            <Repeat className="size-3" />
            <span>Vòng lặp đoạn (A-B)</span>
          </span>
        </div>
      </div>
    </div>
  );
};

/* ==========================================================================
   4. INPUT AREA (WORD PLACEHOLDERS & ACTIONS CARD) COMPONENT
   ========================================================================== */

export interface InputAreaCardProps {
  sentenceText?: string;
  onComplete?: (score: number, hintCount: number) => void;
  isCompletedAlready?: boolean;
}

export const InputAreaCard: React.FC<InputAreaCardProps> = ({
  sentenceText = 'He is looking at the computer monitor.',
  onComplete,
  isCompletedAlready = false,
}) => {
  const { language } = useLanguage();
  // Parse sentence into tokens (words + trailing punctuation)
  const { wordTokens, trailingPunctuation } = useMemo(() => {
    const raw = sentenceText.trim();
    const punctMatch = raw.match(/[.,!?;:]+$/);
    const trailingPunctuation = punctMatch ? punctMatch[0] : '.';
    const cleaned = punctMatch ? raw.slice(0, -punctMatch[0].length) : raw;
    const words = cleaned.split(/\s+/).filter(Boolean);

    const wordTokens = words.map((w, idx) => ({
      index: idx,
      word: w,
      clean: w.toLowerCase().replace(/^[^\w]+|[^\w]+$/g, ''),
      approxLength: Math.max(3, w.length),
    }));

    return { wordTokens, trailingPunctuation };
  }, [sentenceText]);

  // Revealed words state & typed inputs state
  const [revealedMap, setRevealedMap] = useState<Record<number, boolean>>(() => {
    if (isCompletedAlready) {
      const all: Record<number, boolean> = {};
      wordTokens.forEach((_, idx) => {
        all[idx] = true;
      });
      return all;
    }
    return {};
  });

  const [inputValues, setInputValues] = useState<Record<number, string>>({});
  const [showFullTranscript, setShowFullTranscript] = useState(isCompletedAlready);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [isFinished, setIsFinished] = useState(isCompletedAlready);

  // Count how many words are completed/revealed
  const totalWords = wordTokens.length;
  const completedWordsCount = useMemo(() => {
    return wordTokens.filter((token) => {
      if (showFullTranscript) return true;
      if (revealedMap[token.index]) return true;
      const typed = (inputValues[token.index] || '').trim().toLowerCase();
      return typed === token.clean;
    }).length;
  }, [wordTokens, showFullTranscript, revealedMap, inputValues]);

  // Reveal a single word by clicking
  const handleRevealWord = (index: number) => {
    if (revealedMap[index] || showFullTranscript) return;
    setRevealedMap((prev) => ({ ...prev, [index]: true }));
    setHintsUsed((h) => h + 1);
  };

  // Toggle full transcript view
  const handleToggleTranscript = () => {
    setShowFullTranscript((prev) => !prev);
  };

  // Reveal all words via Tab shortcut
  const handleRevealAll = useCallback(() => {
    setShowFullTranscript(true);
  }, []);

  // Reveal first unrevealed word via Ctrl + H
  const handleHintNext = useCallback(() => {
    const nextIdx = wordTokens.findIndex(
      (t) => !revealedMap[t.index] && (inputValues[t.index] || '').trim().toLowerCase() !== t.clean
    );
    if (nextIdx !== -1) {
      handleRevealWord(nextIdx);
    }
  }, [wordTokens, revealedMap, inputValues]);

  // Complete sentence
  const handleFinish = () => {
    setIsFinished(true);
    const score = Math.max(3, 10 - Math.min(7, hintsUsed));
    if (score >= 7) {
      soundFX.playCorrect();
    } else {
      soundFX.playWrong();
    }
    onComplete?.(score, hintsUsed);
  };

  // Handle typing inside an input slot
  const handleInputChange = (index: number, val: string) => {
    setInputValues((prev) => ({ ...prev, [index]: val }));
    const token = wordTokens[index];
    if (token && val.trim().toLowerCase() === token.clean) {
      soundFX.playWordPop();
      setRevealedMap((prev) => ({ ...prev, [index]: true }));
    }
  };

  // Global keyboard shortcuts: Tab (reveal all), Ctrl + H (hint word)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        handleRevealAll();
      } else if (e.ctrlKey && (e.key === 'h' || e.key === 'H')) {
        e.preventDefault();
        handleHintNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRevealAll, handleHintNext]);

  return (
    <section className="space-y-6 rounded-3xl border border-line bg-surface p-5 shadow-sm sm:p-7">
      {/* Placeholders Area: variable width input slots */}
      <div className="flex flex-wrap items-baseline gap-2 sm:gap-2.5">
        {wordTokens.map((token) => {
          const isRevealed = showFullTranscript || revealedMap[token.index];
          const typed = inputValues[token.index] || '';
          const isCorrect = typed.trim().toLowerCase() === token.clean;

          // Dynamic width calculation: narrow words (~52px) to longer words (~110px)
          const computedWidth = Math.max(50, Math.min(130, token.approxLength * 12 + 24));

          return (
            <div key={token.index} className="relative inline-flex items-center">
              {isRevealed || isCorrect ? (
                <button
                  type="button"
                  onClick={() => handleRevealWord(token.index)}
                  className="rounded-xl border border-line/70 bg-surface-elevated/40 px-3 py-2 text-center text-sm font-bold text-content transition hover:border-accent/50"
                  style={{ minWidth: `${computedWidth}px` }}
                >
                  {token.word}
                </button>
              ) : (
                <input
                  type="text"
                  value={typed}
                  onChange={(e) => handleInputChange(token.index, e.target.value)}
                  onClick={() => handleRevealWord(token.index)}
                  placeholder=""
                  aria-label={language === 'en' ? `Word ${token.index + 1}` : `Từ thứ ${token.index + 1}`}
                  style={{ width: `${computedWidth}px` }}
                  className="rounded-xl border border-line/90 bg-surface-elevated/80 px-2.5 py-2 text-center text-sm font-semibold text-content transition-all hover:border-accent/60 focus:border-accent focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent/20 cursor-pointer"
                />
              )}
            </div>
          );
        })}

        {/* Trailing punctuation */}
        <span className="text-xl font-black text-content-muted">
          {trailingPunctuation}
        </span>
      </div>

      {/* Bottom Status & Action Bar */}
      <div className="flex flex-col gap-4 border-t border-line/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: Progress bar & Counter (e.g. 0 / 7) */}
        <div className="flex items-center gap-3">
          <div className="h-2 w-28 overflow-hidden rounded-full bg-surface-elevated sm:w-36">
            <div
              className="h-full rounded-full bg-accent transition-all duration-300"
              style={{
                width: `${totalWords > 0 ? (completedWordsCount / totalWords) * 100 : 0}%`,
              }}
            />
          </div>

          <span className="text-xs font-bold tabular-nums text-content-muted">
            {completedWordsCount} / {totalWords}
          </span>
        </div>

        {/* Right: Toggle transcript, 10/10 Score Badge, "Hoàn thành" button */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Nút "Hiển thị transcript" (kèm icon con mắt) */}
          <button
            type="button"
            onClick={handleToggleTranscript}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line px-3.5 text-xs font-bold text-content-muted transition hover:bg-surface-hover hover:text-content active:scale-95"
          >
            <Eye className="size-3.5 text-accent-strong" />
            <span>
              {showFullTranscript
                ? (language === 'en' ? 'Hide transcript' : 'Ẩn transcript')
                : (language === 'en' ? 'Show transcript' : 'Hiển thị transcript')}
            </span>
          </button>

          {/* Badge 10/10 (kèm icon huy hiệu/award - không dùng sparkle icon per UI motion rules) */}
          <div className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-accent/25 bg-accent/15 px-3 text-xs font-black text-accent-strong">
            <Award className="size-3.5 shrink-0" />
            <span>10/10</span>
          </div>

          {/* Nút "Hoàn thành" (màu xanh dương/accent, chữ trắng, kèm icon tick) */}
          <button
            type="button"
            onClick={handleFinish}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-accent px-5 text-xs font-black text-accent-contrast shadow-sm transition hover:brightness-105 active:scale-95 sm:ml-2"
          >
            <Check className="size-4 stroke-[3]" />
            <span>{language === 'en' ? 'Finish' : 'Hoàn thành'}</span>
          </button>
        </div>
      </div>
    </section>
  );
};

/* ==========================================================================
   5. FOOTER SHORTCUTS COMPONENT
   ========================================================================== */

export const FooterShortcuts: React.FC = () => {
  const { language } = useLanguage();
  return (
    <footer className="flex flex-wrap items-center justify-center gap-2 pt-2 text-center text-xs text-content-muted select-none">
      <span>{language === 'en' ? 'Click each word to reveal' : 'Click từng từ để hiện'}</span>
      <span className="text-content-muted/50">·</span>
      <span className="inline-flex items-center gap-1">
        <kbd className="rounded-md border border-line bg-surface-elevated px-1.5 py-0.5 font-mono text-[11px] font-bold text-content shadow-xs">
          Tab
        </kbd>
        <span>{language === 'en' ? 'reveal all' : 'hiện tất cả'}</span>
      </span>
      <span className="text-content-muted/50">·</span>
      <kbd className="rounded-md border border-line bg-surface-elevated px-1.5 py-0.5 font-mono text-[11px] font-bold text-content shadow-xs">
        Ctrl + H
      </kbd>
    </footer>
  );
};

/* ==========================================================================
   6. FULL COMPOSITE SCREEN COMPONENT (LISTEN CHECK SCREEN)
   ========================================================================== */

export interface ListenCheckScreenProps {
  partMeta?: string;
  sentenceTitle?: string;
  sentenceText?: string;
  onComplete?: (score: number, hintCount: number) => void;
  isCompletedAlready?: boolean;
}

export const ListenCheckScreen: React.FC<ListenCheckScreenProps> = ({
  partMeta = 'PART 1 · 1/24',
  sentenceTitle = 'Câu 1',
  sentenceText = 'He is looking at the computer monitor.',
  onComplete,
  isCompletedAlready = false,
}) => {
  // Mock internal state for audio player
  const [activeTab, setActiveTab] = useState('listen_check');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [progressPercent, setProgressPercent] = useState(25);
  const [loopA, setLoopA] = useState<string | null>(null);
  const [loopB, setLoopB] = useState<string | null>(null);

  const handleTogglePlay = () => setIsPlaying((prev) => !prev);
  const handleReplay = () => {
    setIsPlaying(true);
    setProgressPercent(0);
  };
  const handleSpeedChange = (s: number) => setPlaybackSpeed(s);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 pb-12 text-content">
      {/* 1. Top Navigation Bar */}
      <div className="flex justify-center sm:justify-start">
        <TopTabs activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* 2. Header Section */}
      <HeaderSection partMeta={partMeta} sentenceTitle={sentenceTitle} />

      {/* 3. Audio Control Card */}
      <AudioControlCard
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        onReplay={handleReplay}
        playbackSpeed={playbackSpeed}
        onSpeedChange={handleSpeedChange}
        progressPercent={progressPercent}
        onSeek={(fraction) => setProgressPercent(fraction * 100)}
        loopA={loopA}
        loopB={loopB}
        onSetLoopA={() => setLoopA((prev) => (prev ? null : '0:01'))}
        onSetLoopB={() => setLoopB((prev) => (prev ? null : '0:03'))}
      />

      {/* 4. Input Area Card */}
      <InputAreaCard
        sentenceText={sentenceText}
        onComplete={onComplete}
        isCompletedAlready={isCompletedAlready}
      />

      {/* 5. Footer Shortcuts Helper */}
      <FooterShortcuts />
    </div>
  );
};

export default ListenCheckScreen;
