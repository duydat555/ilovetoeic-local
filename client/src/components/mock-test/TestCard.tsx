import React from 'react';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  Play,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { MockTestItem } from '../../types';
import { TestMode } from './SelectModeModal';

interface TestCardProps {
  test: MockTestItem;
  onOpenMode?: (test: MockTestItem, mode: TestMode) => void;
  wrongCount?: number;
  historyCount?: number;
  onRetryWrong?: (test: MockTestItem) => void;
  onDeleteHistory?: (test: MockTestItem) => void;
  variant?: 'default' | 'picker';
  selected?: boolean;
  onSelect?: (test: MockTestItem) => void;
}

export const TestCard: React.FC<TestCardProps> = ({
  test,
  onOpenMode,
  wrongCount = 0,
  historyCount = 0,
  onRetryWrong,
  onDeleteHistory,
  variant = 'default',
  selected = false,
  onSelect,
}) => {
  const picker = variant === 'picker';

  return (
  <article
    aria-labelledby={`test-card-title-${test.id}`}
    aria-selected={picker ? selected : undefined}
    className={`surface flex transform-gpu flex-col justify-between ${picker ? 'p-4' : 'p-5'} transition-[transform,box-shadow,border-color,background-color] duration-200 ease-out motion-reduce:hover:scale-100 motion-reduce:transition-none ${
      picker
        ? selected
          ? 'border-amber-300 bg-amber-50 shadow-[0_16px_34px_-24px_rgba(138,94,21,0.45)] dark:border-amber-400/60 dark:bg-amber-400/10'
          : 'hover:-translate-y-0.5 hover:border-amber-300 dark:hover:border-amber-400/45'
        : 'hover:scale-[1.02] hover:border-blue-200 hover:shadow-[0_18px_38px_-20px_rgba(30,64,175,0.35)] dark:hover:border-blue-400/50 dark:hover:shadow-[0_18px_38px_-20px_rgba(2,6,23,0.72)]'
    }`}
  >
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3
          id={`test-card-title-${test.id}`}
          className="min-w-0 truncate text-base font-extrabold text-content"
          title={test.title}
        >
          {test.title}
        </h3>
        {!picker && (
          <div className="flex shrink-0 items-center gap-1 text-content-muted">
            <button
              type="button"
              disabled={wrongCount === 0}
              onClick={() => onRetryWrong?.(test)}
              aria-label={`Làm lại ${wrongCount} câu sai của ${test.title}`}
              title={wrongCount === 0 ? 'Không có câu sai để làm lại' : `Làm lại ${wrongCount} câu sai`}
              className="relative grid size-8 place-items-center rounded-lg transition-colors hover:bg-negative/10 hover:text-negative disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RotateCcw className="size-3.5" />
              <span className="absolute -right-1 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-negative px-1 text-[9px] font-black leading-none text-white">
                {wrongCount}
              </span>
            </button>
            <button
              type="button"
              disabled={historyCount === 0 && wrongCount === 0}
              onClick={() => onDeleteHistory?.(test)}
              aria-label={`Xoá lịch sử làm bài của ${test.title}`}
              title={historyCount === 0 && wrongCount === 0 ? 'Chưa có lịch sử làm bài để xoá' : 'Xoá lịch sử làm bài'}
              className="grid size-8 place-items-center rounded-lg transition-colors hover:bg-negative/10 hover:text-negative disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        )}
      </div>

      <div className={`flex items-center gap-3 font-medium text-content-muted ${picker ? 'text-sm' : 'text-xs'}`}>
        <span className="flex items-center gap-1">
          <FileText className="size-3.5" />
          {test.totalQuestions} câu
        </span>
        <span className="flex items-center gap-1">
          <Clock className="size-3.5" />
          {test.durationMinutes} phút
        </span>
      </div>

      <p className={`${picker ? 'text-sm' : 'text-xs'} font-medium text-content-muted`}>
        {picker ? `${test.type} - ${test.difficulty}` : historyCount > 0 ? `${historyCount} lượt đã làm` : 'Chưa luyện tập'}
      </p>
    </div>

    <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-3">
      {picker ? (
        <button
          type="button"
          onClick={() => onSelect?.(test)}
          className={`col-span-2 flex min-h-10 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors duration-200 ${
            selected
              ? 'border-amber-300 bg-amber-100 text-amber-950 dark:border-amber-400/50 dark:bg-amber-400/15 dark:text-amber-200'
              : 'border-line bg-surface text-content hover:border-accent/45 hover:bg-brand-50 dark:hover:bg-brand-500/10'
          }`}
        >
          {selected ? <CheckCircle2 className="size-4" /> : <FileText className="size-4" />}
          {selected ? 'Đã chọn đề này' : 'Chọn đề này'}
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={() => onOpenMode?.(test, 'exam')}
            className="flex min-h-9 items-center justify-center gap-1 rounded-xl border border-line bg-transparent px-3 py-2 text-xs font-bold text-content transition-colors duration-200 ease-out hover:border-accent/40 hover:bg-surface-hover"
          >
            <Play className="size-3.5 fill-current" />
            Thi thử
          </button>
          <button
            type="button"
            onClick={() => onOpenMode?.(test, 'practice')}
            className="flex min-h-9 items-center justify-center gap-1 rounded-xl border border-positive/25 bg-positive/10 px-3 py-2 text-xs font-bold text-positive transition-colors duration-200 ease-out hover:bg-positive/15"
          >
            <BookOpen className="size-3.5" />
            Luyện tập
          </button>
        </>
      )}
    </div>
  </article>
  );
};
