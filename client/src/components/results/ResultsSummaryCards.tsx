import React from 'react';
import { BookOpen, CheckCircle2, Clock, Headphones, XCircle } from 'lucide-react';
import { formatDurationVietnamese } from './ResultsHeader';

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
  timeSpentSeconds?: number;
}

export const ResultsSummaryCards: React.FC<ResultsSummaryCardsProps> = ({
  hasListening,
  hasReading,
  isPartial,
  listeningResult,
  readingResult,
  listeningScore = 0,
  readingScore = 0,
  correctAnswers,
  wrongAnswers,
  skippedAnswers,
  accuracyRate,
  totalQuestions,
  timeSpentSeconds,
}) => {
  const isFull200 = !isPartial && totalQuestions === 200;

  const listeningPercent =
    listeningResult.total > 0
      ? Math.round((listeningResult.correct / listeningResult.total) * 100)
      : 0;

  const readingPercent =
    readingResult.total > 0
      ? Math.round((readingResult.correct / readingResult.total) * 100)
      : 0;

  const avgSecondsPerQuestion =
    timeSpentSeconds && totalQuestions > 0
      ? Math.max(1, Math.round(timeSpentSeconds / totalQuestions))
      : 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. Kỹ năng Nghe (Listening) */}
      {hasListening ? (
        <div className="group rounded-2xl border border-line bg-surface p-5 shadow-xs transition-all hover:border-amber-400/40 hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-content-muted">Kỹ năng Nghe (Listening)</span>
            <div className="grid size-9 place-items-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Headphones className="size-4.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black tracking-tight text-content tabular-nums">
              {isFull200 ? `${listeningScore} / 495` : `${listeningResult.correct}/${listeningResult.total}`}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs font-semibold text-content-muted">
              <span>{isFull200 ? 'Điểm thang ETS' : 'Số câu nghe đúng'}</span>
              <span className="font-extrabold text-amber-600 dark:text-amber-400">
                {listeningPercent}% chính xác
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-line/60 bg-surface/50 p-5 text-center text-xs font-medium text-content-muted">
          Không bao gồm phần Listening
        </div>
      )}

      {/* 2. Kỹ năng Đọc (Reading) */}
      {hasReading ? (
        <div className="group rounded-2xl border border-line bg-surface p-5 shadow-xs transition-all hover:border-sky-400/40 hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-content-muted">Kỹ năng Đọc (Reading)</span>
            <div className="grid size-9 place-items-center rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400">
              <BookOpen className="size-4.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black tracking-tight text-content tabular-nums">
              {isFull200 ? `${readingScore} / 495` : `${readingResult.correct}/${readingResult.total}`}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs font-semibold text-content-muted">
              <span>{isFull200 ? 'Điểm thang ETS' : 'Số câu đọc đúng'}</span>
              <span className="font-extrabold text-sky-600 dark:text-sky-400">
                {readingPercent}% chính xác
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-line/60 bg-surface/50 p-5 text-center text-xs font-medium text-content-muted">
          Không bao gồm phần Reading
        </div>
      )}

      {/* 3. Tỷ lệ chính xác & Chi tiết câu đúng/sai */}
      <div className="group rounded-2xl border border-line bg-surface p-5 shadow-xs transition-all hover:border-emerald-400/40 hover:shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-content-muted">Tỷ lệ chính xác</span>
          <div className="grid size-9 place-items-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-4.5" />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-content tabular-nums">
              {correctAnswers} / {totalQuestions}
            </span>
            <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
              ({accuracyRate}%)
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
            <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-emerald-700 dark:text-emerald-300">
              ✓ Đúng: {correctAnswers}
            </span>
            <span className="rounded-md bg-rose-500/10 px-1.5 py-0.5 text-rose-700 dark:text-rose-300">
              ✗ Sai: {wrongAnswers}
            </span>
            {skippedAnswers > 0 && (
              <span className="rounded-md bg-slate-500/10 px-1.5 py-0.5 text-slate-600 dark:text-slate-400">
                — Bỏ qua: {skippedAnswers}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 4. Thời gian làm bài & Tốc độ xử lý */}
      <div className="group rounded-2xl border border-line bg-surface p-5 shadow-xs transition-all hover:border-amber-400/40 hover:shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-content-muted">Thời gian hoàn thành</span>
          <div className="grid size-9 place-items-center rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300">
            <Clock className="size-4.5" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-black tracking-tight text-content tabular-nums">
            {formatDurationVietnamese(timeSpentSeconds)}
          </div>
          <div className="mt-1 flex items-center justify-between text-xs font-semibold text-content-muted">
            <span>Tốc độ trung bình:</span>
            {avgSecondsPerQuestion > 0 ? (
              <span className="font-extrabold text-content">
                ~{avgSecondsPerQuestion} giây / câu
              </span>
            ) : (
              <span className="text-content-muted">Chuẩn format</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

