import React from 'react';
import { CountUp } from './CountUp';

export interface StatCardProps {
  id: string;
  icon: React.ReactNode;
  label: string;
  value: number;
  unit?: string;
  badgeBg?: string;
  iconColor?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  id,
  icon,
  label,
  value,
  unit = '',
  badgeBg = 'bg-blue-50',
  iconColor = 'text-blue-600',
}) => {
  return (
    <div
      id={id}
      className="flex items-center gap-3 p-2.5 rounded-[16px] bg-white/60 backdrop-blur-md border border-white/70 shadow-sm transition-transform hover:-translate-y-0.5"
    >
      {/* Icon */}
      <div
        className={`grid size-9 place-items-center rounded-full ${badgeBg} ${iconColor} shrink-0 shadow-md`}
      >
        {icon}
      </div>

      {/* Values & Label */}
      <div className="flex flex-col min-w-0 pr-2">
        <div className="flex items-baseline gap-1 text-slate-800 font-extrabold text-base leading-tight">
          <CountUp end={value} />
          {unit && <span className="text-[10px] font-semibold text-slate-600">{unit}</span>}
        </div>
        <span className="text-[10px] font-bold text-amber-900/70 truncate mt-0.5">
          {label}
        </span>
      </div>
    </div>
  );
};
