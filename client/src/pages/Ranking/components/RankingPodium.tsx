import React from 'react';
import { motion } from 'framer-motion';
import { Award, CheckCircle2, Crown, Flame, Medal, Target, Trophy, Zap } from 'lucide-react';
import type { LeaderboardMember } from '../../../services/backend';
import { formatRankingValue, studentFullName } from './rankingUi';
import { RankingPodiumSkeleton } from './RankingPageSkeleton';
import { useLanguage } from '../../../context/LanguageContext';

interface RankingPodiumProps {
  members: LeaderboardMember[];
  title?: string;
  currentUserId?: string;
  loading?: boolean;
}

interface TierConfig {
  label: string;
  labelEn: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  cardBg: string;
  cardBorder: string;
  cardGlow: string;
  avatarRing: string;
  avatarAura: string;
  orderClass: string;
  pedestalHeight: string;
  pedestalBg: string;
  pedestalBorder: string;
  pedestalText: string;
  delay: number;
}

const TIER_CONFIGS: Record<1 | 2 | 3, TierConfig> = {
  1: {
    label: '#1 QUÁN QUÂN',
    labelEn: '#1 CHAMPION',
    badgeBg: 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500',
    badgeBorder: 'border-amber-200/90 dark:border-amber-300/40',
    badgeText: 'text-amber-950 font-black',
    cardBg: 'bg-gradient-to-b from-amber-500/12 via-amber-500/4 to-surface dark:from-amber-500/18 dark:via-amber-500/5 dark:to-surface',
    cardBorder: 'border-2 border-amber-300/80 dark:border-amber-500/40',
    cardGlow: 'shadow-[0_16px_40px_-10px_rgba(245,158,11,0.28)] ring-1 ring-amber-400/30',
    avatarRing: 'ring-4 ring-amber-400 dark:ring-amber-300 ring-offset-4 ring-offset-surface shadow-[0_0_24px_rgba(245,158,11,0.45)]',
    avatarAura: 'from-amber-400/30 to-yellow-300/40',
    orderClass: 'order-1 md:order-2',
    pedestalHeight: 'h-16 md:h-20',
    pedestalBg: 'bg-gradient-to-t from-amber-500/25 via-amber-400/15 to-amber-300/10 dark:from-amber-500/30 dark:via-amber-500/15 dark:to-transparent',
    pedestalBorder: 'border-t-2 border-amber-400/80 dark:border-amber-400/50',
    pedestalText: 'text-amber-600/70 dark:text-amber-300/70',
    delay: 0.15,
  },
  2: {
    label: '#2 Á QUÂN 1',
    labelEn: '#2 RUNNER-UP 1',
    badgeBg: 'bg-gradient-to-r from-slate-400 via-slate-300 to-slate-400',
    badgeBorder: 'border-slate-200 dark:border-slate-400/40',
    badgeText: 'text-slate-900 font-black',
    cardBg: 'bg-gradient-to-b from-slate-200/40 via-slate-100/20 to-surface dark:from-slate-700/20 dark:via-slate-800/10 dark:to-surface',
    cardBorder: 'border border-slate-300 dark:border-slate-600/50',
    cardGlow: 'shadow-[0_10px_28px_-6px_rgba(148,163,184,0.22)]',
    avatarRing: 'ring-4 ring-slate-300 dark:ring-slate-400 ring-offset-3 ring-offset-surface shadow-[0_0_18px_rgba(148,163,184,0.3)]',
    avatarAura: 'from-slate-300/30 to-slate-200/30',
    orderClass: 'order-2 md:order-1',
    pedestalHeight: 'h-12 md:h-14',
    pedestalBg: 'bg-gradient-to-t from-slate-400/20 via-slate-300/10 to-transparent dark:from-slate-600/25 dark:via-slate-600/10 dark:to-transparent',
    pedestalBorder: 'border-t-2 border-slate-300 dark:border-slate-500',
    pedestalText: 'text-slate-500/70 dark:text-slate-400/70',
    delay: 0.05,
  },
  3: {
    label: '#3 Á QUÂN 2',
    labelEn: '#3 RUNNER-UP 2',
    badgeBg: 'bg-gradient-to-r from-amber-700 via-orange-600 to-amber-700',
    badgeBorder: 'border-amber-600/60 dark:border-amber-600/40',
    badgeText: 'text-amber-50 font-black',
    cardBg: 'bg-gradient-to-b from-orange-200/30 via-orange-100/15 to-surface dark:from-orange-950/20 dark:via-amber-900/10 dark:to-surface',
    cardBorder: 'border border-orange-200/90 dark:border-orange-800/40',
    cardGlow: 'shadow-[0_10px_28px_-6px_rgba(217,119,6,0.18)]',
    avatarRing: 'ring-4 ring-orange-400 dark:ring-orange-600/70 ring-offset-3 ring-offset-surface shadow-[0_0_18px_rgba(217,119,6,0.25)]',
    avatarAura: 'from-orange-400/20 to-amber-600/20',
    orderClass: 'order-3 md:order-3',
    pedestalHeight: 'h-9 md:h-10',
    pedestalBg: 'bg-gradient-to-t from-orange-600/20 via-orange-500/10 to-transparent dark:from-orange-800/25 dark:via-orange-800/10 dark:to-transparent',
    pedestalBorder: 'border-t-2 border-orange-300 dark:border-orange-700/60',
    pedestalText: 'text-orange-600/70 dark:text-orange-400/70',
    delay: 0.25,
  },
};

