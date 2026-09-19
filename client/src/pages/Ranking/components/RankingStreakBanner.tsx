import React from 'react';
import { Flame, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../../context/LanguageContext';

interface RankingStreakBannerProps {
  streakDays: number;
  xp?: number;
  level?: number;
}

export const RankingStreakBanner: React.FC<RankingStreakBannerProps> = ({ streakDays, xp, level }) => {
  const { language } = useLanguage();

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-amber-200/80 bg-amber-50/80 p-4 shadow-sm dark:border-amber-500/20 dark:bg-amber-500/10 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="flex min-w-0 items-center gap-3.5">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700 shadow-sm dark:bg-amber-500/20 dark:text-amber-300">
          <Flame className="size-5 fill-current" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm font-black text-slate-900 dark:text-content">
              {language === 'en' ? `Current streak: ${streakDays} days` : `Chuỗi hiện tại: ${streakDays} ngày`}
            </h2>
            {typeof xp === 'number' && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-xs font-black text-amber-700 dark:text-amber-300">
                <Zap className="size-3 text-amber-500" />
                {xp.toLocaleString('vi-VN')} XP
              </span>
            )}
            {typeof level === 'number' && (
              <span className="inline-flex items-center rounded-md bg-brand/15 border border-brand/30 px-2 py-0.5 text-xs font-black text-brand-700 dark:text-brand-300">
                Lv.{level}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-content-muted">
            {streakDays > 0
              ? (language === 'en' ? `Study today to maintain your ${streakDays}-day streak!` : `Học ngay hôm nay để giữ chuỗi ${streakDays} ngày!`)
              : (language === 'en' ? 'Complete a lesson today to build your streak!' : 'Hoàn thành bài học hôm nay để bắt đầu chuỗi tích lũy của bạn!')}
          </p>
        </div>
      </div>
      <Link
        to="/practice-by-level"
        className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-xl bg-brand px-5 text-xs font-black text-brand-ink shadow-sm transition-all hover:bg-brand-hover hover:shadow-md active:scale-95 sm:w-auto"
      >
        {language === 'en' ? 'Study Now' : 'Học ngay'}
      </Link>
    </section>
  );
};

