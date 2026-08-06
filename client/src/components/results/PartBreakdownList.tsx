import React from 'react';
import { BookOpen, Headphones } from 'lucide-react';

export interface PartBreakdownItem {
  part: string;
  correct: number;
  total: number;
}

export interface PartBreakdownListProps {
  partBreakdown: PartBreakdownItem[];
  selectedParts?: number[];
  hasListening: boolean;
  hasReading: boolean;
}

export const PartBreakdownList: React.FC<PartBreakdownListProps> = ({
  partBreakdown,
  hasListening,
  hasReading,
}) => {
  if (!partBreakdown || partBreakdown.length === 0) return null;

  // Lọc lấy số Part
  const getPartNumber = (partStr: string): number => {
    const match = partStr.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  };

  const listeningParts = partBreakdown.filter((item) => {
    const num = getPartNumber(item.part);
    return num >= 1 && num <= 4;
  });

  const readingParts = partBreakdown.filter((item) => {
    const num = getPartNumber(item.part);
    return num >= 5 && num <= 7;
  });

  const renderPartGrid = (items: PartBreakdownItem[]) => (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => {
        const percent = item.total > 0 ? Math.round((item.correct / item.total) * 100) : 0;
        return (
          <div
            key={item.part}
            className="space-y-2 rounded-2xl border border-line bg-surface-elevated/40 p-4 transition hover:border-brand-300 dark:hover:border-brand-800"
          >
            <div className="flex items-center justify-between text-xs font-bold text-content">
              <span>{item.part}</span>
              <span className="font-black text-brand-600 dark:text-brand-400">
                {item.correct}/{item.total} ({percent}%)
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-surface-hover">
              <div
                className="h-full rounded-full bg-brand-500 transition-all duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="rounded-2xl border border-line bg-surface p-6 shadow-xs sm:p-8 dark:shadow-none space-y-6">
      <h3 className="text-base font-black tracking-tight text-content">
        Chi tiết kết quả theo từng Part
      </h3>

      {/* Cụm LISTENING nếu có */}
      {hasListening && listeningParts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-brand-700 dark:text-brand-300">
            <Headphones className="size-4 text-brand-600" />
            <span>LISTENING (Part 1 - 4)</span>
          </div>
          {renderPartGrid(listeningParts)}
        </div>
      )}

      {/* Cụm READING nếu có */}
      {hasReading && readingParts.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-sky-700 dark:text-sky-300">
            <BookOpen className="size-4 text-sky-600" />
            <span>READING (Part 5 - 7)</span>
          </div>
          {renderPartGrid(readingParts)}
        </div>
      )}
    </div>
  );
};
