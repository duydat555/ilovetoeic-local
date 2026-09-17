import React, { useMemo, useState } from 'react';
import { CheckCircle2, ChevronRight, RotateCcw, XCircle } from 'lucide-react';
import type { ListeningSentence } from '../../../types';
import { soundFX } from '../../../utils/soundEffects';
import { useLanguage } from '../../../context/LanguageContext';

export interface MeaningSelectModeProps {
  sentence: ListeningSentence;
  onComplete: (score: number, hintCount: number) => void;
  onReset?: (sentenceId: string) => void;
  isCompletedAlready?: boolean;
  onNextSentence?: () => void;
  hasNextSentence?: boolean;
}

export const MeaningSelectMode: React.FC<MeaningSelectModeProps> = ({
  sentence,
  onComplete,
  onReset,
  isCompletedAlready = false,
  onNextSentence,
  hasNextSentence = false,
}) => {
  const { language } = useLanguage();
  const [selectedOption, setSelectedOption] = useState<string | null>(
    isCompletedAlready ? sentence.text : null
  );
  const [isAnswered, setIsAnswered] = useState(isCompletedAlready);
  const [resetCount, setResetCount] = useState(0);

  // Generate 4 randomized options
  const options = useMemo(() => {
    const rawChoices = [sentence.text, ...(sentence.distractors || [])];
    // Deduplicate and ensure at least 3 choices
    const unique = Array.from(new Set(rawChoices));
    // Shuffle deterministic based on sentence id + reset count
    return unique.sort(() => 0.5 - Math.random());
  }, [sentence.id, sentence.text, sentence.distractors, resetCount]);

  const handleSelect = (option: string) => {
    if (isAnswered) return;
    setSelectedOption(option);
    setIsAnswered(true);

    const isCorrect = option === sentence.text;
    if (isCorrect) {
      soundFX.playCorrect();
    } else {
      soundFX.playWrong();
    }
    const score = isCorrect ? 10 : 3;
    onComplete(score, 0);
  };

  const handleReset = () => {
    setSelectedOption(null);
    setIsAnswered(false);
    setResetCount((prev) => prev + 1);
    onReset?.(sentence.id);
  };

  return (
    <div className="space-y-4">
      {/* Target Vietnamese translation prompt */}
      <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6 shadow-sm">
        <span className="inline-block rounded-md bg-accent/15 px-2 py-0.5 text-[11px] font-black text-accent-strong">
          {language === 'en' ? 'Vietnamese Meaning' : 'Bản dịch tiếng Việt'}
        </span>
        <h3 className="mt-3 text-base sm:text-lg font-bold leading-relaxed text-content">
          "{sentence.translationVi}"
        </h3>
        <p className="mt-1 text-xs text-content-muted">
          {language === 'en'
            ? 'Listen to the audio and select the most accurate English sentence:'
            : 'Hãy lắng nghe audio và chọn câu tiếng Anh tương ứng chính xác nhất:'}
        </p>
      </div>

      {/* Choices list */}
      <div className="space-y-2.5">
        {options.map((option, idx) => {
          const isChosen = selectedOption === option;
          const isCorrect = option === sentence.text;

          let btnStyle = 'border-line bg-surface hover:bg-surface-hover text-content';
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
              onClick={() => handleSelect(option)}
              className={`flex w-full items-center justify-between rounded-xl border p-4 text-left text-sm font-semibold transition active:scale-[0.99] ${btnStyle}`}
            >
              <div className="flex items-center gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-lg border border-line bg-surface-elevated text-xs font-black">
                  {String.fromCharCode(65 + idx)}
                </span>
                <span>{option}</span>
              </div>

              {isAnswered && isCorrect && <CheckCircle2 className="size-5 shrink-0 text-positive" />}
              {isAnswered && isChosen && !isCorrect && <XCircle className="size-5 shrink-0 text-negative" />}
            </button>
          );
        })}
      </div>

      {/* Result explanation & Action bar */}
      {isAnswered && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-line bg-surface-elevated/40 p-4 text-xs">
          <div>
            <span className="font-extrabold text-content">
              {language === 'en' ? 'Reference Answer: ' : 'Đáp án gốc: '}
            </span>
            <span className="font-bold text-accent-strong">{sentence.text}</span>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
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
