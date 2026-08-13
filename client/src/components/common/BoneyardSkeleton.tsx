import React from 'react';
import { Skeleton as BoneyardReactSkeleton } from 'boneyard-js/react';

export interface BoneyardSkeletonProps {
  name?: string;
  loading?: boolean;
  className?: string;
  containerClassName?: string;
  children?: React.ReactNode;
  variant?: 'card' | 'text' | 'rect' | 'circle' | 'button' | 'row';
  count?: number;
  height?: string | number;
  width?: string | number;
  isGrid?: boolean;
}

export const BoneyardSkeleton: React.FC<BoneyardSkeletonProps> = ({
  name = 'boneyard-skeleton',
  loading = true,
  className = '',
  containerClassName,
  children,
  variant = 'rect',
  count = 1,
  height,
  width,
  isGrid = false,
}) => {
  const baseClasses =
    'boneyard-bone relative overflow-hidden rounded-2xl bg-slate-200/80 dark:bg-surface-elevated';

  const styleObj: React.CSSProperties = {};
  if (height !== undefined) styleObj.height = typeof height === 'number' ? `${height}px` : height;
  if (width !== undefined) styleObj.width = typeof width === 'number' ? `${width}px` : width;

  const renderCardSkeleton = (key: React.Key) => (
    <div
      key={key}
      aria-hidden="true"
      className={`surface relative flex flex-col justify-between overflow-hidden rounded-2xl border border-line p-5 shadow-2xs ${className}`.trim()}
      style={styleObj.height ? { height: styleObj.height } : { minHeight: '185px' }}
    >
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="h-5 w-3/5 rounded-lg bg-slate-200/90 dark:bg-surface-elevated" />
          <div className="flex gap-1.5">
            <div className="size-6 rounded-md bg-slate-200/90 dark:bg-surface-elevated" />
            <div className="size-6 rounded-md bg-slate-200/90 dark:bg-surface-elevated" />
          </div>
        </div>
        <div className="flex items-center gap-3 pt-1">
          <div className="h-4 w-20 rounded-md bg-slate-200/70 dark:bg-surface-elevated/70" />
          <div className="h-4 w-24 rounded-md bg-slate-200/70 dark:bg-surface-elevated/70" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 pt-4">
        <div className="h-9 rounded-xl bg-slate-200/90 dark:bg-surface-elevated" />
        <div className="h-9 rounded-xl bg-slate-200/90 dark:bg-surface-elevated" />
      </div>
      <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 dark:via-white/10 to-transparent animate-[shimmer_1.8s_infinite]" />
    </div>
  );

  const getVariantStyle = () => {
    switch (variant) {
      case 'circle':
        return 'rounded-full';
      case 'text':
        return 'h-4 w-full rounded-lg';
      case 'button':
        return 'h-9 w-24 rounded-full';
      case 'row':
        return 'h-14 w-full rounded-xl border border-line bg-surface';
      default:
        return 'h-24 w-full rounded-2xl';
    }
  };

  const skeletonItems = Array.from({ length: count }, (_, idx) => {
    if (variant === 'card') {
      return renderCardSkeleton(idx);
    }

    return (
      <div
        key={idx}
        aria-hidden="true"
        className={`${baseClasses} ${getVariantStyle()} ${className}`.trim()}
        style={styleObj}
      >
        <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 dark:via-white/10 to-transparent animate-[shimmer_1.8s_infinite]" />
      </div>
    );
  });

  let renderNodes: React.ReactNode;
  if (count <= 1) {
    renderNodes = skeletonItems[0];
  } else if (isGrid) {
    renderNodes = <>{skeletonItems}</>;
  } else if (containerClassName) {
    renderNodes = <div className={containerClassName}>{skeletonItems}</div>;
  } else {
    renderNodes = <div className="space-y-3 w-full">{skeletonItems}</div>;
  }

  try {
    return (
      <BoneyardReactSkeleton name={name} loading={loading} fallback={renderNodes}>
        {children ?? null}
      </BoneyardReactSkeleton>
    );
  } catch {
    return <>{loading ? renderNodes : children}</>;
  }
};
