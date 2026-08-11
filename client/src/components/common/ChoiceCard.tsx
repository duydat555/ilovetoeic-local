import React from 'react';
import { Check, X } from 'lucide-react';

type ChoiceId = 'A' | 'B' | 'C' | 'D';

interface ChoiceCardProps {
  choiceId: ChoiceId;
  text: string;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  hiddenListeningText?: boolean;
  checkMode?: boolean;
  isCorrect?: boolean;
  isUserChoice?: boolean;
  hiddenListeningLabel?: (choiceId: ChoiceId) => string;
}

export const ChoiceCard: React.FC<ChoiceCardProps> = ({
  choiceId,
  text,
  selected,
  onSelect,
  disabled = false,
  hiddenListeningText = false,
  checkMode = false,
  isCorrect = false,
  isUserChoice = false,
  hiddenListeningLabel = (id) => `Phương án ${id}`,
}) => {
  let cardStyles =
    'relative flex min-h-[44px] w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left text-sm transition-all duration-200 cursor-pointer select-none';
  let badgeStyles =
    'flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-colors';

  if (checkMode) {
    if (isCorrect) {
      cardStyles +=
        ' border-emerald-500 bg-emerald-50/90 text-emerald-950 shadow-sm dark:border-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-200 font-medium';
      badgeStyles += ' bg-emerald-600 text-white';
    } else if (isUserChoice && !isCorrect) {
      cardStyles +=
        ' border-rose-500 bg-rose-50/90 text-rose-950 shadow-sm dark:border-rose-600 dark:bg-rose-950/40 dark:text-rose-200';
      badgeStyles += ' bg-rose-600 text-white';
    } else {
      cardStyles +=
        ' border-slate-200 bg-slate-50/60 text-slate-400 opacity-60 dark:border-line dark:bg-surface/40 dark:text-content-muted';
      badgeStyles += ' bg-slate-200 text-slate-500 dark:bg-surface-elevated dark:text-content-muted';
    }
  } else if (selected) {
    cardStyles +=
      ' border-brand bg-brand-50/80 text-brand-950 shadow-sm ring-1 ring-brand-500/30 dark:border-brand-500 dark:bg-brand-950/50 dark:text-brand-100 font-semibold';
    badgeStyles += ' bg-brand text-brand-ink shadow-sm shadow-brand-600/30';
  } else {
    cardStyles +=
      ' border-slate-200/90 bg-white text-slate-800 hover:border-brand-400/80 hover:bg-brand-50/40 dark:border-line dark:bg-surface dark:text-content dark:hover:border-brand-500/50 dark:hover:bg-surface-hover/60';
    badgeStyles +=
      ' bg-slate-100 text-slate-700 dark:bg-surface-elevated dark:text-content-muted';
  }

  if (disabled && !checkMode) {
    cardStyles += ' opacity-50 cursor-not-allowed';
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={cardStyles}
    >
      <span className={badgeStyles}>{choiceId}</span>
      <span className="flex-1 leading-snug">
        {hiddenListeningText ? hiddenListeningLabel(choiceId) : text}
      </span>

      {checkMode && isCorrect && (
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
          <Check className="size-3.5 stroke-[2.5]" />
        </span>
      )}
      {checkMode && isUserChoice && !isCorrect && (
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white">
          <X className="size-3.5 stroke-[2.5]" />
        </span>
      )}
    </button>
  );
};
