import React from 'react';
import { BoneyardSkeleton } from '../../../components/common/BoneyardSkeleton';

const PodiumCardSkeleton: React.FC<{
  rank: 1 | 2 | 3;
  pedestalHeight: string;
  orderClass: string;
}> = ({ rank, pedestalHeight, orderClass }) => {
  const isWinner = rank === 1;

  return (
    <div
      aria-hidden="true"
      className={`relative flex flex-col justify-between rounded-3xl border border-line bg-surface/70 p-4 sm:p-5 shadow-xs ${orderClass}`}
    >
      {/* Top Badge */}
      <div className="flex items-center justify-between gap-2">
        <BoneyardSkeleton
          name={`ranking-podium-skel-badge-${rank}`}
          height={22}
          width={110}
          className="!rounded-full"
        />
      </div>

      {/* Center Body */}
      <div className="mt-4 flex flex-col items-center text-center">
        {/* Avatar Placeholder */}
        <div className="relative mt-2">
          {isWinner && (
            <div className="absolute -top-7 left-1/2 -translate-x-1/2">
              <BoneyardSkeleton
                name="ranking-podium-skel-crown"
                variant="circle"
                height={30}
                width={30}
                className="!rounded-full"
              />
            </div>
          )}
          <BoneyardSkeleton
            name={`ranking-podium-skel-avatar-${rank}`}
            variant="circle"
            height={isWinner ? 80 : 64}
            width={isWinner ? 80 : 64}
            className="!rounded-full shadow-sm"
          />
        </div>

        {/* Name & Cohort */}
        <BoneyardSkeleton
          name={`ranking-podium-skel-name-${rank}`}
          variant="text"
          width={130}
          className="mt-3.5 h-4"
        />
        <BoneyardSkeleton
          name={`ranking-podium-skel-cohort-${rank}`}
          variant="text"
          width={75}
          className="mt-1.5 h-3"
        />

        {/* Hero Metric Box */}
        <div className="mt-3 w-full rounded-2xl border border-line/70 bg-canvas/60 p-2.5 sm:p-3 flex flex-col items-center">
          <BoneyardSkeleton
            name={`ranking-podium-skel-hero-lbl-${rank}`}
            variant="text"
            width={85}
            className="h-3"
          />
          <BoneyardSkeleton
            name={`ranking-podium-skel-hero-val-${rank}`}
            variant="text"
            width={110}
            className="mt-1 h-6"
          />
        </div>

        {/* Sub-metrics Chips */}
        <div className="mt-2.5 grid w-full grid-cols-2 gap-2">
          <BoneyardSkeleton
            name={`ranking-podium-skel-chip1-${rank}`}
            height={30}
            className="!rounded-xl"
          />
          <BoneyardSkeleton
            name={`ranking-podium-skel-chip2-${rank}`}
            height={30}
            className="!rounded-xl"
          />
        </div>
      </div>

      {/* 3D Podium Pedestal Base Block */}
      <div
        className={`hidden md:flex mt-4 w-full rounded-2xl ${pedestalHeight} border-t-2 border-line/80 bg-canvas/50 items-center justify-center`}
      >
        <BoneyardSkeleton
          name={`ranking-podium-skel-pednum-${rank}`}
          variant="text"
          width={24}
          className="h-7 opacity-30"
        />
      </div>
    </div>
  );
};

export const RankingPodiumSkeleton: React.FC = () => (
  <section className="relative overflow-hidden rounded-3xl border border-line bg-surface/90 backdrop-blur-xs p-5 sm:p-7 shadow-sm">
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-line/70 pb-4">
      <div className="space-y-2">
        <BoneyardSkeleton
          name="ranking-podium-honor-badge"
          height={22}
          width={150}
          className="!rounded-full"
        />
        <BoneyardSkeleton
          name="ranking-podium-title"
          variant="text"
          width={220}
          className="h-6"
        />
        <BoneyardSkeleton
          name="ranking-podium-subtitle"
          variant="text"
          width={310}
          className="h-3.5"
        />
      </div>
      <div className="hidden sm:block">
        <BoneyardSkeleton
          name="ranking-podium-trophy-badge"
          height={48}
          width={130}
          className="!rounded-2xl"
        />
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 items-end">
      <PodiumCardSkeleton rank={2} pedestalHeight="h-12 md:h-14" orderClass="order-2 md:order-1" />
      <PodiumCardSkeleton rank={1} pedestalHeight="h-16 md:h-20" orderClass="order-1 md:order-2" />
      <PodiumCardSkeleton rank={3} pedestalHeight="h-9 md:h-10" orderClass="order-3 md:order-3" />
    </div>
  </section>
);

