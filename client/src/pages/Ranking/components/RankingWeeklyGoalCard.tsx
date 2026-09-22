import React from 'react';
import { Target, Zap, Flame, ArrowUpRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../../context/LanguageContext';

interface RankingWeeklyGoalCardProps {
  userQuestions?: number;
  streakDays?: number;
  xp?: number;
}

export const RankingWeeklyGoalCard: React.FC<RankingWeeklyGoalCardProps> = ({
  userQuestions = 0,
  streakDays = 0,
  xp = 0,
}) => {
  const { language } = useLanguage();

  const weeklyTarget = 100;
  const currentWeeklyQuestions = Math.min(userQuestions, weeklyTarget);
  const progressPercent = Math.min(100, Math.round((currentWeeklyQuestions / weeklyTarget) * 100));

  return (
    <article className="flex flex-col rounded-2xl border border-line bg-surface p-4 sm:p-5 shadow-xs">
      <header className="flex items-center justify-between border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <div className="grid size-7 place-items-center rounded-lg bg-accent/15 text-accent-strong">
            <Target className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-content">
              {language === 'en' ? 'Weekly Milestone' : 'Mục Tiêu Tuần Này'}
            </h3>
            <p className="text-[10px] font-semibold text-content-muted">
              {language === 'en' ? 'Complete questions to boost XP' : 'Luyện tập để leo hạng thần tốc'}
            </p>
          </div>
        </div>
        <span className="rounded-full bg-surface-elevated border border-line px-2 py-0.5 text-[10px] font-extrabold text-content-muted">
          {progressPercent}%
        </span>
      </header>

      <div className="mt-3.5 space-y-3">
        {/* Progress Bar */}
        <div>
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-content-muted">
              {language === 'en' ? 'Solved questions' : 'Số câu đã làm'}
            </span>
            <span className="font-mono text-content">
              {currentWeeklyQuestions} / {weeklyTarget}
            </span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-surface-elevated">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
              style={{ width: `${Math.max(6, progressPercent)}%` }}
            />
          </div>
        </div>

        {/* Tips / Reward Callout */}
        <div className="rounded-xl bg-accent/10 border border-accent/20 p-2.5 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-accent-strong">
            <Sparkles className="size-3.5" />
            <span>{language === 'en' ? 'Weekly XP Bonus' : 'Thưởng Thăng Hạng'}</span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-content-muted">
            {language === 'en'
              ? 'Maintain your streak every day to multiply your practice XP by 1.5x!'
              : `Duy trì chuỗi học ${streakDays} ngày liên tiếp để nhân thêm 1.5x XP thưởng mỗi bài test!`}
          </p>
        </div>

        {/* Quick Practice Link */}
        <Link
          to="/practice-by-level"
          className="inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-surface-elevated border border-line text-xs font-black text-content transition hover:bg-surface-hover hover:border-line-hover active:scale-98"
        >
          <Zap className="size-3.5 text-amber-500 fill-amber-500" />
          <span>{language === 'en' ? 'Practice Now to Rank Up' : 'Luyện Đề Tích Điểm Ngay'}</span>
          <ArrowUpRight className="size-3.5" />
        </Link>
      </div>
    </article>
  );
};
