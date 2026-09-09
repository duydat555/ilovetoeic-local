import React from 'react';
import { BookOpen, CheckCircle2, Headphones } from 'lucide-react';

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

interface PartMeta {
  name: string;
  enName: string;
  skill: 'Listening' | 'Reading';
}

const PART_METADATA: Record<number, PartMeta> = {
  1: { name: 'Mô tả hình ảnh', enName: 'Photographs', skill: 'Listening' },
  2: { name: 'Hỏi & Đáp', enName: 'Question - Response', skill: 'Listening' },
  3: { name: 'Đoạn hội thoại', enName: 'Conversations', skill: 'Listening' },
  4: { name: 'Bài nói ngắn', enName: 'Short Talks', skill: 'Listening' },
  5: { name: 'Hoàn thành câu', enName: 'Incomplete Sentences', skill: 'Reading' },
  6: { name: 'Hoàn thành đoạn văn', enName: 'Text Completion', skill: 'Reading' },
  7: { name: 'Đọc hiểu văn bản', enName: 'Reading Comprehension', skill: 'Reading' },
};

const getPartProficiency = (percent: number) => {
  if (percent >= 80) {
    return {
      label: 'Thành thạo',
      badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
      barColorClass: 'bg-emerald-500',
    };
  }
  if (percent >= 60) {
    return {
      label: 'Khá tốt',
      badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
      barColorClass: 'bg-amber-500',
    };
  }
  return {
    label: 'Cần ôn thêm',
    badgeClass: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20',
    barColorClass: 'bg-rose-500',
  };
};

export const PartBreakdownList: React.FC<PartBreakdownListProps> = ({
  partBreakdown,
  hasListening,
  hasReading,
}) => {
  if (!partBreakdown || partBreakdown.length === 0) return null;

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
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => {
        const partNum = getPartNumber(item.part);
        const meta = PART_METADATA[partNum];
        const percent = item.total > 0 ? Math.round((item.correct / item.total) * 100) : 0;
        const prof = getPartProficiency(percent);

        return (
          <div
            key={item.part}
            className="group rounded-2xl border border-line bg-surface p-4 shadow-2xs transition-all hover:border-amber-400/40 hover:shadow-xs"
          >
            {/* Header: Part name + Badge */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-xs font-black text-content">
                  {item.part}
                </div>
                {meta && (
                  <div className="text-[11px] font-semibold text-content-muted">
                    {meta.name}
                  </div>
                )}
              </div>
              <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-extrabold ${prof.badgeClass}`}>
                {prof.label}
              </span>
            </div>

            {/* Score & Ratio */}
            <div className="mt-3 flex items-baseline justify-between text-xs">
              <span className="font-semibold text-content-muted">
                Số câu đúng:
              </span>
              <div className="flex items-baseline gap-1">
                <span className="font-black text-content tabular-nums">
                  {item.correct}/{item.total}
                </span>
                <span className="text-[11px] font-extrabold text-content-muted">
                  ({percent}%)
                </span>
              </div>
            </div>

            {/* Thanh đo tiến độ tỷ lệ đúng */}
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-line/40 dark:bg-line/20">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${prof.barColorClass}`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="rounded-3xl border border-line bg-surface p-6 shadow-xs sm:p-7 space-y-6">
      <div>
        <h2 className="text-base font-black tracking-tight text-content sm:text-lg">
          Phân tích kết quả theo từng phần thi
        </h2>
        <p className="mt-0.5 text-xs text-content-muted">
          Đánh giá mức độ thành thạo và tỷ lệ trả lời đúng theo từng dạng câu hỏi trong bài thi TOEIC.
        </p>
      </div>

      {/* Cụm Kỹ năng Nghe nếu có */}
      {hasListening && listeningParts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">
            <Headphones className="size-4 text-amber-500" />
            <span>Kỹ năng Nghe (Listening Comprehension · Part 1 - 4)</span>
          </div>
          {renderPartGrid(listeningParts)}
        </div>
      )}

      {/* Cụm Kỹ năng Đọc nếu có */}
      {hasReading && readingParts.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-sky-700 dark:text-sky-300">
            <BookOpen className="size-4 text-sky-500" />
            <span>Kỹ năng Đọc (Reading Comprehension · Part 5 - 7)</span>
          </div>
          {renderPartGrid(readingParts)}
        </div>
      )}
    </div>
  );
};

