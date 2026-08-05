import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  BookOpenCheck,
  ChevronDown,
  Crown,
  Flame,
  GraduationCap,
  Loader2,
  Minus,
  RefreshCw,
  Trophy,
  UsersRound,
} from 'lucide-react';
import { BrandName } from '../../components/common/BrandName';
import { BoneyardSkeleton } from '../../components/common/BoneyardSkeleton';
import { useAuth } from '../../context/AuthContext';
import {
  backendService,
  LeaderboardClass,
  LeaderboardMember,
  LeaderboardResponse,
} from '../../services/backend';
import { getDiceBearAvatar } from '../../utils/avatar';

type TimeRange = 'week' | 'month' | 'all';
type RankingMetric = 'score' | 'streak' | 'lessons';

interface RankedMember extends LeaderboardMember {
  displayRank: number;
  metricValue: number;
}

const TIME_TABS: { id: TimeRange; label: string }[] = [
  { id: 'week', label: 'Tuần này' },
  { id: 'month', label: 'Tháng này' },
  { id: 'all', label: 'Mọi lúc' },
];

const METRIC_TABS: { id: RankingMetric; label: string }[] = [
  { id: 'score', label: 'Tổng điểm' },
  { id: 'streak', label: 'Chuỗi ngày học' },
  { id: 'lessons', label: 'Bài tập hoàn thành' },
];

const metricValue = (member: LeaderboardMember, metric: RankingMetric) => {
  if (metric === 'streak') return member.streakDays;
  if (metric === 'lessons') return member.completedLessons;
  return member.score;
};

const metricUnit = (metric: RankingMetric) => {
  if (metric === 'streak') return 'ngày';
  if (metric === 'lessons') return 'bài';
  return 'điểm';
};

const formatNumber = (value: number) => value.toLocaleString('vi-VN');

const formatUpdatedAt = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Vừa cập nhật';
  return `Cập nhật ${new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  }).format(date)}`;
};

const sortMembers = (
  members: LeaderboardMember[],
  metric: RankingMetric,
): RankedMember[] => [...members]
  .sort((first, second) => (
    metricValue(second, metric) - metricValue(first, metric)
    || second.score - first.score
    || first.name.localeCompare(second.name, 'vi')
  ))
  .map((member, index) => ({
    ...member,
    displayRank: index + 1,
    metricValue: metricValue(member, metric),
  }));

const RankMovement: React.FC<{ value: number }> = ({ value }) => {
  if (!value) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-slate-400">
        <Minus className="size-3" aria-hidden="true" />
        0
      </span>
    );
  }

  const increased = value > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${
        increased ? 'text-emerald-600' : 'text-rose-500'
      }`}
      aria-label={`${increased ? 'Tăng' : 'Giảm'} ${Math.abs(value)} bậc`}
    >
      {increased
        ? <ArrowUp className="size-3" aria-hidden="true" />
        : <ArrowDown className="size-3" aria-hidden="true" />}
      {Math.abs(value)}
    </span>
  );
};

export const ClassSelector: React.FC<{
  classes: LeaderboardClass[];
  value: string;
  loading: boolean;
  onChange: (classId: string) => void;
}> = ({ classes, value, loading, onChange }) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-line dark:bg-surface">
    <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
      <label className="block min-w-0">
        <span className="mb-1.5 block text-xs font-bold text-slate-500 dark:text-content-muted">
          Lớp đang xem
        </span>
        <span className="relative block min-w-0">
          <select
            value={value}
            onChange={(event) => onChange(event.target.value)}
            disabled={loading || classes.length === 0}
            className="h-11 w-full min-w-0 appearance-none truncate rounded-xl border border-slate-200 bg-slate-50 pl-3 pr-10 text-sm font-bold text-slate-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-line dark:bg-surface-elevated dark:text-content"
          >
            {classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.isOwnClass ? `Lớp của tôi: ${item.name}` : item.name}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
        </span>
      </label>

      <div className="flex min-w-0 items-center gap-2 text-xs font-semibold text-slate-500 dark:text-content-muted">
        {loading
          ? <Loader2 className="size-4 animate-spin text-brand-600" />
          : <GraduationCap className="size-4 text-brand-600" />}
        <span className="min-w-0 truncate">
          {classes.find((item) => item.id === value)?.memberCount ?? 0} học viên
        </span>
      </div>
    </div>
  </section>
);

const ScrollTabs: React.FC<{
  label: string;
  items: { id: string; label: string }[];
  value: string;
  accent?: boolean;
  onChange: (value: string) => void;
}> = ({ label, items, value, accent = false, onChange }) => (
  <div
    className="max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    role="group"
    aria-label={label}
  >
    <div className="inline-flex min-w-max rounded-xl bg-slate-100 p-1 dark:bg-surface-elevated">
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            aria-pressed={active}
            className={`flex-none whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold transition ${
              active && accent
                ? 'bg-brand text-brand-ink shadow-sm'
                : active
                  ? 'bg-white text-slate-950 shadow-sm dark:bg-surface-hover dark:text-content'
                  : 'text-slate-500 hover:text-slate-900 dark:text-content-muted dark:hover:text-white'
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  </div>
);

