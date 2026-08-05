import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

interface StatusBadgeProps {
  isCorrect?: boolean | null;
  text?: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  isCorrect,
  text,
  className = '',
}) => {
  if (isCorrect === null || isCorrect === undefined) return null;

  const defaultText = isCorrect ? 'Chính xác' : 'Chưa đúng';
  const displayText = text || defaultText;

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-extrabold shadow-2xs transition-all ${
        isCorrect
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-300'
          : 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/20 dark:text-rose-300'
      } ${className}`}
    >
      {isCorrect ? (
        <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
      ) : (
        <XCircle className="size-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
      )}
      <span className="whitespace-nowrap">{displayText}</span>
    </span>
  );
};
