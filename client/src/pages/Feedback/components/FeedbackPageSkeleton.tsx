import React from 'react';
import { BoneyardSkeleton } from '../../../components/common/BoneyardSkeleton';

export const FeedbackPageSkeleton: React.FC = () => {
  return (
    <div
      aria-label="Đang tải trang góp ý"
      aria-busy="true"
      role="status"
      className="mx-auto max-w-6xl space-y-8 pb-16 px-4 sm:px-6"
    >
      <span className="sr-only">Đang tải biểu mẫu và lịch sử góp ý...</span>

      {/* Header Skeleton */}
      <div className="space-y-3">
        <BoneyardSkeleton name="feedback-skeleton-badge" variant="button" width={220} height={28} className="rounded-full" />
        <BoneyardSkeleton name="feedback-skeleton-title" height={34} width={340} className="rounded-xl" />
        <BoneyardSkeleton name="feedback-skeleton-subtitle" variant="text" width="min(100%, 600px)" className="h-4" />
        <div className="flex items-center gap-2.5 pt-1">
          <BoneyardSkeleton name="feedback-skeleton-stat1" width={140} height={32} className="rounded-xl" />
          <BoneyardSkeleton name="feedback-skeleton-stat2" width={130} height={32} className="rounded-xl" />
        </div>
      </div>

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form Skeleton */}
        <div className="lg:col-span-7 rounded-3xl border border-line/80 bg-surface p-6 sm:p-8 space-y-6">
          <div className="space-y-2">
            <BoneyardSkeleton name="feedback-form-type-label" variant="text" width={110} className="h-3.5" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <BoneyardSkeleton name="feedback-form-type-1" height={70} className="rounded-2xl w-full" />
              <BoneyardSkeleton name="feedback-form-type-2" height={70} className="rounded-2xl w-full" />
            </div>
          </div>

          <div className="space-y-2">
            <BoneyardSkeleton name="feedback-form-title-label" variant="text" width={90} className="h-3.5" />
            <BoneyardSkeleton name="feedback-form-title-input" height={48} className="rounded-2xl w-full" />
          </div>

          <div className="space-y-2">
            <BoneyardSkeleton name="feedback-form-desc-label" variant="text" width={100} className="h-3.5" />
            <BoneyardSkeleton name="feedback-form-desc-input" height={110} className="rounded-2xl w-full" />
          </div>

          <div className="space-y-2.5">
            <BoneyardSkeleton name="feedback-form-img-label" variant="text" width={140} className="h-3.5" />
            <div className="flex gap-3">
              <BoneyardSkeleton name="feedback-form-img-btn" width={80} height={80} className="rounded-2xl" />
            </div>
          </div>

          <BoneyardSkeleton name="feedback-form-submit" width={160} height={48} className="rounded-2xl" />
        </div>

        {/* Right Feed Skeleton */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <BoneyardSkeleton name="feedback-feed-heading" height={26} width={180} className="rounded-xl" />
            <BoneyardSkeleton name="feedback-feed-filter" width={100} height={28} className="rounded-lg" />
          </div>

          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-3xl border border-line/80 bg-surface p-5 space-y-3.5 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <BoneyardSkeleton name={`feedback-item-type-${i}`} width={110} height={24} className="rounded-full" />
                <BoneyardSkeleton name={`feedback-item-status-${i}`} width={90} height={24} className="rounded-full" />
              </div>
              <BoneyardSkeleton name={`feedback-item-title-${i}`} height={20} width="80%" className="rounded-lg" />
              <BoneyardSkeleton name={`feedback-item-desc1-${i}`} variant="text" width="95%" className="h-3" />
              <BoneyardSkeleton name={`feedback-item-desc2-${i}`} variant="text" width="65%" className="h-3" />
              <div className="pt-2 border-t border-line/50 flex items-center justify-between">
                <BoneyardSkeleton name={`feedback-item-date-${i}`} variant="text" width={80} className="h-3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
