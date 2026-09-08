import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HelpCircle,
  Lightbulb,
  CheckCircle2,
  XCircle,
  Volume2,
  ArrowRight,
  BookOpen,
  RotateCcw,
  Trophy,
} from 'lucide-react';
import { VocabularyWord } from '../../../types';
import { playPronunciation } from '../../../utils/audioPronunciation';

interface Props {
  words: VocabularyWord[];
  onWordMastered?: (wordId: string) => void;
  onWordNeedReview?: (wordId: string) => void;
}

type ScopeMode = 'due_and_new' | 'current_part' | 'all';

export const GuessWordView: React.FC<Props> = ({ words, onWordMastered, onWordNeedReview }) => {
  const [scope, setScope] = useState<ScopeMode>('current_part');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [revealedLetters, setRevealedLetters] = useState<number>(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isShake, setIsShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter words by scope
  const activeWords = useMemo(() => {
    if (words.length === 0) return [];
    if (scope === 'due_and_new') {
      const filtered = words.filter((w) => !w.remembered);
      return filtered.length > 0 ? filtered : words;
    }
    return words;
  }, [words, scope]);

  const currentWord: VocabularyWord | undefined = activeWords[currentIndex];

  useEffect(() => {
    resetState();
  }, [currentIndex, scope, activeWords]);

  const resetState = () => {
    setUserInput('');
    setRevealedLetters(0);
    setShowAnswer(false);
    setIsCorrect(null);
    setIsShake(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  if (!currentWord) {
    return (
      <div className="grid min-h-80 place-items-center rounded-3xl border border-line bg-surface p-8 text-center">
        <div>
          <Trophy className="mx-auto size-12 text-amber-500" />
          <h3 className="mt-3 text-lg font-black text-content">Đã hoàn thành tất cả từ vựng!</h3>
          <p className="mt-1 text-sm text-content-muted">Bạn không có từ vựng nào cần đoán trong phạm vi này.</p>
          <button
            type="button"
            onClick={() => {
              setScope('all');
              setCurrentIndex(0);
            }}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-xs font-extrabold text-accent-contrast shadow-md"
          >
            <RotateCcw className="size-4" /> Bắt đầu lại
          </button>
        </div>
      </div>
    );
  }

  const targetClean = currentWord.word.trim().toLowerCase();
  const wordLength = targetClean.length;
  const maxHints = Math.max(1, wordLength - 1);
  const hintsRemaining = Math.max(0, maxHints - revealedLetters);

  // Mask the word in the example sentence with asterisks
  const maskedExampleEn = useMemo(() => {
    if (!currentWord.exampleEn) return '';
    const regex = new RegExp(`\\b${currentWord.word}\\b`, 'gi');
    return currentWord.exampleEn.replace(regex, '*'.repeat(wordLength));
  }, [currentWord.exampleEn, currentWord.word, wordLength]);

  // Build the asterisk hint row with partially revealed letters
  const maskedWordHint = useMemo(() => {
    const chars = targetClean.split('');
    return chars
      .map((char, idx) => {
        if (char === ' ' || char === '-') return char;
        if (idx < revealedLetters) return char.toUpperCase();
        return '*';
      })
      .join(' ');
  }, [targetClean, revealedLetters]);

  // Give 1 more letter hint
  const handleGiveHint = () => {
    if (hintsRemaining > 0) {
      setRevealedLetters((prev) => prev + 1);
      inputRef.current?.focus();
    }
  };

  // Check answer
  const handleCheckAnswer = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (showAnswer) {
      handleNextWord();
      return;
    }

    const inputClean = userInput.trim().toLowerCase();
    if (!inputClean) return;

    if (inputClean === targetClean) {
      setIsCorrect(true);
      setShowAnswer(true);
      playPronunciation(currentWord.word, 'US', undefined, currentWord.audioUrl);
      onWordMastered?.(currentWord.id);
    } else {
      setIsCorrect(false);
      setIsShake(true);
      setTimeout(() => setIsShake(false), 500);
      onWordNeedReview?.(currentWord.id);
    }
  };

  // Give up / Don't know
  const handleGiveUp = () => {
    setShowAnswer(true);
    setIsCorrect(false);
    playPronunciation(currentWord.word, 'US', undefined, currentWord.audioUrl);
    onWordNeedReview?.(currentWord.id);
  };

  // Next word
  const handleNextWord = () => {
    if (currentIndex < activeWords.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* Scope filter tabs */}
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
            Mới + cần ôn ({words.filter((w) => !w.remembered).length})
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

        <span className="text-xs font-medium text-content-muted">
          Câu {currentIndex + 1} / {activeWords.length}
        </span>
      </div>

      {/* Main Guessing Card */}
      <div className="relative rounded-3xl border border-line bg-surface p-6 shadow-xl dark:shadow-none sm:p-8">
        {/* Card Header Title */}
        <div className="flex items-center justify-center gap-2 text-xs font-extrabold uppercase tracking-wider text-content-muted">
          <HelpCircle className="size-4 text-accent" />
          <span>Đoán từ tiếng Anh theo nghĩa</span>
        </div>

        {/* Illustration image or thematic avatar */}
        <div className="mt-5 flex justify-center">
          <div className="relative size-28 overflow-hidden rounded-2xl border border-line bg-slate-100 shadow-sm dark:bg-slate-800">
            {currentWord.imageUrl ? (
              <img
                src={currentWord.imageUrl}
                alt="Illustration"
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
        </div>

        {/* Part of speech & Vietnamese meaning */}
        <div className="mt-5 text-center">
          <span className="inline-block rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-xs font-black uppercase text-sky-600 dark:text-sky-400">
            {currentWord.partOfSpeech}
          </span>
          <h3 className="mt-2 text-xl font-black tracking-tight text-content sm:text-2xl">
            {currentWord.meaningVi}
          </h3>
        </div>

        {/* English definition */}
        {currentWord.definitionEn && (
          <div className="mt-3 text-center text-sm font-medium text-content-muted">
            <span className="font-extrabold text-content">EN </span>
            {currentWord.definitionEn}
          </div>
        )}

        {/* Masked Example Sentence */}
        {currentWord.exampleEn && (
          <div className="mt-4 rounded-2xl border border-line bg-surface-elevated p-4 text-center">
            <p className="text-sm font-bold text-content">{maskedExampleEn}</p>
            {currentWord.exampleVi && (
              <p className="mt-1 text-xs italic text-content-muted">{currentWord.exampleVi}</p>
            )}
          </div>
        )}

        {/* Hint row: Asterisks and Hint Button */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <div className="rounded-xl border border-line bg-surface-elevated px-4 py-2 font-mono text-lg font-black tracking-widest text-accent-strong">
            {maskedWordHint}
          </div>

          {!showAnswer && hintsRemaining > 0 && (
            <button
              type="button"
              onClick={handleGiveHint}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-extrabold text-amber-600 transition hover:bg-amber-500/20 dark:text-amber-400"
            >
              <Lightbulb className="size-3.5" /> Gợi ý ({hintsRemaining})
            </button>
          )}
        </div>

        {/* Text Input Form */}
        <form onSubmit={handleCheckAnswer} className="mt-6 space-y-4">
          <motion.div
            animate={isShake ? { x: [-10, 10, -10, 10, 0] } : {}}
            transition={{ duration: 0.4 }}
          >
            <input
              ref={inputRef}
              type="text"
              disabled={showAnswer}
              value={userInput}
              onChange={(e) => {
                setUserInput(e.target.value);
                setIsCorrect(null);
              }}
              placeholder="Nhập từ tiếng Anh..."
              className={`w-full rounded-2xl border p-4 text-center text-lg font-black tracking-wide outline-none transition-all placeholder:text-sm placeholder:font-normal placeholder:tracking-normal ${
                isCorrect === true
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : isCorrect === false
                  ? 'border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                  : 'border-line bg-surface-elevated text-content focus:border-accent focus:ring-4 focus:ring-accent/15'
              }`}
            />
          </motion.div>

          {/* Feedback & Answer Reveal Box */}
          <AnimatePresence>
            {showAnswer && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl border p-4 text-center ${
                  isCorrect
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    : 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                }`}
              >
                <div className="flex items-center justify-center gap-2 font-black text-base">
                  {isCorrect ? (
                    <>
                      <CheckCircle2 className="size-5 text-emerald-500" />
                      <span>Chính xác!</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="size-5 text-rose-500" />
                      <span>Đáp án đúng là:</span>
                    </>
                  )}
                </div>

                <div className="mt-2 flex items-center justify-center gap-2">
                  <span className="text-xl font-black text-content">{currentWord.word}</span>
                  <span className="font-mono text-sm font-semibold text-sky-600 dark:text-sky-400">
                    {currentWord.phonetic}
                  </span>
                  <button
                    type="button"
                    onClick={() => playPronunciation(currentWord.word, 'US', undefined, currentWord.audioUrl)}
                    className="grid size-8 place-items-center rounded-lg bg-accent text-accent-contrast shadow-sm transition hover:scale-105"
                  >
                    <Volume2 className="size-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom Actions */}
          <div className="flex items-center justify-between gap-3 pt-2">
            {!showAnswer ? (
              <>
                <button
                  type="button"
                  onClick={handleGiveUp}
                  className="min-h-12 flex-1 rounded-2xl border border-line bg-surface px-4 text-sm font-extrabold text-content transition hover:border-accent/40 hover:bg-surface-elevated active:scale-98"
                >
                  Không biết
                </button>

                <button
                  type="submit"
                  disabled={!userInput.trim()}
                  className="group inline-flex min-h-12 flex-1 items-center justify-center gap-2.5 rounded-2xl bg-accent px-4 text-sm font-black text-accent-contrast shadow-lg shadow-accent/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-xl hover:shadow-accent/30 active:translate-y-0 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
                >
                  <span>Kiểm tra đáp án</span>
                  <kbd className="inline-flex items-center rounded-lg bg-black/15 px-2 py-0.5 font-mono text-[11px] font-bold text-accent-contrast dark:bg-white/20">
                    ↵ Enter
                  </kbd>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleNextWord}
                autoFocus
                className="group inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-2xl bg-accent px-6 text-sm font-black text-accent-contrast shadow-lg shadow-accent/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-xl hover:shadow-accent/30 active:translate-y-0 active:scale-[0.98]"
              >
                <span>Từ tiếp theo</span>
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                <kbd className="inline-flex items-center rounded-lg bg-black/15 px-2 py-0.5 font-mono text-[11px] font-bold text-accent-contrast dark:bg-white/20">
                  ↵ Enter
                </kbd>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