const PersonalStreakCard: React.FC<{ member: LeaderboardMember }> = ({ member }) => (
  <section className="grid min-w-0 gap-3 rounded-2xl border border-brand-100 bg-brand-50/70 p-4 dark:border-brand-500/20 dark:bg-brand-500/10 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-brand-600 shadow-sm dark:bg-surface dark:text-brand-300">
      <Flame className="size-5 fill-current" aria-hidden="true" />
    </span>
    <div className="min-w-0 overflow-hidden">
      <p className="truncate text-sm font-extrabold text-slate-950 dark:text-content">
        Chuỗi hiện tại: {member.streakDays} ngày
      </p>
      <p className="mt-1 truncate text-xs text-slate-600 dark:text-content-muted">
        {member.streakDays > 0
          ? `Học ngay hôm nay để giữ chuỗi ${member.streakDays} ngày!`
          : 'Hoàn thành một bài học hôm nay để bắt đầu chuỗi mới.'}
      </p>
    </div>
    <Link
      to="/mock-test"
      className="inline-flex h-9 w-full shrink-0 items-center justify-center rounded-lg bg-brand px-4 text-xs font-bold text-brand-ink transition hover:bg-brand-hover focus:outline-none focus:ring-4 focus:ring-brand-500/20 sm:w-auto"
    >
      Học ngay
    </Link>
  </section>
);

const podiumStyles: Record<number, {
  order: string;
  card: string;
  avatar: string;
  badge: string;
}> = {
  1: {
    order: 'md:order-2',
    card: 'md:min-h-[226px] border-amber-200 bg-amber-50/60 dark:border-amber-500/25 dark:bg-amber-500/5',
    avatar: 'ring-2 ring-amber-400 ring-offset-4 ring-offset-amber-50 dark:ring-offset-surface',
    badge: 'bg-amber-500 text-white',
  },
  2: {
    order: 'md:order-1',
    card: 'md:min-h-[210px] border-slate-200 bg-white dark:border-line dark:bg-surface',
    avatar: 'ring-2 ring-slate-400 ring-offset-4 ring-offset-white dark:ring-offset-surface',
    badge: 'bg-slate-500 text-white',
  },
  3: {
    order: 'md:order-3',
    card: 'md:min-h-[210px] border-slate-200 bg-white dark:border-line dark:bg-surface',
    avatar: 'ring-2 ring-orange-600 ring-offset-4 ring-offset-white dark:ring-offset-surface',
    badge: 'bg-orange-600 text-white',
  },
};

const PodiumCard: React.FC<{
  member: RankedMember;
  metric: RankingMetric;
}> = ({ member, metric }) => {
  const styles = podiumStyles[member.displayRank];
  const isWinner = member.displayRank === 1;

  return (
    <article
      className={`flex min-w-0 flex-col items-center rounded-2xl border px-4 pb-4 pt-3 text-center shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${styles.order} ${styles.card}`}
    >
      <div className="relative mx-auto mt-8 size-16 shrink-0">
        {isWinner && (
          <span className="absolute -top-9 left-1/2 z-10 grid size-7 -translate-x-1/2 place-items-center rounded-full bg-white shadow-sm dark:bg-surface-elevated">
            <Crown className="size-5 fill-amber-400 text-amber-400" aria-label="Hạng nhất" />
          </span>
        )}
        <img
          src={member.avatar || getDiceBearAvatar(member.name)}
          alt={`Ảnh đại diện của ${member.name}`}
          className={`block size-16 rounded-full object-cover ${styles.avatar}`}
        />
        <span
          className={`absolute -right-7 bottom-0 z-10 grid size-6 place-items-center rounded-full border-2 border-white text-[10px] font-black shadow-sm dark:border-surface ${styles.badge}`}
          aria-label={`Hạng ${member.displayRank}`}
        >
          #{member.displayRank}
        </span>
      </div>

      <h3
        className="mt-3 block w-full min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-sm font-extrabold text-slate-950 dark:text-content"
        title={member.name}
      >
        {member.name}
      </h3>
      <p className="mt-2 max-w-full truncate text-base font-black text-brand-600 dark:text-brand-300">
        {formatNumber(member.metricValue)}
        <span className="ml-1 text-xs font-bold text-slate-400">{metricUnit(metric)}</span>
      </p>
      <p className="mt-1 inline-flex max-w-full items-center gap-1 truncate whitespace-nowrap text-xs font-semibold text-slate-500 dark:text-content-muted">
        <Flame className="size-3.5 shrink-0 fill-current text-brand-600" />
        <span className="truncate">{member.streakDays} ngày streak</span>
      </p>
    </article>
  );
};

