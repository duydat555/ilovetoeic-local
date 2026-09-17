import React, { useMemo, useState } from 'react';
import { CheckCircle2, ChevronRight, RotateCcw, XCircle } from 'lucide-react';
import type { ListeningSentence } from '../../../types';
import { soundFX } from '../../../utils/soundEffects';
import { useLanguage } from '../../../context/LanguageContext';

export interface WordSelectModeProps {
  sentence: ListeningSentence;
  onComplete: (score: number, hintCount: number) => void;
  onReset?: (sentenceId: string) => void;
  isCompletedAlready?: boolean;
  onNextSentence?: () => void;
  hasNextSentence?: boolean;
}

const COMMON_DISTRACTORS = [
  'schedule',
  'contract',
  'colleagues',
  'procedure',
  'maintenance',
  'equipment',
  'proposal',
  'financial',
  'conference',
  'department',
];

export const WordSelectMode: React.FC<WordSelectModeProps> = ({
  sentence,
  onComplete,
  onReset,
  isCompletedAlready = false,
  onNextSentence,
  hasNextSentence = false,
}) => {
  const { language } = useLanguage();
  // Target word to hide and guess
  const targetWord = useMemo(() => {
    return (sentence.wordsToFill && sentence.wordsToFill[0]) || 'report';
  }, [sentence.wordsToFill]);

  const [selectedWord, setSelectedWord] = useState<string | null>(
    isCompletedAlready ? targetWord : null
  );
  const [isAnswered, setIsAnswered] = useState(isCompletedAlready);
  const [resetCount, setResetCount] = useState(0);

  // Generate word options (correct target + other words in wordsToFill + random common words)
  const wordOptions = useMemo(() => {
    const list = [targetWord];
    (sentence.wordsToFill || []).slice(1).forEach((w) => list.push(w));
    COMMON_DISTRACTORS.forEach((w) => {
      if (!list.includes(w) && list.length < 4) {
        list.push(w);
      }
    });
    return Array.from(new Set(list)).sort(() => 0.5 - Math.random());
  }, [targetWord, sentence.wordsToFill, resetCount]);

  // Sentence with highlighted blank
  const maskedSentence = useMemo(() => {
    const regex = new RegExp(`\\b${targetWord}\\b`, 'i');
    return sentence.text.replace(regex, '_______');
  }, [sentence.text, targetWord]);

  const handleChooseWord = (word: string) => {
    if (isAnswered) return;
    setSelectedWord(word);
    setIsAnswered(true);

    const isCorrect = word.toLowerCase() === targetWord.toLowerCase();
    if (isCorrect) {
      soundFX.playCorrect();
    } else {
      soundFX.playWrong();
    }
    const score = isCorrect ? 10 : 3;
    onComplete(score, 0);
  };

  const handleReset = () => {
    setSelectedWord(null);
    setIsAnswered(false);
    setResetCount((prev) => prev + 1);
    onReset?.(sentence.id);
  };

  return (
    <div className="space-y-5">
      {/* Masked Sentence Display */}
      <div className="rounded-2xl border border-line bg-surface p-5 sm:p-7 shadow-sm">
        <span className="inline-block rounded-md bg-accent/15 px-2 py-0.5 text-[11px] font-black text-accent-strong">
          {language === 'en' ? 'Select missing word' : 'Chọn từ còn thiếu'}
        </span>
        <p className="mt-3 text-base sm:text-lg font-semibold leading-loose text-content">
          {maskedSentence}
        </p>
        <p className="mt-2 text-xs italic text-content-muted">
          {language === 'en' ? 'Meaning: ' : 'Dịch nghĩa: '}{sentence.translationVi}
        </p>
      </div>

      {/* Word Choices Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {wordOptions.map((word, idx) => {
          const isChosen = selectedWord === word;
          const isCorrect = word.toLowerCase() === targetWord.toLowerCase();

          let btnStyle = 'border-line bg-surface hover:border-accent hover:text-accent-strong text-content';
          if (isAnswered) {
            if (isCorrect) {
              btnStyle = 'border-positive bg-positive/10 text-positive ring-1 ring-positive/40';
            } else if (isChosen && !isCorrect) {
              btnStyle = 'border-negative bg-negative/10 text-negative ring-1 ring-negative/40';
            } else {
              btnStyle = 'border-line bg-surface/50 text-content-muted opacity-60';
            }
          }

          return (
            <button
              key={idx}
              type="button"
              disabled={isAnswered}
              onClick={() => handleChooseWord(word)}
              className={`flex min-h-12 items-center justify-center rounded-xl border p-3 text-center text-sm font-bold capitalize transition active:scale-95 ${btnStyle}`}
            >
              {word}
            </button>
          );
        })}
      </div>

      {/* Answer feedback & Action bar */}
      {isAnswered && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-line bg-surface-elevated/40 p-4 text-xs">
          {selectedWord?.toLowerCase() === targetWord.toLowerCase() ? (
            <span className="flex items-center gap-1.5 font-bold text-positive">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>
                {language === 'en' ? 'Correct! The word is: ' : 'Chính xác! Từ đúng là: '}
                <strong className="underline">{targetWord}</strong>
              </span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 font-bold text-negative">
              <XCircle className="size-4 shrink-0" />
              <span>
                {language === 'en' ? 'Incorrect. The correct word is: ' : 'Chưa chính xác. Từ đúng trong câu là: '}
                <strong className="underline">{targetWord}</strong>
              </span>
            </span>
          )}

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleReset}
              className="btn-secondary text-xs shrink-0 flex items-center gap-1.5"
            >
              <RotateCcw className="size-3.5" />
              <span>{language === 'en' ? 'Redo' : 'Làm lại'}</span>
            </button>
            {hasNextSentence && onNextSentence && (
              <button
                type="button"
                onClick={onNextSentence}
                className="btn-primary text-xs shrink-0 flex items-center gap-1 shadow-sm"
              >
                <span>{language === 'en' ? 'Next Sentence' : 'Câu tiếp theo'}</span>
                <ChevronRight className="size-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
