import React from 'react';
import { Skeleton as BoneyardReactSkeleton } from 'boneyard-js/react';

export interface BoneyardSkeletonProps {
  name?: string;
  loading?: boolean;
  className?: string;
  children?: React.ReactNode;
  variant?: 'card' | 'text' | 'rect' | 'circle' | 'button' | 'row';
  count?: number;
  height?: string | number;
  width?: string | number;
}

export const BoneyardSkeleton: React.FC<BoneyardSkeletonProps> = ({
  name = 'boneyard-skeleton',
  loading = true,
  className = '',
  children,
  variant = 'rect',
  count = 1,
  height,
  width,
}) => {
  if (children && !loading) {
    return <>{children}</>;
  }

  const baseClasses = 'boneyard-bone relative overflow-hidden rounded-2xl bg-slate-200/90 dark:bg-surface-elevated animate-pulse motion-reduce:animate-none';

  const getVariantStyle = () => {
    switch (variant) {
      case 'circle':
        return 'rounded-full';
      case 'text':
        return 'h-4 w-full rounded-lg';
      case 'button':
        return 'h-10 w-28 rounded-xl';
      case 'card':
        return 'h-48 w-full rounded-2xl border border-slate-200/60 dark:border-line';
      case 'row':
        return 'h-16 w-full rounded-2xl border border-slate-200/60 dark:border-line';
      default:
        return 'h-24 w-full rounded-2xl';
    }
  };

  const styleObj: React.CSSProperties = {};
  if (height !== undefined) styleObj.height = typeof height === 'number' ? `${height}px` : height;
  if (width !== undefined) styleObj.width = typeof width === 'number' ? `${width}px` : width;

  const skeletonItems = Array.from({ length: count }, (_, idx) => (
    <div
      key={idx}
      aria-hidden="true"
      className={`${baseClasses} ${getVariantStyle()} ${className}`.trim()}
      style={styleObj}
    />
  ));

  const fallbackUI = count > 1 ? (
    <div className="space-y-3 w-full">{skeletonItems}</div>
  ) : (
    skeletonItems[0]
  );

  return (
    <BoneyardReactSkeleton name={name} loading={loading} fallback={fallbackUI}>
      {children ?? fallbackUI}
    </BoneyardReactSkeleton>
  );
};
