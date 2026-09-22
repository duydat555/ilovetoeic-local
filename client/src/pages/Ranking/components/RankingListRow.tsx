import React from 'react';
import { CheckCircle2, Flame, Target, Zap } from 'lucide-react';
import type { LeaderboardMember } from '../../../services/backend';
import { formatRankingValue, studentFullName } from './rankingUi';
import { useLanguage } from '../../../context/LanguageContext';

interface RankingListRowProps {
  member: LeaderboardMember;
  rank: number;
  isCurrent: boolean;
}

export const RankingListRow: React.FC<RankingListRowProps> = ({
  member,
  rank,
  isCurrent,
}) => {
  const { language } = useLanguage();

  return (
    <article
      className={`group flex flex-col items-stretch gap-3 rounded-xl border p-3 transition-all duration-150 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4 ${
        isCurrent
          ? 'border-brand bg-brand-50/60 shadow-sm dark:bg-brand-500/10'
          : 'border-line bg-surface hover:bg-surface-hover/70'
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex w-11 shrink-0 items-center sm:w-14">
          <span className={`text-xs font-black text-content-muted sm:text-sm`}>#{rank}</span>
        </div>

        {/* Avatar */}
        <img
          src={member.avatar}
          alt=""
          className="size-10 shrink-0 rounded-full bg-canvas object-cover sm:size-11"
        />

        {/* Name & Metadata */}
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="truncate text-sm font-extrabold text-content">
              {studentFullName(member)}
            </h3>

            {member.level && (
              <span className="shrink-0 rounded-md bg-brand-500/10 px-1.5 py-0.5 text-[10px] font-black text-brand-600 dark:text-brand-400">
                Lv.{member.level}
              </span>
            )}

            {rank === 1 && (
              <span className="shrink-0 rounded-md bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[9px] font-black text-amber-700 dark:text-amber-400">
                {language === 'en' ? 'CHAMPION' : 'QUÁN QUÂN'}
              </span>
            )}
            {rank === 2 && (
              <span className="shrink-0 rounded-md bg-slate-300/30 border border-slate-400/30 px-1.5 py-0.5 text-[9px] font-black text-slate-700 dark:text-slate-300">
                {language === 'en' ? 'RUNNER-UP 1' : 'Á QUÂN 1'}
              </span>
            )}
            {rank === 3 && (
              <span className="shrink-0 rounded-md bg-orange-500/15 border border-orange-500/30 px-1.5 py-0.5 text-[9px] font-black text-orange-700 dark:text-orange-400">
                {language === 'en' ? 'RUNNER-UP 2' : 'Á QUÂN 2'}
              </span>
            )}

            {isCurrent && (
              <span className="shrink-0 rounded-md bg-brand px-1.5 py-0.5 text-[10px] font-black text-brand-ink">
                {language === 'en' ? 'YOU' : 'BẠN'}
              </span>
            )}
          </div>

          <p className="mt-0.5 text-xs font-semibold text-content-muted">
            {language === 'en' ? `Class ${member.cohortCode}` : `Khoá ${member.cohortCode}`}
          </p>
        </div>
      </div>

      <dl className="grid w-full shrink-0 grid-cols-2 gap-2 border-t border-line/80 pt-2 text-right sm:w-auto sm:grid-cols-4 sm:gap-4 sm:border-0 sm:pt-0">
        <div>
          <dt className="flex items-center justify-end gap-1 text-[10px] font-semibold text-content-muted">
            <Zap className="size-3 text-amber-500" aria-hidden="true" />
            <span>{language === 'en' ? 'XP' : 'Điểm XP'}</span>
          </dt>
          <dd className="mt-0.5 text-xs font-black tabular-nums text-amber-600 dark:text-amber-400 sm:text-sm">
            {(member.xp || 0).toLocaleString('vi-VN')} XP
          </dd>
        </div>
        <div>
          <dt className="flex items-center justify-end gap-1 text-[10px] font-semibold text-content-muted">
            <Flame className="size-3 text-amber-500" aria-hidden="true" />
            <span>{language === 'en' ? 'Streak' : 'Chuỗi'}</span>
          </dt>
          <dd className="mt-0.5 text-xs font-black tabular-nums text-content sm:text-sm">{formatRankingValue(member, 'streakDays')}</dd>
        </div>
        <div>
          <dt className="flex items-center justify-end gap-1 text-[10px] font-semibold text-content-muted">
            <CheckCircle2 className="size-3 text-brand-600 dark:text-brand-300" aria-hidden="true" />
            <span>{language === 'en' ? 'Solved' : 'Đã làm'}</span>
          </dt>
          <dd className="mt-0.5 text-xs font-black tabular-nums text-content sm:text-sm">{formatRankingValue(member, 'totalQuestions')}</dd>
        </div>
        <div>
          <dt className="flex items-center justify-end gap-1 text-[10px] font-semibold text-content-muted">
            <Target className="size-3" aria-hidden="true" />
            <span>{language === 'en' ? 'Accuracy' : 'Chính xác'}</span>
          </dt>
          <dd className="mt-0.5 text-xs font-black tabular-nums text-content sm:text-sm">{formatRankingValue(member, 'accuracyRate')}</dd>
        </div>
      </dl>
    </article>
  );
};
