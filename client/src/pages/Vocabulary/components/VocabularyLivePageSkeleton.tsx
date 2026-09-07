import React from 'react';
import { BoneyardSkeleton } from '../../../components/common/BoneyardSkeleton';

export const WordCardSkeleton: React.FC<{ id?: string | number; isGridView?: boolean }> = ({
  id = 1,
  isGridView = true,
}) => {
  if (!isGridView) {
    return (
      <div className="flex items-center justify-between gap-4 p-3.5 border-b border-line last:border-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <BoneyardSkeleton
            name={`word-thumb-${id}`}
            width={48}
            height={48}
            className="size-12 shrink-0 rounded-xl"
          />
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <BoneyardSkeleton name={`word-term-${id}`} width={120} height={18} className="rounded-lg" />
              <BoneyardSkeleton name={`word-ipa-${id}`} width={70} height={14} className="rounded-md" />
              <BoneyardSkeleton name={`word-pos-${id}`} width={46} height={16} className="rounded-md" />
            </div>
            <BoneyardSkeleton name={`word-meaning-${id}`} width="75%" height={14} className="rounded-md" />
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <BoneyardSkeleton name={`word-audio-us-${id}`} width={30} height={30} className="size-7.5 rounded-lg" />
          <BoneyardSkeleton name={`word-audio-uk-${id}`} width={30} height={30} className="size-7.5 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex gap-3 rounded-2xl border border-line bg-surface p-3.5">
      {/* Thumbnail Illustration (size-16 square on left) */}
      <BoneyardSkeleton
        name={`word-thumb-${id}`}
        width={64}
        height={64}
        className="size-16 shrink-0 rounded-xl"
      />

      {/* Word Details */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-1">
          <div className="space-y-1">
            {/* Word term */}
            <BoneyardSkeleton name={`word-term-${id}`} width={110} height={20} className="rounded-lg" />
            {/* Phonetic text */}
            <BoneyardSkeleton name={`word-ipa-${id}`} width={80} height={14} className="rounded-md" />
          </div>

          {/* Top Right US & UK Audio Buttons */}
          <div className="flex shrink-0 items-center gap-1">
            <BoneyardSkeleton
              name={`word-audio-us-${id}`}
              width={28}
              height={28}
              className="size-7 rounded-lg"
            />
            <BoneyardSkeleton
              name={`word-audio-uk-${id}`}
              width={28}
              height={28}
              className="size-7 rounded-lg"
            />
          </div>
        </div>

        {/* Part of Speech Pill Badge */}
        <div className="mt-1 flex items-center gap-1.5">
          <BoneyardSkeleton name={`word-pos-${id}`} width={48} height={16} className="rounded-md" />
        </div>

        {/* Vietnamese Meaning Preview (2 lines) */}
        <div className="mt-1.5 space-y-1">
          <BoneyardSkeleton name={`word-meaning-1-${id}`} width="92%" height={12} className="rounded-md" />
          <BoneyardSkeleton name={`word-meaning-2-${id}`} width="60%" height={12} className="rounded-md" />
        </div>
      </div>
    </div>
  );
};

export const WordGridSkeleton: React.FC<{ isGridView?: boolean; count?: number }> = ({
  isGridView = true,
  count = 9,
}) => {
  if (!isGridView) {
    return (
      <div className="divide-y divide-line rounded-2xl border border-line bg-surface overflow-hidden">
        {Array.from({ length: count }, (_, idx) => (
          <WordCardSkeleton key={idx} id={idx} isGridView={false} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, idx) => (
        <WordCardSkeleton key={idx} id={idx} isGridView={true} />
      ))}
    </div>
  );
};

export const VocabularyToolbarSkeleton: React.FC = () => (
  <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-3.5 sm:flex-row sm:items-center sm:justify-between">
    {/* Search bar */}
    <div className="relative flex-1">
      <BoneyardSkeleton name="toolbar-search" height={38} className="w-full rounded-xl" />
    </div>

    {/* Shortcuts hint & Actions */}
    <div className="flex items-center justify-between gap-3 text-xs sm:justify-end">
      <BoneyardSkeleton name="toolbar-shortcuts" width={180} height={20} className="hidden lg:block rounded-md" />
      <BoneyardSkeleton name="toolbar-count" width={50} height={20} className="rounded-md" />
      <BoneyardSkeleton name="toolbar-btn-add" width={95} height={32} className="rounded-xl" />
      <BoneyardSkeleton name="toolbar-view-toggle" width={68} height={32} className="rounded-xl" />
    </div>
  </div>
);

export const VocabularyLiveHeaderSkeleton: React.FC = () => (
  <header className="flex flex-col gap-4 border-b border-line pb-4 lg:flex-row lg:items-center lg:justify-between">
    <div className="flex items-center gap-3">
      {/* Back button */}
      <BoneyardSkeleton
        name="live-btn-back"
        width={36}
        height={36}
        className="size-9 shrink-0 rounded-xl"
      />

      <div>
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-1">
          <BoneyardSkeleton name="live-breadcrumb-text" width={120} height={12} className="rounded-md" />
          <span className="text-xs text-content-muted/40">/</span>
          <BoneyardSkeleton name="live-breadcrumb-unit" width={60} height={12} className="rounded-md" />
        </div>
        {/* Title */}
        <BoneyardSkeleton name="live-title" height={28} width={180} className="rounded-xl" />
      </div>
    </div>

    {/* 4 Counter Badges + 2 Action Buttons */}
    <div className="flex flex-wrap items-center gap-2">
      <BoneyardSkeleton name="live-stat-total" width={85} height={32} className="rounded-xl" />
      <BoneyardSkeleton name="live-stat-learned" width={95} height={32} className="rounded-xl" />
      <BoneyardSkeleton name="live-stat-review" width={95} height={32} className="rounded-xl" />
      <BoneyardSkeleton name="live-stat-new" width={80} height={32} className="rounded-xl" />
      <BoneyardSkeleton name="live-btn-add" width={115} height={32} className="rounded-xl" />
      <BoneyardSkeleton name="live-btn-settings" width={85} height={32} className="rounded-xl" />
    </div>
  </header>
);

export const VocabularyLiveModesSkeleton: React.FC = () => (
  <nav aria-label="Chế độ học từ vựng" className="flex flex-wrap gap-2">
    {[
      { w: 110, id: 'xem-tu' },
      { w: 80, id: 'doan' },
      { w: 75, id: 'hoc' },
      { w: 105, id: 'luyen-tap' },
      { w: 75, id: 'choi' },
    ].map((tab, idx) => (
      <BoneyardSkeleton
        key={idx}
        name={`live-mode-tab-${tab.id}`}
        variant="button"
        width={tab.w}
        height={42}
        className="rounded-2xl"
      />
    ))}
  </nav>
);

export const VocabularyLivePageSkeleton: React.FC = () => (
  <div
    aria-label="Đang tải phòng học từ vựng"
    aria-busy="true"
    role="status"
    className="space-y-6 pb-16"
  >
    <span className="sr-only">Đang tải danh sách từ vựng và bài học...</span>

    {/* Header Skeleton */}
    <VocabularyLiveHeaderSkeleton />

    {/* 5 Mode Tabs Skeleton */}
    <VocabularyLiveModesSkeleton />

    {/* Word List and Grid Skeleton */}
    <div className="space-y-4">
      <VocabularyToolbarSkeleton />
      <WordGridSkeleton count={9} isGridView={true} />
    </div>
  </div>
);
