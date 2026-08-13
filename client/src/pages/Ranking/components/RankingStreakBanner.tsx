import React from 'react';
import { Flame } from 'lucide-react';
import { Link } from 'react-router-dom';

interface RankingStreakBannerProps { streakDays: number; }

export const RankingStreakBanner: React.FC<RankingStreakBannerProps> = ({ streakDays }) => (
  <section className="flex flex-col gap-4 rounded-2xl border border-amber-200/80 bg-amber-50/80 p-4 shadow-sm dark:border-amber-500/20 dark:bg-amber-500/10 sm:flex-row sm:items-center sm:justify-between sm:p-5">
    <div className="flex min-w-0 items-center gap-3.5">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700 shadow-sm dark:bg-amber-500/20 dark:text-amber-300">
        <Flame className="size-5 fill-current" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <h2 className="text-sm font-black text-slate-900 dark:text-content">
          Chuỗi hiện tại: {streakDays.toLocaleString('vi-VN')} ngày
        </h2>
        <p className="mt-0.5 text-xs text-slate-600 dark:text-content-muted">
          {streakDays > 0
            ? `Học ngay hôm nay để giữ chuỗi ${streakDays} ngày!`
            : 'Hoàn thành bài học hôm nay để bắt đầu chuỗi tích lũy của bạn!'}
        </p>
      </div>
    </div>
    <Link
      to="/practice-by-level"
      className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-xl bg-brand px-5 text-xs font-black text-brand-ink shadow-sm transition-all hover:bg-brand-hover hover:shadow-md active:scale-95 sm:w-auto"
    >
      Học ngay
    </Link>
  </section>
);