export const PodiumTop3: React.FC<{
  members: RankedMember[];
  metric: RankingMetric;
}> = ({ members, metric }) => (
  <section
    className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-line dark:bg-canvas/40 sm:p-5"
    aria-labelledby="podium-title"
  >
    <div className="mb-4 flex min-w-0 items-center justify-between gap-3">
      <div className="min-w-0">
        <h2 id="podium-title" className="truncate text-base font-extrabold text-slate-950 dark:text-content">
          Top 3 của lớp
        </h2>
        <p className="mt-1 truncate text-xs text-slate-500 dark:text-content-muted">
          Ba học viên dẫn đầu theo tiêu chí đang chọn
        </p>
      </div>
      <Trophy className="size-5 shrink-0 text-amber-500" aria-hidden="true" />
    </div>

    {members.length > 0 ? (
      <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-3 md:items-end">
        {members.slice(0, 3).map((member) => (
          <PodiumCard key={member.id} member={member} metric={metric} />
        ))}
      </div>
    ) : (
      <div className="grid min-h-32 place-items-center rounded-xl border border-dashed border-slate-200 bg-white/70 px-5 text-center dark:border-line dark:bg-surface/60">
        <div>
          <UsersRound className="mx-auto size-6 text-slate-400" aria-hidden="true" />
          <p className="mt-2 text-sm font-bold text-slate-700 dark:text-content">Chưa có học viên để xếp hạng</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-content-muted">Bảng top 3 sẽ xuất hiện khi lớp có dữ liệu học tập.</p>
        </div>
      </div>
    )}
  </section>
);

export const RankingRow: React.FC<{
  member: RankedMember;
  metric: RankingMetric;
  isCurrentUser: boolean;
  gapText: string;
}> = ({ member, metric, isCurrentUser, gapText }) => (
  <article
    className={`flex min-h-[68px] min-w-0 items-center gap-2 px-3 py-2.5 transition hover:bg-slate-50 dark:hover:bg-surface-hover/60 sm:gap-3 sm:px-4 ${
      isCurrentUser
        ? 'border-l-4 border-brand bg-brand-50/80 pl-2 dark:bg-brand-500/10 sm:pl-3'
        : ''
    }`}
  >
    <div className="flex w-12 shrink-0 items-center gap-1">
      <span className={`w-7 text-center text-sm font-black ${
        isCurrentUser ? 'text-brand-600' : 'text-slate-500 dark:text-content-muted'
      }`}>
        #{member.displayRank}
      </span>
      <RankMovement value={member.rankChange} />
    </div>

    <img
      src={member.avatar || getDiceBearAvatar(member.name)}
      alt={`Ảnh đại diện của ${member.name}`}
      className="size-8 shrink-0 rounded-full object-cover ring-1 ring-slate-200 dark:ring-line sm:size-10"
    />

    <div className="min-w-0 flex-1 overflow-hidden">
      <div className="flex min-w-0 items-center gap-2 overflow-hidden">
        <p
          className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-sm font-bold text-slate-950 dark:text-content"
          title={member.name}
        >
          {member.name}
        </p>
        {isCurrentUser && (
          <span className="shrink-0 rounded-md bg-brand px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-brand-ink">
            Bạn
          </span>
        )}
      </div>

      <p className="mt-1 flex max-w-full items-center gap-2 overflow-hidden whitespace-nowrap text-[10px] font-semibold text-slate-500 dark:text-content-muted sm:text-xs">
        <span className="inline-flex min-w-0 items-center gap-1">
          <Flame className="size-3 shrink-0 text-brand-600" aria-hidden="true" />
          <span className="truncate">{member.streakDays} ngày</span>
        </span>
        <span className="inline-flex min-w-0 items-center gap-1">
          <BookOpenCheck className="size-3 shrink-0 text-slate-400" aria-hidden="true" />
          <span className="truncate">{member.completedLessons} bài tập</span>
        </span>
      </p>

      {isCurrentUser && (
        <p className="mt-1 max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[10px] font-bold text-brand-600 dark:text-brand-300">
          {gapText}
        </p>
      )}
    </div>

    <div className="w-[62px] shrink-0 overflow-hidden text-right sm:w-[82px]">
      <p className="truncate text-sm font-black text-brand-600 dark:text-brand-300">
        {formatNumber(member.metricValue)}
      </p>
      <p className="truncate text-[9px] font-bold text-slate-400 sm:text-[10px]">
        {metricUnit(metric)}
      </p>
    </div>
  </article>
);

