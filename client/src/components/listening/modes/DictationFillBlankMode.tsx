import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  HelpCircle,
  Lightbulb,
  RotateCcw,
  Send,
  Volume2,
} from 'lucide-react';
import type { ListeningSentence } from '../../../types';
import { soundFX } from '../../../utils/soundEffects';
import { useLanguage } from '../../../context/LanguageContext';

export interface DictationFillBlankModeProps {
  sentence: ListeningSentence;
  onComplete: (score: number, hintCount: number) => void;
  onReset?: (sentenceId: string) => void;
  onOpenNotes?: (word?: string) => void;
  isCompletedAlready?: boolean;
  activeWordIndex?: number;
  isPlaying?: boolean;
  onJumpToWord?: (startSeconds: number) => void;
  onPlayWordAudio?: (start: number, end: number) => void;
  onNextSentence?: () => void;
  hasNextSentence?: boolean;
}

interface WordToken {
  id: string;
  original: string;
  cleanWord: string;
  isTarget: boolean;
  prefix: string;
  suffix: string;
  targetIndex?: number;
  wordIndex: number;
  timestamp?: { start: number; end: number } | null;
}

const normalizeWord = (w: string) =>
  w.toLowerCase().replace(/^[^\w]+|[^\w]+$/g, '').trim();