const PodiumCard: React.FC<{
  rank: 1 | 2 | 3;
  member?: LeaderboardMember;
  isCurrent?: boolean;
}> = ({ rank, member, isCurrent = false }) => {
  const { language } = useLanguage();
  const config = TIER_CONFIGS[rank];
  const isWinner = rank === 1;

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.45,
        delay: config.delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className={`group relative flex flex-col justify-between rounded-3xl p-4 sm:p-5 transition-all duration-300 ${config.orderClass} ${config.cardBg} ${config.cardBorder} ${config.cardGlow}`}
    >
      {/* Top Banner Tag */}
      <div className="flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-[11px] shadow-sm uppercase tracking-wider border ${config.badgeBg} ${config.badgeBorder} ${config.badgeText}`}
        >
          {isWinner ? (
            <Crown className="size-3.5 fill-amber-950 text-amber-950" />
          ) : rank === 2 ? (
            <Medal className="size-3.5 text-slate-900" />
          ) : (
            <Award className="size-3.5 text-amber-50" />
          )}
          <span>{language === 'en' ? config.labelEn : config.label}</span>
        </span>

        {isCurrent && (
          <span className="rounded-md bg-brand px-2 py-0.5 text-[10px] font-black text-brand-ink uppercase shadow-sm animate-pulse">
            {language === 'en' ? 'YOU' : 'BẠN'}
          </span>
        )}
      </div>

      {member ? (
        <div className="mt-4 flex flex-col items-center text-center">
          {/* Avatar Section */}
          <div className="relative mt-2">
            {isWinner && (
              <div className="absolute -top-7 left-1/2 z-20 -translate-x-1/2 flex items-center justify-center">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-amber-400/50 blur-md animate-pulse" />
                  <div className="relative grid size-8 place-items-center rounded-full bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 text-amber-950 shadow-md shadow-amber-500/30 border border-yellow-200">
                    <Crown className="size-4.5 fill-amber-950 text-amber-950" />
                  </div>
                </div>
              </div>
            )}

            <div className={`relative mx-auto ${isWinner ? 'size-20 sm:size-22' : 'size-16 sm:size-18'}`}>
              <div
                className={`absolute inset-0 rounded-full bg-gradient-to-tr ${config.avatarAura} blur-md transition-transform duration-300 group-hover:scale-110`}
              />
              <img
                src={member.avatar}
                alt={studentFullName(member)}
                className={`relative size-full rounded-full object-cover bg-surface ${config.avatarRing}`}
              />
            </div>
          </div>

          {/* Student Name & Cohort */}
          <div className="mt-3.5 flex items-center justify-center gap-1.5 w-full">
            <h3
              className={`truncate font-black text-content tracking-tight ${
                isWinner ? 'text-base sm:text-lg' : 'text-sm sm:text-base'
              }`}
              title={studentFullName(member)}
            >
              {studentFullName(member)}
            </h3>
            {Boolean(member.level) && (
              <span className="shrink-0 rounded-md bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-black text-amber-700 dark:text-amber-400">
                Lv.{member.level}
              </span>
            )}
          </div>
          <p className="mt-0.5 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold text-content-muted">
            Khoá {member.cohortCode}
          </p>

          {/* Primary Achievement Hero Metric */}
          <div
            className={`mt-3 w-full rounded-2xl border p-2.5 sm:p-3 text-center transition-colors ${
              isWinner
                ? 'border-amber-300/50 bg-amber-500/10 dark:border-amber-500/30 dark:bg-amber-500/15'
                : rank === 2
                ? 'border-slate-300/50 bg-slate-200/20 dark:border-slate-600/30 dark:bg-slate-700/20'
                : 'border-orange-300/50 bg-orange-500/10 dark:border-orange-800/30 dark:bg-orange-950/20'
            }`}
          >
            <div className="flex items-center justify-center gap-1 text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-content-muted">
              <Zap
                className={`size-3.5 ${
                  isWinner
                    ? 'text-amber-600 dark:text-amber-400'
                    : rank === 2
                    ? 'text-slate-600 dark:text-slate-300'
                    : 'text-orange-600 dark:text-orange-400'
                }`}
              />
              <span>{language === 'en' ? 'XP Points' : 'Điểm XP'}</span>
            </div>
            <div
              className={`mt-0.5 font-black tabular-nums tracking-tight ${
                isWinner
                  ? 'text-xl sm:text-2xl text-amber-900 dark:text-amber-100'
                  : rank === 2
                  ? 'text-lg sm:text-xl text-slate-800 dark:text-slate-100'
                  : 'text-lg sm:text-xl text-orange-900 dark:text-orange-100'
              }`}
            >
              {formatRankingValue(member, 'xp')}
            </div>
          </div>

          {/* Secondary Sub-metrics */}
          <div className="mt-2.5 grid w-full grid-cols-3 gap-1.5">
            <div className="flex flex-col items-center justify-center rounded-xl border border-line/60 bg-surface/80 dark:bg-surface/50 px-1 py-1.5 shadow-2xs">
              <div className="flex items-center gap-1 text-[10px] font-bold text-content-muted">
                <CheckCircle2 className="size-3 text-brand-600 dark:text-brand-300 shrink-0" aria-hidden="true" />
                <span>{language === 'en' ? 'Solved' : 'Đã làm'}</span>
              </div>
              <span className="text-xs font-black tabular-nums text-content mt-0.5">
                {formatRankingValue(member, 'totalQuestions')}
              </span>
            </div>
            <div className="flex flex-col items-center justify-center rounded-xl border border-line/60 bg-surface/80 dark:bg-surface/50 px-1 py-1.5 shadow-2xs">
              <div className="flex items-center gap-1 text-[10px] font-bold text-content-muted">
                <Flame className="size-3 text-amber-500 shrink-0" aria-hidden="true" />
                <span>{language === 'en' ? 'Streak' : 'Chuỗi'}</span>
              </div>
              <span className="text-xs font-black tabular-nums text-content mt-0.5">
                {formatRankingValue(member, 'streakDays')}
              </span>
            </div>
            <div className="flex flex-col items-center justify-center rounded-xl border border-line/60 bg-surface/80 dark:bg-surface/50 px-1 py-1.5 shadow-2xs">
              <div className="flex items-center gap-1 text-[10px] font-bold text-content-muted">
                <Target className="size-3 text-emerald-500 shrink-0" aria-hidden="true" />
                <span>{language === 'en' ? 'Acc' : 'Đúng'}</span>
              </div>
              <span className="text-xs font-black tabular-nums text-content mt-0.5">
                {formatRankingValue(member, 'accuracyRate')}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="my-8 flex flex-col items-center justify-center text-center">
          <span className="grid size-14 place-items-center rounded-2xl border border-dashed border-line bg-canvas">
            <Medal className="size-6 text-content-muted" aria-hidden="true" />
          </span>
          <p className="mt-3 text-xs font-bold text-content">{language === 'en' ? 'Spot awaits you' : 'Vị trí đang chờ bạn'}</p>
          <p className="mt-0.5 text-[11px] text-content-muted">
            {language === 'en' ? 'Practice now to climb onto the podium!' : 'Luyện tập ngay để bước lên bục vinh quang!'}
          </p>
        </div>
      )}

      {/* 3D Tiered Podium Pedestal Step (Physical Elevation Block) */}
      <div
        className={`hidden md:flex mt-4 w-full rounded-2xl ${config.pedestalHeight} ${config.pedestalBg} ${config.pedestalBorder} items-center justify-center relative overflow-hidden shadow-inner`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/10 to-transparent pointer-events-none" />
        <span className={`text-3xl font-black ${config.pedestalText} tracking-tighter select-none`}>
          {rank}
        </span>
      </div>
    </motion.article>
  );
};