export const RankingList: React.FC<{
  members: RankedMember[];
  currentMemberId: string;
  metric: RankingMetric;
}> = ({ members, currentMemberId, metric }) => (
  <section
    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-line dark:bg-surface"
    aria-labelledby="ranking-list-title"
  >
    <div className="flex min-w-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-line">
      <div className="min-w-0">
        <h2 id="ranking-list-title" className="truncate text-base font-extrabold text-slate-950 dark:text-content">
          Thứ hạng học viên
        </h2>
        <p className="mt-1 truncate text-xs text-slate-500 dark:text-content-muted">
          {members.length} học viên trong lớp
        </p>
      </div>
      <span className="hidden shrink-0 text-xs font-semibold text-slate-400 sm:block">
        So với kỳ trước
      </span>
    </div>

    {members.length > 0 ? (
      <div className="divide-y divide-slate-100 dark:divide-line">
        {members.map((member) => {
        const isCurrentUser = member.id === currentMemberId;
        const userAbove = member.displayRank > 1
          ? members[member.displayRank - 2]
          : null;
        const difference = userAbove
          ? Math.max(0, userAbove.metricValue - member.metricValue)
          : 0;
        const gapText = userAbove
          ? `Cách hạng #${userAbove.displayRank}: ${formatNumber(difference)} ${metricUnit(metric)}`
          : 'Bạn đang dẫn đầu bảng xếp hạng';

        return (
          <RankingRow
            key={member.id}
            member={member}
            metric={metric}
            isCurrentUser={isCurrentUser}
            gapText={gapText}
          />
        );
        })}
      </div>
    ) : (
      <div className="grid min-h-40 place-items-center px-5 text-center">
        <div>
          <UsersRound className="mx-auto size-7 text-slate-300 dark:text-content-muted" aria-hidden="true" />
          <p className="mt-2 text-sm font-bold text-slate-700 dark:text-content">Lớp chưa có dữ liệu học tập</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-content-muted">Hoàn thành bài luyện tập đầu tiên để xuất hiện trên bảng.</p>
        </div>
      </div>
    )}
  </section>
);

