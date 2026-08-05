import React from 'react';
import { StatusBadge } from './StatusBadge';

interface QuestionHeaderProps {
  questionNumber: number;
  partId: number;
  title: string;
  isChecked?: boolean;
  isCorrect?: boolean | null;
  className?: string;
}

export const QuestionHeader: React.FC<QuestionHeaderProps> = ({
  questionNumber,
  partId,
  title,
  isChecked,
  isCorrect,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-line ${className}`}
    >
      {/* Tiêu đề và Số câu hỏi (Dùng flex-1 min-w-0 để tiêu đề tự co giãn, xuống dòng tự nhiên) */}
      <div className="flex flex-1 min-w-0 items-start gap-2.5">
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-brand text-xs font-black text-brand-ink shadow-xs">
          {questionNumber}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            Part {partId}
          </div>
          <h2 className="break-words text-sm font-bold text-slate-950 dark:text-content leading-relaxed">
            {title}
          </h2>
        </div>
      </div>

      {/* Badge trạng thái đặt trong container shrink-0 chống bị đè hoặc bóp méo */}
      {isChecked && (
        <div className="shrink-0 pt-0.5">
          <StatusBadge isCorrect={isCorrect} />
        </div>
      )}
    </div>
  );
};
