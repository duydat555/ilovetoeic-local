import React from 'react';
import { CheckCircle2, Crown, Flame, Sparkles, Target, Trophy } from 'lucide-react';
import type { LeaderboardMember } from '../../../services/backend';
import { formatRankingValue, studentFullName } from './rankingUi';

interface RankingPodiumProps {
  members: LeaderboardMember[];
  title?: string;
}

const podiumStyles = {
  1: {
    order: 'order-1 md:order-2',
    ring: 'ring-2 ring-amber-400 ring-offset-4 ring-offset-amber-50 dark:ring-offset-surface',
    badge: 'bg-amber-500 text-white',
    card: 'md:min-h-[220px] border-amber-200 bg-amber-50/60 dark:border-amber-500/25 dark:bg-amber-500/5',
  },
  2: {
    order: 'order-2 md:order-1',
    ring: 'ring-2 ring-slate-400 ring-offset-4 ring-offset-white dark:ring-offset-surface',
    badge: 'bg-slate-500 text-white',
    card: 'md:min-h-[200px] border-line bg-surface',
  },
  3: {
    order: 'order-3',
    ring: 'ring-2 ring-orange-500 ring-offset-4 ring-offset-white dark:ring-offset-surface',
    badge: 'bg-orange-500 text-white',
    card: 'md:min-h-[200px] border-line bg-surface',
  },
} as const;

const PodiumCard: React.FC<{
  rank: 1 | 2 | 3;
  member?: LeaderboardMember;
}> = ({ rank, member }) => {
  const styles = podiumStyles[rank];
  const isWinner = rank === 1;

  return (
    <article
      className={`flex min-w-0 flex-col items-center rounded-2xl border p-4 text-center shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md ${styles.order} ${styles.card}`}
    >
      {member ? (
        <>
          <div className="relative mt-2">
            {isWinner && (
              <span className="absolute -top-7 left-1/2 z-10 grid size-7 -translate-x-1/2 place-items-center rounded-full bg-white shadow-sm dark:bg-surface-elevated">
                <Crown className="size-5 fill-amber-400 text-amber-400" aria-label="Hạng nhất" />
              </span>
            )}
            <img
              src={member.avatar}
              alt=""
              className={`size-16 rounded-full object-cover sm:size-18 ${styles.ring}`}
            />
            <span
              className={`absolute -right-2 bottom-0 z-10 grid size-6 place-items-center rounded-full border-2 border-white text-[10px] font-black shadow-sm dark:border-surface ${styles.badge}`}
            >
              #{rank}
            </span>
          </div>

          <h3
            className="mt-3 w-full truncate text-sm font-extrabold text-content sm:text-base"
            title={studentFullName(member)}
          >
            {studentFullName(member)}
          </h3>
          <p className="mt-0.5 text-[11px] font-semibold text-content-muted">Khoá {member.cohortCode}</p>

          <dl className="mt-3 grid w-full grid-cols-3 gap-1 border-t border-line/80 pt-3">
            <div className="min-w-0">
              <dt className="flex items-center justify-center gap-1 text-[10px] font-semibold text-content-muted">
                <Flame className="size-3 text-amber-500" aria-hidden="true" /> Chuỗi
              </dt>
              <dd className="mt-1 text-xs font-black tabular-nums text-content">{formatRankingValue(member, 'streakDays')}</dd>
            </div>
            <div className="min-w-0 border-x border-line/80 px-1">
              <dt className="flex items-center justify-center gap-1 text-[10px] font-semibold text-content-muted">
                <CheckCircle2 className="size-3 text-brand-600 dark:text-brand-300" aria-hidden="true" /> Đã làm
              </dt>
              <dd className="mt-1 text-xs font-black tabular-nums text-content">{formatRankingValue(member, 'totalQuestions')}</dd>
            </div>
            <div className="min-w-0">
              <dt className="flex items-center justify-center gap-1 text-[10px] font-semibold text-content-muted">
                <Target className="size-3 text-content-muted" aria-hidden="true" /> Chính xác
              </dt>
              <dd className="mt-1 text-xs font-black tabular-nums text-content">{formatRankingValue(member, 'accuracyRate')}</dd>
            </div>
          </dl>
        </>
      ) : (
        <div className="flex min-h-36 flex-col items-center justify-center p-2 text-center">
          <span className="grid size-12 place-items-center rounded-full border border-dashed border-line bg-canvas">
            <Sparkles className="size-5 text-content-muted" aria-hidden="true" />
          </span>
          <p className="mt-3 text-xs font-bold text-content">Chưa có học viên</p>
          <p className="mt-0.5 text-[11px] text-content-muted">Học tập để xuất hiện ở đây</p>
        </div>
      )}
    </article>
  );
};

export const RankingPodium: React.FC<RankingPodiumProps> = ({ members, title = 'Top 3 của khoá' }) => (
  <section className="rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-5">
    <div className="mb-4 flex items-center justify-between gap-3">
      <div>
        <h2 className="text-base font-black text-content sm:text-lg">{title}</h2>
        <p className="mt-0.5 text-xs text-content-muted">Ba học viên dẫn đầu theo tổng số câu đã làm</p>
      </div>
      <span className="grid size-9 place-items-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300">
        <Trophy className="size-5" aria-hidden="true" />
      </span>
    </div>

    <div className="grid grid-cols-1 items-end gap-3.5 md:grid-cols-3">
      <PodiumCard rank={2} member={members[1]} />
      <PodiumCard rank={1} member={members[0]} />
      <PodiumCard rank={3} member={members[2]} />
    </div>
  </section>
);