export const ClassComparison: React.FC<{
  classes: LeaderboardClass[];
  selectedClassId: string;
}> = ({ classes, selectedClassId }) => {
  const sortedClasses = [...classes].sort((first, second) => (
    second.averageScore - first.averageScore
  ));
  const maxAverage = Math.max(1, ...sortedClasses.map((item) => item.averageScore));

  return (
    <section
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-line dark:bg-surface"
      aria-labelledby="class-ranking-title"
    >
      <div className="min-w-0 border-b border-slate-100 px-4 py-3 dark:border-line">
        <h2 id="class-ranking-title" className="truncate text-base font-extrabold text-slate-950 dark:text-content">
          Xếp hạng giữa các lớp
        </h2>
        <p className="mt-1 truncate text-xs text-slate-500 dark:text-content-muted">
          So sánh điểm trung bình để cùng nhau tiến bộ
        </p>
      </div>

      {sortedClasses.length > 0 ? (
        <div className="divide-y divide-slate-100 dark:divide-line">
          {sortedClasses.map((item, index) => {
          const selected = item.id === selectedClassId;
          return (
            <div
              key={item.id}
              className={`grid min-w-0 grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 ${
                selected ? 'bg-brand-50/70 dark:bg-brand-500/10' : ''
              }`}
            >
              <span className={`text-sm font-black ${index === 0 ? 'text-amber-500' : 'text-slate-400'}`}>
                #{index + 1}
              </span>
              <div className="min-w-0 overflow-hidden">
                <div className="flex min-w-0 items-center gap-2 overflow-hidden">
                  <p className="min-w-0 flex-1 truncate text-sm font-bold text-slate-900 dark:text-content" title={item.name}>
                    {item.name}
                  </p>
                  {item.isOwnClass && (
                    <span className="shrink-0 rounded-md bg-brand-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-brand-700 dark:bg-brand-500/20 dark:text-brand-200">
                      Lớp tôi
                    </span>
                  )}
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-surface-elevated">
                  <div
                    className="h-full rounded-full bg-brand transition-[width] duration-500"
                    style={{ width: `${Math.max(8, (item.averageScore / maxAverage) * 100)}%` }}
                  />
                </div>
              </div>
              <div className="w-[72px] shrink-0 overflow-hidden text-right">
                <p className="truncate text-sm font-black text-brand-600 dark:text-brand-300">
                  {formatNumber(item.averageScore)}
                </p>
                <p className="truncate text-[9px] font-semibold text-slate-400">
                  điểm TB
                </p>
              </div>
            </div>
          );
          })}
        </div>
      ) : (
        <div className="grid min-h-32 place-items-center px-5 text-center text-xs text-slate-500 dark:text-content-muted">
          Chưa có dữ liệu để so sánh giữa các lớp.
        </div>
      )}
    </section>
  );
};

const RankingLoadingState: React.FC = () => (
  <div className="space-y-4" aria-label="Đang tải bảng xếp hạng" aria-busy="true">
    <BoneyardSkeleton name="ranking-header" height={86} />
    <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
      <BoneyardSkeleton name="ranking-filter-1" height={40} width={270} />
      <BoneyardSkeleton name="ranking-filter-2" height={40} width={320} />
    </div>
    <BoneyardSkeleton name="ranking-banner" height={74} />
    <BoneyardSkeleton name="ranking-table" height={310} />
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.85fr)]">
      <BoneyardSkeleton name="ranking-card-1" height={360} />
      <BoneyardSkeleton name="ranking-card-2" height={260} />
    </div>
  </div>
);

const RankingErrorState: React.FC<{
  message: string;
  onRetry: () => void;
}> = ({ message, onRetry }) => (
  <section className="grid min-h-[360px] place-items-center rounded-2xl border border-rose-200 bg-white px-6 py-12 text-center shadow-sm dark:border-rose-500/20 dark:bg-surface">
    <div className="max-w-md">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
        <AlertCircle className="size-6" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-lg font-extrabold text-slate-950 dark:text-content">
        Chưa thể tải bảng xếp hạng
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-content-muted">
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-bold text-brand-ink transition hover:bg-brand-hover focus:outline-none focus:ring-4 focus:ring-brand-500/20"
      >
        <RefreshCw className="size-4" aria-hidden="true" />
        Thử tải lại
      </button>
    </div>
  </section>
);

const RankingEmptyState: React.FC = () => (
  <section className="grid min-h-[360px] place-items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center dark:border-line dark:bg-surface">
    <div className="max-w-md">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
        <UsersRound className="size-6" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-lg font-extrabold text-slate-950 dark:text-content">
        Chưa có lớp học để xếp hạng
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-content-muted">
        Khi bạn được thêm vào lớp, dữ liệu thi đua và tiến độ sẽ xuất hiện tại đây.
      </p>
    </div>
  </section>
);

const errorMessage = (error: unknown) => (
  error instanceof Error
    ? error.message
    : 'Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.'
);

