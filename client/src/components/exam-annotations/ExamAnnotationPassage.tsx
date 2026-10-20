import React, { lazy, Suspense } from 'react';
import { BoneyardSkeleton } from '../common/BoneyardSkeleton';
import type { AnnotationSurfaceProps } from './AnnotationSurface';

export const EXAM_ANNOTATIONS_ENABLED = import.meta.env.VITE_EXAM_ANNOTATIONS_V2 === 'true';
const AnnotationSurface = lazy(() => import('./AnnotationSurface'));
type Props = Omit<AnnotationSurfaceProps, 'userId'> & { userId?: string; fallback: React.ReactNode };
class AnnotationBoundary extends React.Component<{ children: React.ReactNode; fallback: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <><p role="status" className="mb-2 text-xs text-content-muted">Chưa mở được công cụ chú thích. Bạn vẫn có thể tiếp tục làm bài.</p>{this.props.fallback}</> : this.props.children;
  }
}
/** Keyed mount prevents a group/account change from writing the previous group's state. */
export function ExamAnnotationPassage({ fallback, userId, ...props }: Props) {
  if (!EXAM_ANNOTATIONS_ENABLED || !userId) return <>{fallback}</>;
  return <AnnotationBoundary fallback={fallback}><Suspense fallback={<div className="grid grid-cols-[54px_minmax(0,1fr)] gap-3">
    <BoneyardSkeleton name="exam-annotation-rail-loading" height={220} />
    <BoneyardSkeleton name="exam-annotations-loading" height={220} />
  </div>}>
    <AnnotationSurface key={JSON.stringify([userId, props.scope, props.group])} {...props} userId={userId} />
  </Suspense></AnnotationBoundary>;
}