export const RankingPodium: React.FC<RankingPodiumProps> = ({
  members,
  title,
  currentUserId,
  loading = false,
}) => {
  const { language } = useLanguage();

  if (loading) {
    return <RankingPodiumSkeleton />;
  }

  const defaultTitle = language === 'en' ? 'Top 3 Champions' : 'Top 3 Chiến Binh Dẫn Đầu';
  const displayTitle = title || defaultTitle;
  const first = members[0];
  const second = members[1];
  const third = members[2];

  return (
    <section className="relative overflow-hidden rounded-3xl border border-line bg-surface/90 backdrop-blur-xs p-5 sm:p-7 shadow-sm">
      {/* Atmospheric Golden Glow Spotlight */}
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 size-96 rounded-full bg-gradient-to-b from-amber-500/10 via-amber-400/5 to-transparent blur-3xl" />

      {/* Header */}
      <div className="relative mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-line/70 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/60 bg-amber-50/80 px-3 py-1 text-[11px] font-black text-amber-800 shadow-2xs dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200">
            <Crown className="size-3.5 text-amber-500" />
            <span>{language === 'en' ? 'HALL OF FAME' : 'BẢNG VINH DANH DANH DỰ'}</span>
          </div>
          <h2 className="mt-1.5 text-lg font-black tracking-tight text-content sm:text-xl">
            {displayTitle}
          </h2>
          <p className="mt-0.5 text-xs font-semibold text-content-muted">
            {language === 'en'
              ? 'Top three outstanding and persistent learners making their mark'
              : 'Ba học viên xuất sắc và kiên trì nhất, ghi dấu ấn trên bảng vàng thành tích'}
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-2 rounded-2xl border border-amber-200/80 bg-amber-50/60 px-3.5 py-2 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
          <Trophy className="size-5 text-amber-500" />
          <div className="text-right">
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700/80 dark:text-amber-300/80">
              {language === 'en' ? 'Honor' : 'Vinh danh'}
            </div>
            <div className="text-xs font-black">{language === 'en' ? 'Top 3 Champions' : 'Top 3 Xuất Sắc'}</div>
          </div>
        </div>
      </div>

      {/* 3D Tiered Staggered Podium Cards (Order on Desktop: 2 - 1 - 3) */}
      <div className="relative grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 items-end">
        <PodiumCard rank={2} member={second} isCurrent={second?.id === currentUserId} />
        <PodiumCard rank={1} member={first} isCurrent={first?.id === currentUserId} />
        <PodiumCard rank={3} member={third} isCurrent={third?.id === currentUserId} />
      </div>
    </section>
  );
};