export const DictationFillBlankMode: React.FC<DictationFillBlankModeProps> = ({
  sentence,
  onComplete,
  onReset,
  onOpenNotes,
  isCompletedAlready = false,
  activeWordIndex = -1,
  isPlaying = false,
  onJumpToWord,
  onPlayWordAudio,
  onNextSentence,
  hasNextSentence = false,
}) => {
  const { language } = useLanguage();
  const [inputs, setInputs] = useState<Record<number, string>>({});
  const [hintsUsed, setHintsUsed] = useState(0);
  const [revealedChars, setRevealedChars] = useState<Record<number, number>>({});
  const [isSubmitted, setIsSubmitted] = useState(isCompletedAlready);
  const [isRedoing, setIsRedoing] = useState(false);
  const [showFeedback, setShowFeedback] = useState(isCompletedAlready);
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const isSentenceCompleted = !isRedoing && (isSubmitted || isCompletedAlready);

  // Tokenize sentence into text and blank slots
  const { tokens, targetWordsList } = useMemo(() => {
    const rawTokens = sentence.text.split(/(\s+)/);
    let targets = (sentence.wordsToFill || []).map(normalizeWord).filter(Boolean);
    // Guarantee that short / single-word sentences always have 1 blank slot
    if (targets.length === 0) {
      const fallbackMatch = sentence.text.match(/[\w'-]+/);
      if (fallbackMatch) {
        targets = [normalizeWord(fallbackMatch[0])];
      }
    }
    const assignedTargets = new Set<number>();

    const parsedTokens: WordToken[] = [];
    let blankIndex = 0;
    let wordCounter = 0;

    rawTokens.forEach((tok, i) => {
      if (/^\s+$/.test(tok)) {
        parsedTokens.push({
          id: `space-${i}`,
          original: tok,
          cleanWord: '',
          isTarget: false,
          prefix: '',
          suffix: '',
          wordIndex: -1,
          timestamp: null,
        });
        return;
      }

      const currentWordIdx = wordCounter++;
      const currentWordTimestamp =
        sentence.words && sentence.words[currentWordIdx]
          ? sentence.words[currentWordIdx]
          : null;

      const match = tok.match(/^([^\w]*)([\w'-]+)([^\w]*)$/);
      if (!match) {
        parsedTokens.push({
          id: `tok-${i}`,
          original: tok,
          cleanWord: '',
          isTarget: false,
          prefix: '',
          suffix: '',
          wordIndex: currentWordIdx,
          timestamp: currentWordTimestamp,
        });
        return;
      }

      const prefix = match[1] || '';
      const word = match[2] || '';
      const suffix = match[3] || '';
      const clean = normalizeWord(word);

      // Check if this clean word is in targets
      const targetMatchIndex = targets.findIndex(
        (t, idx) => t === clean && !assignedTargets.has(idx)
      );

      if (targetMatchIndex !== -1) {
        assignedTargets.add(targetMatchIndex);
        parsedTokens.push({
          id: `blank-${blankIndex}`,
          original: tok,
          cleanWord: clean,
          isTarget: true,
          prefix,
          suffix,
          targetIndex: blankIndex,
          wordIndex: currentWordIdx,
          timestamp: currentWordTimestamp,
        });
        blankIndex++;
      } else {
        parsedTokens.push({
          id: `tok-${i}`,
          original: tok,
          cleanWord: clean,
          isTarget: false,
          prefix,
          suffix,
          wordIndex: currentWordIdx,
          timestamp: currentWordTimestamp,
        });
      }
    });

    return {
      tokens: parsedTokens,
      targetWordsList: targets,
    };
  }, [sentence.text, sentence.words, sentence.wordsToFill]);

  const totalBlanks = useMemo(
    () => tokens.filter((t) => t.isTarget).length,
    [tokens]
  );

  // Initialize inputs when sentence changes
  useEffect(() => {
    if (isCompletedAlready && !isRedoing) {
      // Prefill with exact answers if completed
      const prefilled: Record<number, string> = {};
      tokens.forEach((t) => {
        if (t.isTarget && t.targetIndex !== undefined) {
          prefilled[t.targetIndex] = t.cleanWord;
        }
      });
      setInputs(prefilled);
      setIsSubmitted(true);
      setShowFeedback(true);
    } else if (!isRedoing) {
      setInputs({});
      setHintsUsed(0);
      setRevealedChars({});
      setIsSubmitted(false);
      setShowFeedback(false);
      // Auto focus first input
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 50);
    }
  }, [sentence.id, isCompletedAlready, tokens, isRedoing]);

  // Calculate correct blanks count
  const correctCount = useMemo(() => {
    let count = 0;
    tokens.forEach((t) => {
      if (t.isTarget && t.targetIndex !== undefined) {
        const val = normalizeWord(inputs[t.targetIndex] || '');
        if (val === t.cleanWord) count++;
      }
    });
    return count;
  }, [inputs, tokens]);

  const handleComplete = useCallback(() => {
    if (isSentenceCompleted) return;
    setIsSubmitted(true);
    setIsRedoing(false);
    setShowFeedback(true);
    const allCorrect = tokens.every((t) => {
      if (!t.isTarget || t.targetIndex === undefined) return true;
      return normalizeWord(inputs[t.targetIndex] || '') === t.cleanWord;
    });
    if (allCorrect) {
      soundFX.playCorrect();
    } else {
      soundFX.playWrong();
    }
    const finalScore = Math.max(1, 10 - hintsUsed);
    onComplete(finalScore, hintsUsed);
  }, [hintsUsed, inputs, isSentenceCompleted, onComplete, tokens]);

  // Handle single input change and auto-focus next
  const handleInputChange = (idx: number, cleanTarget: string, value: string) => {
    if (isSentenceCompleted) return;
    const newInputs = { ...inputs, [idx]: value };
    setInputs(newInputs);

    // If word matches correctly, auto advance to next blank
    if (normalizeWord(value) === cleanTarget) {
      soundFX.playWordPop();

      // Find next unfilled index
      const nextIdx = tokens
        .filter((t) => t.isTarget && t.targetIndex !== undefined && t.targetIndex > idx)
        .find((t) => normalizeWord(newInputs[t.targetIndex!] || '') !== t.cleanWord)
        ?.targetIndex;

      if (nextIdx !== undefined && inputRefs.current[nextIdx]) {
        inputRefs.current[nextIdx]?.focus();
      }

      // Check if all blanks are now correct for auto-submit
      const allCorrect = tokens.every((t) => {
        if (!t.isTarget || t.targetIndex === undefined) return true;
        return normalizeWord(newInputs[t.targetIndex] || '') === t.cleanWord;
      });

      if (allCorrect) {
        setTimeout(handleComplete, 200);
      }
    }
  };

  // Hint button logic
  const handleUseHint = () => {
    if (isSentenceCompleted) return;
    // Find first unfilled or incorrect blank
    const targetToken = tokens.find(
      (t) =>
        t.isTarget &&
        t.targetIndex !== undefined &&
        normalizeWord(inputs[t.targetIndex] || '') !== t.cleanWord
    );

    if (!targetToken || targetToken.targetIndex === undefined) return;
    const idx = targetToken.targetIndex;
    const targetWord = targetToken.cleanWord;
    const currentChars = revealedChars[idx] || 0;

    setHintsUsed((prev) => prev + 1);

    if (currentChars >= targetWord.length - 1) {
      // Reveal entire word
      setInputs((prev) => ({ ...prev, [idx]: targetWord }));
      setRevealedChars((prev) => ({ ...prev, [idx]: targetWord.length }));
      inputRefs.current[idx]?.focus();
    } else {
      // Reveal next letter
      const nextCount = currentChars + 1;
      const partial = targetWord.slice(0, nextCount);
      setRevealedChars((prev) => ({ ...prev, [idx]: nextCount }));
      setInputs((prev) => ({ ...prev, [idx]: partial }));
      inputRefs.current[idx]?.focus();
    }
  };

  const handleReset = () => {
    setIsRedoing(true);
    setInputs({});
    setRevealedChars({});
    setHintsUsed(0);
    setIsSubmitted(false);
    setShowFeedback(false);
    onReset?.(sentence.id);
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 50);
  };

  // Keyboard shortcut Ctrl+Enter for submit (or next sentence if completed)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      if (isSentenceCompleted) {
        if (hasNextSentence && onNextSentence) {
          onNextSentence();
        }
      } else {
        handleComplete();
      }
    }
  };

  return (
    <div className="space-y-4" onKeyDown={handleKeyDown}>
      {/* Top status bar: blanks progress + hint button + reset button */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-line bg-surface-elevated/40 px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-extrabold text-content">
            {language === 'en' ? 'Fill in heard words:' : 'Điền từ đã nghe:'}
          </span>
          <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-black text-accent-strong tabular-nums">
            {correctCount} / {totalBlanks} {language === 'en' ? 'correct' : 'từ đúng'}
          </span>
          {hintsUsed > 0 && (
            <span className="text-[11px] font-semibold text-content-muted">
              {language === 'en' ? `(-${hintsUsed} hint penalty)` : `(-${hintsUsed} điểm gợi ý)`}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleUseHint}
            disabled={isSentenceCompleted || correctCount === totalBlanks}
            title={language === 'en' ? 'Show hint for next character (-1 pt)' : 'Xem gợi ý ký tự tiếp theo (Trừ 1 điểm)'}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-600 transition hover:bg-amber-500/20 active:scale-95 disabled:opacity-40 dark:text-amber-400"
          >
            <Lightbulb className="size-3.5" />
            <span>{language === 'en' ? 'Hint' : 'Gợi ý'}</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            title={language === 'en' ? 'Restart this sentence' : 'Làm lại câu này từ đầu'}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-xs font-bold text-content-muted transition hover:bg-surface-hover hover:text-content active:scale-95"
          >
            <RotateCcw className="size-3.5" />
            <span>{language === 'en' ? 'Reset' : 'Xoá làm lại'}</span>
          </button>
        </div>
      </div>

      {/* Main sentence text container with inline inputs and real-time karaoke */}
      <div className="rounded-2xl border border-line bg-surface p-5 sm:p-7 shadow-sm">
        <div className="leading-loose text-base sm:text-lg font-medium text-content select-none">
          {tokens.map((token) => {
            if (token.wordIndex === -1) {
              return (
                <span key={token.id} className="whitespace-pre">
                  {token.original}
                </span>
              );
            }

            const isWordActive =
              activeWordIndex !== undefined &&
              activeWordIndex !== -1 &&
              token.wordIndex === activeWordIndex;
            const isWordPassed =
              activeWordIndex !== undefined &&
              activeWordIndex !== -1 &&
              token.wordIndex < activeWordIndex;
            const hasTimestamp = Boolean(token.timestamp);

            const wordDuration = token.timestamp
              ? Math.max(0.08, token.timestamp.end - token.timestamp.start)
              : 0.2;

            if (!token.isTarget) {
              return (
                <button
                  key={`${token.id}-${isWordActive}`}
                  type="button"
                  onClick={() => {
                    if (token.timestamp && onJumpToWord) {
                      onJumpToWord(token.timestamp.start);
                    }
                  }}
                  disabled={!hasTimestamp}
                  title={
                    hasTimestamp
                      ? `Tua đến "${token.original.trim()}" (${token.timestamp?.start.toFixed(2)}s)`
                      : undefined
                  }
                  className={`relative inline-block overflow-hidden rounded-lg px-2 py-0.5 mx-0.5 my-0.5 text-left transition-all duration-150 cursor-pointer ${
                    isWordActive
                      ? 'bg-accent/20 border border-accent/40 text-accent-strong font-black ring-1 ring-accent/30 shadow-xs scale-105'
                      : 'text-content font-bold border border-transparent hover:bg-surface-elevated'
                  }`}
                >
                  {/* Active sweep runner with accent design tokens */}
                  {isWordActive && (
                    <span
                      className="pointer-events-none absolute inset-y-0 left-0 rounded-md bg-accent/30 dark:bg-accent/40"
                      style={{
                        animation: `karaoke-sweep ${wordDuration}s linear forwards`,
                        animationPlayState: isPlaying ? 'running' : 'paused',
                      }}
                    />
                  )}
                  <span className="relative z-10">{token.original}</span>
                </button>
              );
            }

            const idx = token.targetIndex!;
            const currentVal = inputs[idx] || '';
            const isWordCorrect = normalizeWord(currentVal) === token.cleanWord;
            const inputWidth = Math.max(76, token.cleanWord.length * 13 + 28);

            // When sentence is completed/submitted: karaoke sweeps through filled blanks too
            if (isSentenceCompleted) {
              const wordText = currentVal || token.cleanWord;
              return (
                <span
                  key={token.id}
                  className="inline-flex items-center whitespace-nowrap align-middle px-0.5 my-0.5"
                >
                  {token.prefix && <span className="font-bold mr-0.5">{token.prefix}</span>}
                  <button
                    key={`${token.id}-${isWordActive}`}
                    type="button"
                    onClick={() => {
                      if (token.timestamp && onJumpToWord) {
                        onJumpToWord(token.timestamp.start);
                      }
                    }}
                    title={
                      hasTimestamp
                        ? `Tua đến "${token.cleanWord}" (${token.timestamp?.start.toFixed(2)}s)`
                        : undefined
                    }
                    className={`relative inline-flex items-center gap-1 overflow-hidden rounded-lg px-2 py-0.5 mx-0.5 my-0.5 text-left transition-all duration-150 cursor-pointer ${
                      isWordActive
                        ? 'bg-accent/20 border border-accent/40 text-accent-strong font-black ring-1 ring-accent/30 shadow-xs scale-105'
                        : 'text-content font-bold border border-transparent hover:bg-surface-elevated'
                    }`}
                  >
                    {/* Active sweep runner with accent design tokens */}
                    {isWordActive && (
                      <span
                        className="pointer-events-none absolute inset-y-0 left-0 rounded-md bg-accent/30 dark:bg-accent/40"
                        style={{
                          animation: `karaoke-sweep ${wordDuration}s linear forwards`,
                          animationPlayState: isPlaying ? 'running' : 'paused',
                        }}
                      />
                    )}
                    <span className="relative z-10">{wordText}</span>
                    {isWordCorrect && (
                      <CheckCircle2 className="relative z-10 size-3 text-positive shrink-0" />
                    )}
                  </button>
                  {token.suffix && <span className="font-bold ml-0.5">{token.suffix}</span>}
                </span>
              );
            }

            // Normal exercise mode: inline input with smooth karaoke indicator
            return (
              <span
                key={token.id}
                className="inline-flex items-center whitespace-nowrap align-middle px-1 my-0.5"
              >
                {token.prefix && <span className="font-bold mr-0.5">{token.prefix}</span>}
                <div
                  className={`relative inline-block align-baseline transition-all group/blank ${
                    isWordActive ? 'z-20' : 'hover:z-20 focus-within:z-20'
                  }`}
                >
                  <input
                    ref={(el) => {
                      inputRefs.current[idx] = el;
                    }}
                    type="text"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    disabled={isSentenceCompleted}
                    style={{ width: `${inputWidth}px` }}
                    value={currentVal}
                    placeholder=""
                    onChange={(e) => handleInputChange(idx, token.cleanWord, e.target.value)}
                    className={`border-2 border-transparent border-b-line rounded-xl bg-surface-elevated/70 pl-2 pr-6 py-0.5 text-center text-sm sm:text-base font-bold transition-all duration-150 ${
                      isWordActive
                        ? 'border-b-accent bg-accent/10 text-accent-strong ring-1 ring-accent/30'
                        : 'text-content hover:border-b-accent/50'
                    } focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent/20 focus:outline-none`}
                  />
                  {/* Underline progress sweep indicator while audio speaks this blank */}
                  {isWordActive && (
                    <span
                      className="absolute bottom-0 left-0 h-0.5 bg-accent pointer-events-none rounded-full"
                      style={{
                        animation: `karaoke-sweep ${wordDuration}s linear forwards`,
                        animationPlayState: isPlaying ? 'running' : 'paused',
                      }}
                    />
                  )}
                  {isWordCorrect && (
                    <CheckCircle2 className="absolute -right-1.5 -top-1.5 size-3.5 rounded-full bg-surface text-positive z-20" />
                  )}
                  {hasTimestamp && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (token.timestamp && onPlayWordAudio) {
                          onPlayWordAudio(token.timestamp.start, token.timestamp.end);
                        } else if (token.timestamp && onJumpToWord) {
                          onJumpToWord(token.timestamp.start);
                        }
                      }}
                      title={`Tua nghe lại ô này (${token.timestamp!.start.toFixed(2)}s)`}
                      className={`absolute right-1 top-1/2 -translate-y-1/2 z-10 grid size-[18px] place-items-center rounded-full border transition-all hover:scale-110 active:scale-95 ${
                        isWordActive
                          ? 'border-accent bg-accent text-accent-contrast scale-110 ring-2 ring-accent/30 shadow-xs'
                          : 'border-line bg-surface-elevated text-content-muted opacity-70 group-hover/blank:opacity-100 hover:text-content'
                      }`}
                    >
                      <Volume2 className="size-2.5" />
                    </button>
                  )}
                </div>
                {token.suffix && <span className="font-bold ml-0.5">{token.suffix}</span>}
              </span>
            );
          })}
        </div>
      </div>

      {/* Manual Submit Button & Shortcuts note */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-[11px] font-semibold text-content-muted">
          {language === 'en' ? (
            <>Tip: Press <kbd className="rounded bg-surface-elevated px-1 py-0.5">Ctrl+Enter</kbd> to submit, or auto-submits when all blanks are correct.</>
          ) : (
            <>Mẹo: Phím <kbd className="rounded bg-surface-elevated px-1 py-0.5">Ctrl+Enter</kbd> để nộp, hệ thống sẽ tự nộp khi điền đúng hết.</>
          )}
        </span>

        {!isSentenceCompleted ? (
          <button
            type="button"
            onClick={handleComplete}
            className="btn-primary justify-center gap-1.5 text-xs sm:w-auto"
          >
            <Send className="size-3.5" />
            <span>{language === 'en' ? 'Submit (Ctrl+Enter)' : 'Nộp bài (Ctrl+Enter)'}</span>
          </button>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-xs font-bold text-positive">
                <CheckCircle2 className="size-3.5" /> {language === 'en' ? 'Sentence completed!' : 'Đã hoàn thành câu này!'}
              </span>
              {onOpenNotes && (
                <button
                  type="button"
                  onClick={() => onOpenNotes(sentence.wordsToFill?.[0])}
                  className="btn-secondary text-xs"
                >
                  {language === 'en' ? 'Vocabulary Notes' : 'Ghi chú từ vựng'}
                </button>
              )}
            </div>
            {hasNextSentence && onNextSentence && (
              <button
                type="button"
                onClick={onNextSentence}
                className="btn-primary text-xs ml-auto flex items-center gap-1 shadow-sm"
              >
                <span>{language === 'en' ? 'Next Sentence' : 'Câu tiếp theo'}</span>
                <ChevronRight className="size-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Translation & Answer Breakdown when submitted or feedback shown */}
      {showFeedback && (
        <div className="rounded-2xl border border-positive/30 bg-positive/5 p-4 sm:p-5 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-black text-positive">
            <CheckCircle2 className="size-4" />
            <span>{language === 'en' ? 'Vietnamese Meaning & Answer Key:' : 'Bản dịch nghĩa và đáp án chuẩn:'}</span>
          </div>

          {sentence.phoneticUs && (
            <div className="flex items-center gap-2 text-xs font-mono text-accent-strong">
              <span className="font-sans font-bold text-content-muted">{language === 'en' ? 'Phonetics:' : 'Phát âm chuẩn:'}</span>
              <span>/{sentence.phoneticUs}/</span>
            </div>
          )}

          <p className="text-xs sm:text-sm leading-relaxed text-content">
            {sentence.translationVi}
          </p>

          <div className="flex flex-wrap gap-2 border-t border-line/60 pt-3 text-xs">
            <span className="font-extrabold text-content-muted">{language === 'en' ? 'Key Target Words:' : 'Các từ trọng điểm:'}</span>
            {sentence.wordsToFill?.map((w) => (
              <span
                key={w}
                className="rounded-lg bg-surface px-2 py-0.5 font-bold text-accent-strong ring-1 ring-line"
              >
                {w}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
