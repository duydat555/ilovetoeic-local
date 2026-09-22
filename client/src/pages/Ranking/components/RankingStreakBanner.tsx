import React from 'react';
import { Flame, Zap, Target, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../../context/LanguageContext';
import type { LeaderboardMember } from '../../../services/backend';

interface RankingStreakBannerProps {
  streakDays: number;
  xp?: number;
  level?: number;
  currentRank?: number;
  totalMembers?: number;
  currentMember?: LeaderboardMember | null;
  xpToTopTen?: number;
  userAvatar?: string;
  userName?: string;
}

export const RankingStreakBanner: React.FC<RankingStreakBannerProps> = ({
  streakDays,
  xp,
  level,
  currentRank,
  totalMembers,
  xpToTopTen,
  userAvatar,
  userName,
}) => {
  const { language } = useLanguage();

  return (
    <section className="relative overflow-hidden rounded-3xl border border-line/80 bg-surface p-5 sm:p-6 shadow-xs transition hover:border-line-hover">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

        {/* Left Side: User Position & Motivation */}
        <div className="flex items-start sm:items-center gap-4 min-w-0">
          <div className="relative size-14 sm:size-16 shrink-0">
            {userAvatar ? (
              <img
                src={userAvatar}
                alt={userName || 'Avatar'}
                className="size-full rounded-2xl object-cover ring-2 ring-accent/40 bg-surface-elevated"
              />
            ) : (
              <div className="grid size-full place-items-center rounded-2xl bg-amber-500/10 text-amber-500 ring-2 ring-amber-500/30 font-black text-sm">
                <Flame className="size-6 sm:size-7 fill-current" />
              </div>
            )}

            {currentRank && currentRank > 0 && (
              <span
                className={`absolute -bottom-1 -right-1 flex items-center justify-center rounded-lg px-1.5 py-0.5 font-mono text-[10px] font-black shadow-sm ring-2 ring-surface ${
                  currentRank === 1
                    ? 'bg-amber-400 text-amber-950 font-black'
                    : currentRank === 2
                    ? 'bg-slate-300 text-slate-900 font-black'
                    : currentRank === 3
                    ? 'bg-amber-700 text-amber-50 font-black'
                    : 'bg-accent text-accent-contrast'
                }`}
                title={language === 'en' ? `Rank #${currentRank}` : `Hạng #${currentRank}`}
              >
                #{currentRank}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-content tracking-tight">
                {userName
                  ? (language === 'en' ? `Hi, ${userName}!` : `Chào ${userName}!`)
                  : (language === 'en' ? 'Your Ranking Status' : 'Vị trí của bạn')}
              </h2>

              {currentRank && currentRank > 0 && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-surface-elevated border border-line px-2 py-0.5 text-xs font-black text-content">
                  <span className="text-accent font-extrabold">
                    {language === 'en' ? `Rank #${currentRank}` : `Hạng #${currentRank}`}
                  </span>
                  {typeof totalMembers === 'number' && totalMembers > 0 && (
                    <span className="font-semibold text-content-muted">
                      / {totalMembers} {language === 'en' ? 'learners' : 'học viên'}
                    </span>
                  )}
                </span>
              )}

              {typeof level === 'number' && (
                <span className="rounded-md bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[11px] font-black text-amber-700 dark:text-amber-400">
                  Lv.{level}
                </span>
              )}
            </div>

            <p className="mt-1 text-xs text-content-muted leading-relaxed">
              {xpToTopTen && xpToTopTen > 0
                ? (language === 'en'
                    ? `You have ${xp?.toLocaleString('en-US') || 0} XP. Earn only ${xpToTopTen.toLocaleString('en-US')} more XP to enter the Top 10!`
                    : `Bạn đang có ${xp?.toLocaleString('vi-VN') || 0} XP. Chỉ cần thêm ${xpToTopTen.toLocaleString('vi-VN')} XP nữa để lọt vào Top 10 dẫn đầu!`)
                : currentRank === 1
                ? (language === 'en'
                    ? 'Outstanding! You are leading the leaderboard (#1 Champion). Keep practicing to maintain your crown!'
                    : 'Xuất sắc! Bạn đang dẫn đầu bảng xếp hạng (#1 Quán quân). Tiếp tục luyện tập để giữ vững vị thế!')
                : currentRank && currentRank <= 3
                ? (language === 'en'
                    ? `Great job! You are in the Top 3 (#${currentRank} Runner-up). Keep pushing to claim the #1 spot!`
                    : `Tuyệt vời! Bạn đang nằm trong Top 3 (#${currentRank} Á quân). Tiếp tục luyện tập để vươn lên Quán quân!`)
                : (language === 'en'
                    ? `Study today to maintain your ${streakDays}-day streak and climb higher!`
                    : `Học ngay hôm nay để giữ chuỗi ${streakDays} ngày và chinh phục thứ hạng cao hơn!`)}
            </p>
          </div>
        </div>

        {/* Right Side: Quick Metrics & CTA Button */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-line/60">
          {typeof xp === 'number' && (
            <div className="flex items-center gap-2.5 rounded-2xl bg-surface-elevated border border-line/50 px-3.5 py-2">
              <Zap className="size-4 text-amber-500 fill-amber-500 shrink-0" />
              <div>
                <div className="flex items-baseline gap-1 font-mono font-black text-content text-sm sm:text-base leading-none">
                  {xp.toLocaleString('vi-VN')}
                  <span className="font-sans text-[11px] font-extrabold text-amber-600 dark:text-amber-400">XP</span>
                </div>
                <div className="text-[10px] text-content-muted font-semibold mt-0.5">Tổng điểm</div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2.5 rounded-2xl bg-surface-elevated border border-line/50 px-3.5 py-2">
            <Flame className="size-4 text-amber-500 fill-amber-500 shrink-0" />
            <div>
              <div className="flex items-baseline gap-1 font-mono font-black text-content text-sm sm:text-base leading-none">
                {streakDays}
                <span className="font-sans text-[11px] font-extrabold text-amber-600 dark:text-amber-400">ngày</span>
              </div>
              <div className="text-[10px] text-content-muted font-semibold mt-0.5">Chuỗi học</div>
            </div>
          </div>

          <Link
            to="/practice-by-level"
            className="btn-primary min-h-10 px-5 text-xs font-black shadow-md"
          >
            <Target className="size-3.5" />
            <span>{language === 'en' ? 'Climb Rankings' : 'Luyện tập thăng hạng'}</span>
            <ArrowUpRight className="size-3.5 stroke-[2.5]" />
          </Link>
        </div>

      </div>
    </section>
  );
};
