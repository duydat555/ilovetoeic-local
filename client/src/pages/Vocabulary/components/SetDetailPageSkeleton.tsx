import React from 'react';
import { BoneyardSkeleton } from '../../../components/common/BoneyardSkeleton';

export const SetDetailPageSkeleton: React.FC = () => (
  <div
    aria-label="Đang tải thông tin bộ từ vựng"
    aria-busy="true"
    role="status"
    className="mx-auto max-w-6xl space-y-8 pb-20"
  >
    <span className="sr-only">Đang tải bộ từ vựng và danh sách bài học...</span>

    {/* Breadcrumb Skeleton */}
    <nav className="flex items-center gap-2">
      <BoneyardSkeleton name="set-detail-bc-1" variant="button" width={75} height={18} className="rounded-md" />
      <span className="text-content-muted/30">/</span>
      <BoneyardSkeleton name="set-detail-bc-2" variant="text" width={140} className="h-4 rounded-md" />
    </nav>

    {/* Set Hero Banner Skeleton */}
    <header className="rounded-3xl border border-line bg-surface p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          {/* Cover image skeleton */}
          <BoneyardSkeleton
            name="set-detail-cover"
            height={128}
            width={128}
            className="size-24 shrink-0 rounded-2xl sm:size-32"
          />

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <BoneyardSkeleton name="set-detail-cat" variant="button" width={80} height={24} className="rounded-full" />
              <BoneyardSkeleton name="set-detail-src" variant="button" width={110} height={24} className="rounded-full" />
            </div>

            <BoneyardSkeleton name="set-detail-title" height={32} width={280} className="rounded-xl" />
            <BoneyardSkeleton name="set-detail-desc-1" variant="text" width="min(100%, 480px)" className="h-4" />
            <BoneyardSkeleton name="set-detail-desc-2" variant="text" width="min(100%, 360px)" className="h-4" />

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <BoneyardSkeleton name="set-detail-stat-1" width={120} height={32} className="rounded-xl" />
              <BoneyardSkeleton name="set-detail-stat-2" width={130} height={32} className="rounded-xl" />
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <BoneyardSkeleton name="set-detail-btn-back" width={110} height={44} className="rounded-2xl" />
        </div>
      </div>
    </header>

    {/* Filter and Units Search Skeleton */}
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1.5">
        <BoneyardSkeleton name="set-detail-units-title" height={24} width={220} className="rounded-xl" />
        <BoneyardSkeleton name="set-detail-units-sub" variant="text" width={320} className="h-3" />
      </div>
      <BoneyardSkeleton name="set-detail-search" width={280} height={40} className="rounded-2xl w-full sm:w-auto" />
    </div>

    {/* Units Grid Skeleton */}
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((id) => (
        <div
          key={id}
          className="flex flex-col justify-between rounded-3xl border border-line bg-surface p-5 shadow-sm min-h-[170px]"
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <BoneyardSkeleton name={`unit-badge-idx-${id}`} width={36} height={36} className="rounded-xl" />
              <BoneyardSkeleton name={`unit-badge-words-${id}`} width={55} height={22} className="rounded-full" />
            </div>
            <div className="mt-3.5 space-y-2">
              <BoneyardSkeleton name={`unit-title-${id}`} height={20} width="60%" className="rounded-lg" />
              <BoneyardSkeleton name={`unit-desc-${id}`} variant="text" width="90%" className="h-3" />
            </div>
          </div>
          <div className="mt-5 pt-3 border-t border-line">
            <BoneyardSkeleton name={`unit-btn-${id}`} height={40} className="rounded-xl w-full" />
          </div>
        </div>
      ))}
    </div>
  </div>
);
