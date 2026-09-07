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
          <div key={id} className="overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
            <BoneyardSkeleton name={`vocab-set-cover-${id}`} height={180} className="rounded-none w-full" />
            <div className="space-y-3 p-5">
              <BoneyardSkeleton name={`vocab-set-title-${id}`} height={22} width="70%" className="rounded-lg" />
              <BoneyardSkeleton name={`vocab-set-desc-1-${id}`} variant="text" width="95%" className="h-3" />
              <BoneyardSkeleton name={`vocab-set-desc-2-${id}`} variant="text" width="60%" className="h-3" />
              <div className="pt-3 border-t border-line flex justify-between items-center">
                <BoneyardSkeleton name={`vocab-set-meta-1-${id}`} variant="text" width={80} className="h-3" />
                <BoneyardSkeleton name={`vocab-set-meta-2-${id}`} variant="text" width={80} className="h-3" />
              </div>
              <BoneyardSkeleton name={`vocab-set-btn-${id}`} height={40} className="rounded-xl w-full" />
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
          <BoneyardSkeleton
            key={i}
            name={`vocab-personal-card-${i}`}
            variant="card"
            height={210}
            className="rounded-3xl"
          />
        ))}
      </div>
    </section>
  </div>
);
