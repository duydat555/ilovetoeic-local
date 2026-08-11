import React from 'react';
import { BookOpen, CheckCircle2, Headphones, XCircle } from 'lucide-react';

export interface ResultsSummaryCardsProps {
  hasListening: boolean;
  hasReading: boolean;
  isPartial?: boolean;
  listeningResult: { correct: number; total: number };
  readingResult: { correct: number; total: number };
  listeningScore?: number;
  readingScore?: number;
  correctAnswers: number;
  wrongAnswers: number;
  skippedAnswers: number;
  accuracyRate: number;
  totalQuestions: number;
}

export const ResultsSummaryCards: React.FC<ResultsSummaryCardsProps> = ({
  hasListening,
  hasReading,
  isPartial,
  listeningResult,
  readingResult,
  listeningScore,
  readingScore,
  correctAnswers,
  wrongAnswers,
  skippedAnswers,
  accuracyRate,
  totalQuestions,
}) => {
  const incorrectCount = wrongAnswers + skippedAnswers;
  const isFull200 = !isPartial && totalQuestions === 200;

  const visibleCardsCount = (hasListening ? 1 : 0) + (hasReading ? 1 : 0) + 2;

  const gridColsClass =
    visibleCardsCount === 4
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
      : visibleCardsCount === 3
      ? 'grid-cols-1 sm:grid-cols-3'
      : 'grid-cols-1 sm:grid-cols-2';

  return (
    <div className={`grid gap-4 ${gridColsClass}`}>
      {/* Card Listening - Chỉ hiển thị nếu phạm vi có Listening */}
      {hasListening && (
        <div className="surface surface-hover flex items-center gap-4 rounded-2xl border border-line bg-surface p-5 shadow-lg transition-all dark:shadow-none">
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
            <Headphones className="size-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-content-muted">
              {isFull200 ? 'Điểm Listening' : 'Kỹ năng Listening'}
            </div>
            <div className="mt-0.5 text-2xl font-black text-content">
              {isFull200
                ? `${listeningScore || 0} / 495`
                : `${listeningResult.correct}/${listeningResult.total} câu`}
            </div>
          </div>
        </div>
      )}

      {/* Card Reading - Chỉ hiển thị nếu phạm vi có Reading */}
      {hasReading && (
        <div className="surface surface-hover flex items-center gap-4 rounded-2xl border border-line bg-surface p-5 shadow-lg transition-all dark:shadow-none">
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400">
            <BookOpen className="size-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-content-muted">
              {isFull200 ? 'Điểm Reading' : 'Kỹ năng Reading'}
            </div>
            <div className="mt-0.5 text-2xl font-black text-content">
              {isFull200
                ? `${readingScore || 0} / 495`
                : `${readingResult.correct}/${readingResult.total} câu`}
            </div>
          </div>
        </div>
      )}

      {/* Card Số câu đúng */}
      <div className="surface surface-hover flex items-center gap-4 rounded-2xl border border-line bg-surface p-5 shadow-lg transition-all dark:shadow-none">
        <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
          <CheckCircle2 className="size-6" />
        </div>
        <div>
          <div className="text-xs font-bold text-content-muted">Số câu đúng</div>
          <div className="mt-0.5 text-2xl font-black text-content">
            {correctAnswers} câu ({accuracyRate}%)
          </div>
        </div>
      </div>

      {/* Card Số câu sai / Bỏ qua với điểm nhấn Rose mờ tạo cảnh báo nhẹ */}
      <div
        className={`surface surface-hover flex items-center gap-4 rounded-2xl border p-5 shadow-lg transition-all dark:shadow-none ${
          incorrectCount > 0
            ? 'border-rose-500/20 bg-rose-500/5 dark:border-rose-500/30 dark:bg-rose-950/20'
            : 'border-line bg-surface'
        }`}
      >
        <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400">
          <XCircle className="size-6" />
        </div>
        <div>
          <div className="text-xs font-bold text-content-muted">Số câu sai / Bỏ qua</div>
          <div className="mt-0.5 text-2xl font-black text-content">
            {incorrectCount} câu
          </div>
        </div>
      </div>
    </div>
  );
};
