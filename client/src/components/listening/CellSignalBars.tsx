import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

export interface CellSignalBarsProps {
  level?: number;
  size?: 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}

interface DifficultyMeta {
  label: string;
  labelEn: string;
  color: string;
  barColor: string;
  badgeBg: string;
}

const LEVEL_CONFIG: Record<number, DifficultyMeta> = {
  1: {
    label: 'Cơ bản',
    labelEn: 'Basic',
    color: 'text-emerald-600 dark:text-emerald-400',
    barColor: 'bg-emerald-500',
    badgeBg: 'bg-emerald-500/10 border-emerald-500/25',
  },
  2: {
    label: 'Dễ',
    labelEn: 'Easy',
    color: 'text-teal-600 dark:text-teal-400',
    barColor: 'bg-teal-500',
    badgeBg: 'bg-teal-500/10 border-teal-500/25',
  },
  3: {
    label: 'Trung bình',
    labelEn: 'Medium',
    color: 'text-amber-600 dark:text-amber-400',
    barColor: 'bg-amber-500',
    badgeBg: 'bg-amber-500/10 border-amber-500/25',
  },
  4: {
    label: 'Khó',
    labelEn: 'Hard',
    color: 'text-orange-600 dark:text-orange-400',
    barColor: 'bg-orange-500',
    badgeBg: 'bg-orange-500/10 border-orange-500/25',
  },
  5: {
    label: 'Rất khó',
    labelEn: 'Very Hard',
    color: 'text-rose-600 dark:text-rose-400',
    barColor: 'bg-rose-500',
    badgeBg: 'bg-rose-500/10 border-rose-500/25',
  },
};

const BAR_HEIGHTS = {
  sm: ['h-[3.5px]', 'h-[6.5px]', 'h-[9.5px]', 'h-[12.5px]', 'h-[15px]'],
  md: ['h-[4px]', 'h-[7.5px]', 'h-[11px]', 'h-[14.5px]', 'h-[18px]'],
};

export const CellSignalBars: React.FC<CellSignalBarsProps> = ({
  level = 3,
  size = 'sm',
  showLabel = false,
  className = '',
}) => {
  const { language } = useLanguage();
  const safeLevel = Math.max(1, Math.min(5, Math.round(level)));
  const config = LEVEL_CONFIG[safeLevel] || LEVEL_CONFIG[3];
  const heights = BAR_HEIGHTS[size];
  const barWidth = size === 'sm' ? 'w-[2.5px]' : 'w-[3.5px]';
  const containerHeight = size === 'sm' ? 'h-[15px]' : 'h-[18px]';
  const activeLabel = language === 'en' ? config.labelEn : config.label;

  const bars = (
    <div
      className={`flex items-end gap-[2px] ${containerHeight}`}
      role="img"
      aria-label={language === 'en' ? `Difficulty: Level ${safeLevel}/5` : `Độ khó: cấp ${safeLevel}/5`}
    >
      {[1, 2, 3, 4, 5].map((i) => {
        const isActive = i <= safeLevel;
        return (
          <span
            key={i}
            className={`${barWidth} ${heights[i - 1]} rounded-full transition-colors duration-200 ${
              isActive ? config.barColor : 'bg-slate-200 dark:bg-slate-700/60'
            }`}
          />
        );
      })}
    </div>
  );

  if (!showLabel) {
    return (
      <div
        className={`inline-flex items-center ${className}`}
        title={language === 'en' ? `Difficulty: Level ${safeLevel}/5 (${activeLabel})` : `Độ khó: Cấp ${safeLevel}/5 (${activeLabel})`}
      >
        {bars}
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-[11px] font-bold ${config.badgeBg} ${config.color} ${className}`}
      title={language === 'en' ? `Difficulty: Level ${safeLevel}/5` : `Độ khó: Cấp ${safeLevel}/5`}
    >
      {bars}
      <span className="leading-none">{activeLabel}</span>
    </div>
  );
};

export default CellSignalBars;
