import React from 'react';
import { HelpCircle } from 'lucide-react';
import { CountUp } from './CountUp';

export interface StatCardProps {
  id: string;
  icon: React.ReactNode;
  label: string;
  value: number;
  unit?: string;
  badgeBg?: string;
  iconColor?: string;
  cardBg?: string;
  textColor?: string;
  labelColor?: string;
  className?: string;
  helpIcon?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  id,
  icon,
  label,
  value,
  unit = '',
  badgeBg = 'bg-blue-50',
  iconColor = 'text-blue-600',
  cardBg = 'bg-white/60 backdrop-blur-md border border-white/70 shadow-sm',
  textColor = 'text-slate-800',
  labelColor = 'text-amber-900/70',
  className = '',
  helpIcon = false,
}) => {
  return (
    <div
      id={id}
      className={`flex items-center gap-1.5 sm:gap-3 p-1.5 sm:p-2.5 rounded-[16px] transition-transform hover:-translate-y-0.5 ${cardBg} ${className}`}
    >
      {/* Icon */}
      <div
        className={`grid size-7 sm:size-9 place-items-center rounded-full ${badgeBg} ${iconColor} shrink-0 shadow-md`}
      >
        {icon}
      </div>

      {/* Values & Label */}
      <div className="flex flex-col min-w-0 pr-1 sm:pr-2">
        <div className={`flex items-baseline gap-0.5 sm:gap-1 font-extrabold text-xs sm:text-base leading-tight ${textColor}`}>
          <CountUp end={value} />
          {unit && <span className="text-[9px] sm:text-[10px] font-semibold opacity-80">{unit}</span>}
        </div>
        <div className={`text-[10px] font-bold truncate mt-0.5 inline-flex items-center gap-1 leading-none ${labelColor}`}>
          <span className="truncate">{label}</span>
          {helpIcon && (
            <span
              className="inline-flex items-center justify-center size-3.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/40 shrink-0 self-center"
              title="Xem cách tính điểm XP"
            >
              <HelpCircle className="size-2.5 stroke-[2.5]" aria-hidden="true" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
