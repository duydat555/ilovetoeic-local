import React, { useMemo } from 'react';
import { CheckCircle2, Flame, Target, UsersRound, Zap } from 'lucide-react';
import type { LeaderboardMember } from '../../../services/backend';
import { formatRankingValue, sortRankingMembers, studentFullName } from './rankingUi';
import { useLanguage } from '../../../context/LanguageContext';

interface RankingCohortSidebarProps {
  members: LeaderboardMember[];
  userCohortCode?: string | null;
}

interface CohortGroup {
  cohortCode: string;
  members: LeaderboardMember[];
  totalQuestions: number;
  streakDays: number;
  accuracyRate: number;
}

export const RankingCohortSidebar: React.FC<RankingCohortSidebarProps> = ({
  members,
  userCohortCode,
}) => {
  const { language } = useLanguage();

  const cohorts = useMemo<CohortGroup[]>(() => {
    const grouped = new Map<string, LeaderboardMember[]>();
    members.forEach((member) => {
      grouped.set(member.cohortCode, [...(grouped.get(member.cohortCode) || []), member]);
    });

    return Array.from(grouped, ([cohortCode, cohortMembers]) => {
      const rankedMembers = sortRankingMembers(cohortMembers);
      const totalQuestions = cohortMembers.reduce((sum, member) => sum + member.totalQuestions, 0);
      const correctQuestions = cohortMembers.reduce((sum, member) => sum + member.correctQuestions, 0);
      return {
        cohortCode,
        members: rankedMembers,
        totalQuestions,
        streakDays: cohortMembers.reduce((sum, member) => sum + member.streakDays, 0),
        accuracyRate: totalQuestions ? Math.round((correctQuestions * 1000) / totalQuestions) / 10 : 0,
      };
    }).sort((left, right) => (
      right.totalQuestions - left.totalQuestions
      || right.streakDays - left.streakDays
      || right.accuracyRate - left.accuracyRate
      || left.cohortCode.localeCompare(right.cohortCode, language === 'en' ? 'en' : 'vi', { numeric: true })
    ));
  }, [members, language]);

  return (
    <section className="flex flex-col rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-5">
      <div className="border-b border-line pb-3.5">
        <h2 className="text-base font-black text-content">
          {language === 'en' ? 'Inter-Class Rankings' : 'Xếp hạng giữa các khoá'}
        </h2>
        <p className="mt-1 text-xs text-content-muted">
          {language === 'en' ? 'Top 3 outstanding learners in each class' : 'Top 3 học sinh xuất sắc nhất của mỗi khoá'}
        </p>
      </div>

      <div className="mt-4 space-y-3">
        {cohorts.length === 0 && (
          <p className="rounded-xl border border-dashed border-line bg-canvas px-4 py-8 text-center text-xs font-semibold text-content-muted">
            {language === 'en' ? 'No inter-class ranking data yet.' : 'Chưa có dữ liệu xếp hạng giữa các khoá.'}
          </p>
        )}
        {cohorts.map((cohort, cohortIndex) => {
          const isOwnClass = Boolean(userCohortCode && cohort.cohortCode.toLowerCase() === userCohortCode.toLowerCase());
          return (
            <article key={cohort.cohortCode} className={`rounded-xl border p-3 ${isOwnClass ? 'border-brand bg-brand-50/50 dark:bg-brand-500/10' : 'border-line bg-canvas'}`}>
              <header className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-surface text-xs font-black text-brand-700 shadow-sm dark:text-brand-300">#{cohortIndex + 1}</span>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-black text-content">
                      {language === 'en' ? `Class ${cohort.cohortCode}` : `Khoá ${cohort.cohortCode}`}
                    </h3>
                    <p className="flex items-center gap-1 text-[10px] font-semibold text-content-muted">
                      <UsersRound className="size-3" aria-hidden="true" />
                      {cohort.members.length} {language === 'en' ? 'learners' : 'học viên'}
                    </p>
                  </div>
                </div>
                {isOwnClass && (
                  <span className="shrink-0 rounded-md bg-brand px-1.5 py-0.5 text-[9px] font-black text-brand-ink">
                    {language === 'en' ? 'MY CLASS' : 'KHOÁ TÔI'}
                  </span>
                )}
              </header>

              <ol className="mt-3 space-y-2" aria-label={`Top 3 khoá ${cohort.cohortCode}`}>
                {cohort.members.slice(0, 3).map((member, memberIndex) => (
                  <li key={member.id} className="rounded-lg bg-surface px-2.5 py-2 shadow-2xs">
                    <div className="flex min-w-0 items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="w-4 shrink-0 text-[10px] font-black text-content-muted">#{memberIndex + 1}</span>
                        <img src={member.avatar} alt="" className="size-7 shrink-0 rounded-full object-cover" />
                        <span className="truncate text-xs font-extrabold text-content" title={studentFullName(member)}>{studentFullName(member)}</span>
                      </div>
                      {Boolean(member.level) && (
                        <span className="shrink-0 rounded bg-amber-500/15 border border-amber-500/30 px-1 py-0.2 text-[9px] font-black text-amber-700 dark:text-amber-400">
                          Lv.{member.level}
                        </span>
                      )}
                    </div>
                    <dl className="mt-2 grid grid-cols-2 gap-1.5 pl-6 text-[9px] text-content-muted">
                      <div className="flex items-center gap-1"><Zap className="size-3 text-amber-500" aria-hidden="true" /><span className="font-bold tabular-nums text-amber-600 dark:text-amber-400">{(member.xp || 0).toLocaleString('vi-VN')} XP</span></div>
                      <div className="flex items-center justify-end gap-1"><Flame className="size-3 text-amber-500" aria-hidden="true" /><span className="font-bold tabular-nums text-content">{formatRankingValue(member, 'streakDays')}</span></div>
                      <div className="flex items-center gap-1"><CheckCircle2 className="size-3 text-brand-600 dark:text-brand-300" aria-hidden="true" /><span className="font-bold tabular-nums text-content">{formatRankingValue(member, 'totalQuestions')}</span></div>
                      <div className="flex items-center justify-end gap-1"><Target className="size-3" aria-hidden="true" /><span className="font-bold tabular-nums text-content">{formatRankingValue(member, 'accuracyRate')}</span></div>
                    </dl>
                  </li>
                ))}
              </ol>
            </article>
          );
        })}
      </div>
    </section>
  );
};