const RankingListRowSkeleton: React.FC<{ index: number }> = ({ index }) => (
  <div
    aria-hidden="true"
    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:px-4 rounded-xl border border-line bg-surface"
  >
    <div className="flex items-center gap-3 min-w-0">
      <BoneyardSkeleton
        name={`ranking-row-skel-rank-${index}`}
        variant="text"
        width={24}
        className="h-4 shrink-0"
      />
      <BoneyardSkeleton
        name={`ranking-row-skel-avatar-${index}`}
        variant="circle"
        height={42}
        width={42}
        className="shrink-0 !rounded-full"
      />
      <div className="space-y-1.5 flex-1 min-w-0">
        <BoneyardSkeleton
          name={`ranking-row-skel-name-${index}`}
          variant="text"
          width="min(100%, 140px)"
          className="h-4"
        />
        <BoneyardSkeleton
          name={`ranking-row-skel-cohort-${index}`}
          variant="text"
          width={70}
          className="h-3"
        />
      </div>
    </div>

    <div className="grid grid-cols-3 gap-3 border-t border-line/80 pt-2 sm:border-0 sm:pt-0 shrink-0">
      <BoneyardSkeleton
        name={`ranking-row-skel-stat1-${index}`}
        variant="text"
        width={48}
        className="h-6"
      />
      <BoneyardSkeleton
        name={`ranking-row-skel-stat2-${index}`}
        variant="text"
        width={56}
        className="h-6"
      />
      <BoneyardSkeleton
        name={`ranking-row-skel-stat3-${index}`}
        variant="text"
        width={44}
        className="h-6"
      />
    </div>
  </div>
);

export const RankingPageSkeleton: React.FC = () => (
  <div aria-label="Đang tải bảng xếp hạng" aria-busy="true" role="status" className="space-y-5">
    <span className="sr-only">Đang tải dữ liệu bảng xếp hạng</span>

    {/* Top 3 Podium Skeleton */}
    <RankingPodiumSkeleton />

    {/* Main Grid: Top 10 List + Cohort Sidebar */}
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 sm:gap-6">
      {/* Top 10 List Skeleton */}
      <section className="rounded-3xl border border-line bg-surface p-4 sm:p-6 shadow-sm lg:col-span-2">
        <div className="flex items-center justify-between gap-4 border-b border-line pb-4 mb-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <BoneyardSkeleton
                name="ranking-list-skel-title"
                variant="text"
                width={190}
                className="h-5"
              />
              <BoneyardSkeleton
                name="ranking-list-skel-badge"
                height={20}
                width={55}
                className="!rounded-full"
              />
            </div>
            <BoneyardSkeleton
              name="ranking-list-skel-sub"
              variant="text"
              width={280}
              className="h-3"
            />
          </div>
        </div>

        {/* 10 Rows matching Top 10 */}
        <div className="space-y-2.5">
          {Array.from({ length: 10 }, (_, index) => (
            <RankingListRowSkeleton key={index} index={index} />
          ))}
        </div>
      </section>

      {/* Cohort Sidebar Skeleton */}
      <section className="rounded-3xl border border-line bg-surface p-4 sm:p-5 shadow-sm">
        <div className="border-b border-line pb-3.5 space-y-1.5">
          <BoneyardSkeleton
            name="ranking-cohort-skel-title"
            variant="text"
            width={170}
            className="h-5"
          />
          <BoneyardSkeleton
            name="ranking-cohort-skel-sub"
            variant="text"
            width={220}
            className="h-3"
          />
        </div>

        <div className="mt-4 space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="rounded-xl border border-line bg-canvas p-3 space-y-2">
              <div className="flex items-center gap-2">
                <BoneyardSkeleton name={`cohort-skel-badge-${i}`} height={28} width={28} className="!rounded-lg" />
                <div className="space-y-1 flex-1">
                  <BoneyardSkeleton name={`cohort-skel-name-${i}`} variant="text" width={100} className="h-3.5" />
                  <BoneyardSkeleton name={`cohort-skel-count-${i}`} variant="text" width={60} className="h-2.5" />
                </div>
              </div>
              <div className="space-y-1.5 pt-1">
                <BoneyardSkeleton name={`cohort-skel-row1-${i}`} height={34} className="!rounded-lg" />
                <BoneyardSkeleton name={`cohort-skel-row2-${i}`} height={34} className="!rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  </div>
);