export const RankingPage: React.FC = () => {
  const { user, refreshSession } = useAuth();
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [metric, setMetric] = useState<RankingMetric>('score');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    backendService.getLeaderboard(selectedClassId, timeRange)
      .then((response) => {
        if (!cancelled) setData(response);
      })
      .catch((requestError) => {
        if (!cancelled) setError(errorMessage(requestError));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [refreshKey, selectedClassId, timeRange]);

  const visibleMembers = useMemo(() => {
    if (!data) return [];
    return data.members.map((member) => (
      member.id === data.currentMemberId && user
        ? { ...member, streakDays: user.streakDays }
        : member
    ));
  }, [data, user]);

  const rankedMembers = useMemo(
    () => sortMembers(visibleMembers, metric),
    [visibleMembers, metric],
  );

  const currentMember = data ? {
    ...data.currentUser,
    streakDays: user?.streakDays ?? data.currentUser.streakDays,
  } : null;
  const selectedValue = data
    ? (isLoading && selectedClassId ? selectedClassId : data.selectedClass.id)
    : selectedClassId;
  const retry = () => setRefreshKey((current) => current + 1);

  return (
    <div className="mx-auto min-w-0 max-w-5xl space-y-4 overflow-x-hidden pb-12">
      <header className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 overflow-hidden">
          <div className="mb-2 inline-flex items-center gap-2 text-sm font-bold text-brand-600 dark:text-brand-300">
            <span className="grid size-8 place-items-center rounded-xl bg-brand-50 dark:bg-brand-500/10">
              <Trophy className="size-4" aria-hidden="true" />
            </span>
            <BrandName className="rounded-md bg-white px-1.5 shadow-sm dark:ring-1 dark:ring-white/10" />
          </div>
          <h1 className="truncate text-2xl font-extrabold tracking-tight text-slate-950 dark:text-content">
            Bảng xếp hạng
          </h1>
          <p className="mt-1.5 max-w-2xl truncate text-sm text-slate-500 dark:text-content-muted sm:whitespace-normal">
            Theo dõi tiến độ và thi đua lành mạnh cùng các học viên trong lớp.
          </p>
        </div>

        <button
          type="button"
          onClick={retry}
          disabled={isLoading}
          className={`flex shrink-0 items-center gap-2 self-start rounded-xl px-3 py-2 text-xs font-semibold transition sm:self-auto ${
            error
              ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-300'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-surface-elevated dark:text-content-muted dark:hover:bg-surface-hover'
          } disabled:cursor-wait disabled:opacity-70`}
          aria-label="Làm mới bảng xếp hạng"
        >
          {isLoading
            ? <Loader2 className="size-3.5 animate-spin text-brand-600" aria-hidden="true" />
            : error
              ? <AlertCircle className="size-3.5" aria-hidden="true" />
              : <RefreshCw className="size-3.5 text-brand-600" aria-hidden="true" />}
          <span className="whitespace-nowrap">
            {isLoading
              ? 'Đang cập nhật'
              : error
                ? 'Cập nhật thất bại'
                : data
                  ? formatUpdatedAt(data.updatedAt)
                  : 'Làm mới dữ liệu'}
          </span>
        </button>
      </header>

      {error && data && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200" role="alert">
          <div className="flex min-w-0 items-start gap-2">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p className="min-w-0 leading-relaxed">Dữ liệu mới chưa tải được. Trang đang giữ kết quả gần nhất. {error}</p>
          </div>
          <button type="button" onClick={retry} className="shrink-0 font-bold underline underline-offset-2">
            Thử lại
          </button>
        </div>
      )}

      {!data ? (
        isLoading
          ? <RankingLoadingState />
          : <RankingErrorState message={error || 'Không nhận được dữ liệu từ máy chủ.'} onRetry={retry} />
      ) : data.classes.length === 0 ? (
        <RankingEmptyState />
      ) : (
        <>
          <ClassSelector
            classes={data.classes}
            value={selectedValue}
            loading={isLoading}
            onChange={setSelectedClassId}
          />

          <section className="flex min-w-0 flex-col gap-2 lg:flex-row lg:items-center lg:justify-between" aria-label="Bộ lọc bảng xếp hạng">
            <ScrollTabs
              label="Khoảng thời gian"
              items={TIME_TABS}
              value={timeRange}
              onChange={(value) => setTimeRange(value as TimeRange)}
            />
            <ScrollTabs
              label="Tiêu chí xếp hạng"
              items={METRIC_TABS}
              value={metric}
              accent
              onChange={(value) => setMetric(value as RankingMetric)}
            />
          </section>

          {currentMember && <PersonalStreakCard member={currentMember} />}

          <PodiumTop3 members={rankedMembers} metric={metric} />

          <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.85fr)] lg:items-start">
            <RankingList
              members={rankedMembers}
              currentMemberId={data.currentMemberId}
              metric={metric}
            />
            <ClassComparison
              classes={data.classComparison}
              selectedClassId={data.selectedClass.id}
            />
          </div>
        </>
      )}
    </div>
  );
};
