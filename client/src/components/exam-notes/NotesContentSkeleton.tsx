import React from 'react';
import { BoneyardSkeleton } from '../common/BoneyardSkeleton';

// Match the composer geometry without introducing a second loading style or shimmer.
export function NotesContentSkeleton() {
  return <div className="exam-notes-skeleton" role="status" aria-label="Đang tải ghi chú">
    <BoneyardSkeleton name="exam-notes-composer" fallback={<div aria-hidden="true">
      <div className="exam-notes-skeleton-chips"><span /><span /><span /><span /></div>
      <div className="exam-notes-skeleton-tools" />
      <div className="exam-notes-skeleton-lines"><span /><span /><span /></div>
    </div>} />
  </div>;
}
