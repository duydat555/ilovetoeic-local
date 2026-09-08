import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Volume2,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  BookOpen,
} from 'lucide-react';
import { VocabularyWord } from '../../../types';
import { playPronunciation } from '../../../utils/audioPronunciation';

interface Props {
  words: VocabularyWord[];
  onToggleRemembered: (word: VocabularyWord) => void;
}

type ScopeMode = 'due_and_new' | 'current_part' | 'all';

export const FlashcardStudyView: React.FC<Props> = ({ words, onToggleRemembered }) => {
  const reduceMotion = useReducedMotion();
  const [scope, setScope] = useState<ScopeMode>('current_part');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const activeWords = useMemo(() => {
    if (words.length === 0) return [];
    if (scope === 'due_and_new') {
      const filtered = words.filter((w) => !w.remembered);
      return filtered.length > 0 ? filtered : words;
    }
    return words;
  }, [words, scope]);

  const currentWord: VocabularyWord | undefined = activeWords[currentIndex];

  // Keyboard shortcuts: Space to flip, 1 Chưa thuộc, 2 Đã thuộc, ← → navigate, Enter audio
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (currentWord) playPronunciation(currentWord.word, 'US', undefined, currentWord.audioUrl);
      } else if (e.key === '1') {
        e.preventDefault();
        handleMark(false);
      } else if (e.key === '2') {
        e.preventDefault();
        handleMark(true);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentWord, currentIndex, activeWords]);

  useEffect(() => {
    setIsFlipped(false);
  }, [currentIndex, scope]);

  const handleNext = () => {
    if (currentIndex < activeWords.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleMark = (remembered: boolean) => {
    if (!currentWord) return;
    if (currentWord.remembered !== remembered) {
      onToggleRemembered(currentWord);
    }
    handleNext();
  };

  if (!currentWord) {
    return (
      <div className="grid min-h-80 place-items-center rounded-3xl border border-line bg-surface p-8 text-center">
        <div>
          <CheckCircle2 className="mx-auto size-12 text-emerald-500" />
          <h3 className="mt-3 text-lg font-black text-content">Không có thẻ nào để học!</h3>
          <p className="mt-1 text-sm text-content-muted">Tất cả từ trong phạm vi này đã được bạn học thuộc.</p>
        </div>
      </div>
    );
  }

  const rememberedCount = words.filter((w) => w.remembered).length;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* Scope bar & progress */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5 rounded-2xl border border-line bg-surface p-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setScope('due_and_new');
              setCurrentIndex(0);
            }}
            className={`rounded-xl px-3 py-2 transition-all ${
              scope === 'due_and_new'
                ? 'bg-accent text-accent-contrast shadow-sm'
                : 'text-content-muted hover:text-content'
            }`}
          >
            Mới + cần ôn ({words.length - rememberedCount})
          </button>
          <button
            type="button"
            onClick={() => {
              setScope('current_part');
              setCurrentIndex(0);
            }}
            className={`rounded-xl px-3 py-2 transition-all ${
              scope === 'current_part'
                ? 'bg-accent text-accent-contrast shadow-sm'
                : 'text-content-muted hover:text-content'
            }`}
          >
            Tất cả từ trong phần ({words.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setScope('all');
              setCurrentIndex(0);
            }}
            className={`rounded-xl px-3 py-2 transition-all ${
              scope === 'all'
                ? 'bg-accent text-accent-contrast shadow-sm'
                : 'text-content-muted hover:text-content'
            }`}
          >
            Cả bộ
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-content-muted">
          <span>
            {currentIndex + 1} / {activeWords.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="grid size-8 place-items-center rounded-lg border border-line bg-surface hover:bg-surface-hover disabled:opacity-30"
              aria-label="Thẻ trước"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="grid size-8 place-items-center rounded-lg border border-line bg-surface hover:bg-surface-hover"
              aria-label="Thẻ tiếp"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 3D Flip Card Container */}
      <div
        className="relative min-h-[380px] w-full cursor-pointer select-none [perspective:1000px]"
        onClick={() => setIsFlipped((prev) => !prev)}
      >
        <motion.div
          initial={false}
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: reduceMotion ? 0.05 : 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="relative min-h-[380px] w-full rounded-3xl border border-line bg-surface p-6 shadow-xl transition-shadow hover:shadow-2xl dark:shadow-none [transform-style:preserve-3d] sm:p-8"
        >
          {/* FRONT SIDE */}
          <div
            className={`flex flex-col items-center justify-between text-center [backface-visibility:hidden] ${
              isFlipped ? 'pointer-events-none opacity-0' : 'opacity-100'
            }`}
          >
            {/* Top Badges */}
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-black text-sky-600 dark:text-sky-400">
                {currentWord.remembered ? 'Đã học' : 'Từ mới'}
              </span>
              {currentWord.level && (
                <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-black text-indigo-600 dark:text-indigo-400">
                  {currentWord.level}
                </span>
              )}
            </div>

            {/* Word & Phonetic */}
            <div className="mt-4">
              <h2 className="text-4xl font-black tracking-tight text-content sm:text-5xl">
                {currentWord.word}
              </h2>
              <p className="mt-2 font-mono text-base font-semibold text-sky-600 dark:text-sky-400">
                {currentWord.phonetic || '//—//'}
              </p>
            </div>

            {/* Center Image */}
            <div className="mt-5 size-28 overflow-hidden rounded-2xl border border-line bg-slate-100 dark:bg-slate-800">
              {currentWord.imageUrl ? (
                <img
                  src={currentWord.imageUrl}
                  alt={currentWord.word}
                  className="size-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex size-full flex-col items-center justify-center bg-gradient-to-br from-accent/15 via-brand-500/10 to-accent/5 text-accent-strong">
                  <BookOpen className="size-8" />
                  <span className="mt-1 text-[10px] font-bold uppercase tracking-wider">
                    {currentWord.partOfSpeech}
                  </span>
                </div>
              )}
            </div>

            {/* Audio Buttons */}
            <div
              className="mt-6 flex items-center gap-3"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => playPronunciation(currentWord.word, 'US', undefined, currentWord.audioUrl)}
                className="flex items-center gap-1.5 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-xs font-extrabold text-sky-600 transition hover:bg-sky-500 hover:text-white dark:text-sky-400"
              >
                <Volume2 className="size-4" /> US
              </button>
              <button
                type="button"
                onClick={() => playPronunciation(currentWord.word, 'UK', undefined, currentWord.audioUkUrl)}
                className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-extrabold text-rose-600 transition hover:bg-rose-500 hover:text-white dark:text-rose-400"
              >
                <Volume2 className="size-4" /> UK
              </button>
            </div>

            {/* Hint */}
            <p className="mt-6 text-xs font-medium text-content-muted">
              Click thẻ hoặc bấm <kbd className="rounded border border-line bg-surface-elevated px-1.5 py-0.5 font-mono text-[10px] font-bold text-content">Space</kbd> để xem nghĩa
            </p>
          </div>

          {/* BACK SIDE */}
          <div
            className={`absolute inset-0 flex flex-col justify-between p-6 text-left [backface-visibility:hidden] [transform:rotateY(180deg)] sm:p-8 ${
              !isFlipped ? 'pointer-events-none opacity-0' : 'opacity-100'
            }`}
          >
            <div>
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-content">{currentWord.word}</span>
                  <span className="font-mono text-xs font-semibold text-sky-600 dark:text-sky-400">
                    {currentWord.phonetic}
                  </span>
                </div>
                <span className="rounded-md border border-line bg-surface-elevated px-2 py-0.5 text-[10px] font-black uppercase text-content-muted">
                  {currentWord.partOfSpeech}
                </span>
              </div>

              {/* Vietnamese Meaning */}
              <div className="mt-4">
                <span className="text-[10px] font-black uppercase tracking-wider text-content-muted">
                  Nghĩa tiếng Việt
                </span>
                <p className="mt-1 text-lg font-black text-accent-strong">{currentWord.meaningVi}</p>
              </div>

              {/* English Definition */}
              {currentWord.definitionEn && (
                <div className="mt-3">
                  <span className="text-[10px] font-black uppercase tracking-wider text-content-muted">
                    Định nghĩa tiếng Anh
                  </span>
                  <p className="mt-0.5 text-xs font-medium leading-relaxed text-content">
                    {currentWord.definitionEn}
                  </p>
                </div>
              )}

              {/* Example */}
              {currentWord.exampleEn && (
                <div className="mt-3 rounded-2xl border border-accent/20 bg-accent/5 p-3.5">
                  <p className="text-xs font-bold text-content">{currentWord.exampleEn}</p>
                  {currentWord.exampleVi && (
                    <p className="mt-1 text-[11px] italic text-content-muted">{currentWord.exampleVi}</p>
                  )}
                </div>
              )}
            </div>

            {/* Back action buttons */}
            <div className="mt-4 flex items-center justify-between gap-3" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => handleMark(false)}
                className="group flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 text-xs font-extrabold text-rose-600 transition hover:bg-rose-500 hover:text-white dark:text-rose-400"
              >
                <XCircle className="size-4" />
                <span>Chưa thuộc</span>
                <kbd className="rounded border border-rose-500/30 bg-rose-500/15 px-1.5 py-0.5 font-mono text-[10px] font-bold group-hover:bg-white/20 group-hover:text-white">
                  1
                </kbd>
              </button>

              <button
                type="button"
                onClick={() => handleMark(true)}
                className="group flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-extrabold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 active:scale-98"
              >
                <CheckCircle2 className="size-4" />
                <span>Đã thuộc</span>
                <kbd className="rounded bg-black/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">
                  2
                </kbd>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
