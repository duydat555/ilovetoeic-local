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
  if (!loading && children) {
    return <>{children}</>;
  }

  const baseClasses =
    'boneyard-bone relative overflow-hidden rounded-2xl bg-slate-200/80 dark:bg-surface-elevated animate-pulse motion-reduce:animate-none';

  const getVariantStyle = () => {
    switch (variant) {
      case 'circle':
        return 'rounded-full';
      case 'text':
        return 'h-4 w-full rounded-lg';
      case 'button':
        return 'h-10 w-28 rounded-xl';
      case 'card':
        return 'h-32 w-full rounded-2xl border border-line bg-surface';
      case 'row':
        return 'h-14 w-full rounded-xl border border-line bg-surface';
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
    >
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 dark:via-white/5 to-transparent animate-[shimmer_1.8s_infinite]" />
    </div>
  ));

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
        {children || renderNodes}
      </BoneyardReactSkeleton>
    );
  } catch {
    return <>{renderNodes}</>;
  }
};
