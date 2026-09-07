import React from 'react';
import { BoneyardSkeleton } from '../../../components/common/BoneyardSkeleton';

export const VocabularyPageSkeleton: React.FC = () => (
  <div
    aria-label="Đang tải kho từ vựng"
    aria-busy="true"
    role="status"
    className="space-y-8 pb-16"
  >
    <span className="sr-only">Đang tải kho từ vựng và bài học...</span>

    {/* Hero Notebook Banner Skeleton */}
    <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm sm:p-7">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3.5">
          <BoneyardSkeleton name="vocab-notebook-badge" variant="button" width={160} height={26} className="rounded-full" />
          <BoneyardSkeleton name="vocab-notebook-title" height={28} width={300} className="rounded-xl" />
          <BoneyardSkeleton name="vocab-notebook-desc" variant="text" width="min(100%, 540px)" className="h-4" />
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <BoneyardSkeleton name="vocab-stat-total" width={100} height={32} className="rounded-xl" />
            <BoneyardSkeleton name="vocab-stat-learned" width={140} height={32} className="rounded-xl" />
            <BoneyardSkeleton name="vocab-stat-review" width={130} height={32} className="rounded-xl" />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
          <BoneyardSkeleton name="vocab-notebook-action-1" width={180} height={48} className="rounded-2xl" />
          <BoneyardSkeleton name="vocab-notebook-action-2" width={180} height={44} className="rounded-2xl" />
        </div>
      </div>
    </div>

    {/* Category Tabs & Search Skeleton */}
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <BoneyardSkeleton
            key={i}
            name={`vocab-tab-${i}`}
            variant="button"
            width={i === 1 ? 130 : 150}
            height={40}
            className="rounded-2xl"
          />
        ))}
      </div>
      <BoneyardSkeleton name="vocab-search" width={280} height={40} className="rounded-2xl" />
    </div>

    {/* System Vocabulary Sets Grid Skeleton */}
    <section className="space-y-4">
      <div className="space-y-1.5">
        <BoneyardSkeleton name="vocab-sets-heading" height={24} width={260} className="rounded-xl" />
        <BoneyardSkeleton name="vocab-sets-sub" variant="text" width={380} className="h-3" />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((id) => (
          <div key={id} className="overflow-hidden rounded-3xl border border-line/80 bg-surface shadow-xs">
            <BoneyardSkeleton name={`vocab-set-cover-${id}`} height={190} className="rounded-none w-full" />
            <div className="flex flex-1 flex-col justify-between p-5">
              <div>
                <BoneyardSkeleton name={`vocab-set-title-${id}`} height={20} width="65%" className="rounded-lg" />
                <BoneyardSkeleton name={`vocab-set-desc-1-${id}`} variant="text" width="95%" className="h-3 mt-2" />
                <BoneyardSkeleton name={`vocab-set-desc-2-${id}`} variant="text" width="60%" className="h-3 mt-1.5" />
              </div>

              <div className="mt-4 pt-3.5 border-t border-line/60 flex items-center justify-between">
                <BoneyardSkeleton name={`vocab-set-meta-${id}`} variant="text" width={120} className="h-3.5" />
                <BoneyardSkeleton name={`vocab-set-action-${id}`} variant="button" width={68} height={20} className="rounded-md" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>

    {/* Personal Topics Grid Skeleton */}
    <section className="pt-6 border-t border-line space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <BoneyardSkeleton name="vocab-personal-heading" height={24} width={220} className="rounded-xl" />
          <BoneyardSkeleton name="vocab-personal-sub" variant="text" width={320} className="h-3" />
        </div>
        <BoneyardSkeleton name="vocab-personal-btn" variant="button" width={110} height={40} className="rounded-xl" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-3xl border border-line/80 bg-surface p-5 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-start justify-between gap-3">
                <BoneyardSkeleton name={`vocab-personal-icon-${i}`} width={44} height={44} className="rounded-2xl" />
                <BoneyardSkeleton name={`vocab-personal-menu-${i}`} width={32} height={32} className="rounded-xl" />
              </div>
              <BoneyardSkeleton name={`vocab-personal-title-${i}`} height={20} width="60%" className="rounded-lg mt-3.5" />
              <BoneyardSkeleton name={`vocab-personal-desc-${i}`} variant="text" width="85%" className="h-3 mt-2" />
            </div>

            <div className="mt-5 space-y-2.5">
              <div className="flex items-center justify-between">
                <BoneyardSkeleton name={`vocab-personal-stat1-${i}`} variant="text" width={65} className="h-3" />
                <BoneyardSkeleton name={`vocab-personal-stat2-${i}`} variant="text" width={100} className="h-3" />
              </div>
              <BoneyardSkeleton name={`vocab-personal-bar-${i}`} height={6} className="rounded-full w-full" />
              <div className="pt-1.5">
                <BoneyardSkeleton name={`vocab-personal-btn-${i}`} height={36} className="rounded-xl w-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  </div>
);
