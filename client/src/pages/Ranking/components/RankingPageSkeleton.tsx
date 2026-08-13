import React from 'react';
import { BoneyardSkeleton } from '../../../components/common/BoneyardSkeleton';

export const RankingPageSkeleton: React.FC = () => (
  <div aria-label="Đang tải bảng xếp hạng" aria-busy="true" role="status" className="space-y-5">
    <span className="sr-only">Đang tải dữ liệu bảng xếp hạng</span>
    <section className="rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-5">
      <div className="mb-4 space-y-2">
        <BoneyardSkeleton name="ranking-podium-title" variant="text" width={180} />
        <BoneyardSkeleton name="ranking-podium-subtitle" variant="text" width={260} className="h-3" />
      </div>
      <div className="grid grid-cols-1 items-end gap-3.5 md:grid-cols-3">
        <BoneyardSkeleton name="ranking-podium-second" variant="card" height={200} />
        <BoneyardSkeleton name="ranking-podium-first" variant="card" height={220} />
        <BoneyardSkeleton name="ranking-podium-third" variant="card" height={200} />
      </div>
    </section>

    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 sm:gap-6">
      <section className="rounded-2xl border border-line bg-surface p-4 shadow-sm lg:col-span-2 sm:p-5">
        <BoneyardSkeleton name="ranking-list-title" variant="text" width={190} />
        <div className="mt-5 space-y-3">
          <BoneyardSkeleton name="ranking-list-rows" variant="row" count={5} height={72} />
        </div>
      </section>
      <section className="rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-5">
        <BoneyardSkeleton name="ranking-cohort-title" variant="text" width={170} />
        <div className="mt-5 space-y-3">
          <BoneyardSkeleton name="ranking-cohort-cards" variant="card" count={3} height={178} />
        </div>
      </section>
    </div>
  </div>
);
