import React from 'react';
import { Trophy } from 'lucide-react';
import { ALL_TEST_PARTS, normalizeTestParts } from '../../utils/testScope';

export interface ResultsHeaderProps {
  testTitle?: string;
  testName?: string;
  testYear?: number;
  testId?: string;
  selectedParts?: number[];
  isPartial?: boolean;
  completedAt?: string;
  accuracyRate: number;
  totalScore?: number;
  correctAnswers: number;
  totalQuestions: number;
}

/**
 * Định dạng tên đề thi dễ đọc, không rò rỉ mã UUID
 */
export const formatTestDisplayName = (
  testTitle?: string,
  testName?: string,
  testYear?: number,
): string => {
  const nameCandidate = (testName || '').trim();
  const titleCandidate = (testTitle || '').trim();

  const isUuid = (str: string) => /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(str);

  let cleanName = '';

  if (nameCandidate && !isUuid(nameCandidate)) {
    cleanName = nameCandidate;
  } else if (titleCandidate && !isUuid(titleCandidate)) {
    cleanName = titleCandidate.replace(/^Đề thi\s+/i, '').trim();
  }

  if (!cleanName || isUuid(cleanName)) {
    cleanName = 'Đề thi TOEIC';
  }

  if (testYear && !cleanName.includes(String(testYear))) {
    return `${cleanName} - ${testYear}`;
  }

  return cleanName;
};

/**
 * Phân tích nhãn phạm vi làm bài
 */
export const formatScopeSummary = (partsInput?: readonly number[], totalQuestions?: number) => {
  const parts = normalizeTestParts(partsInput || ALL_TEST_PARTS);
  const isFullTest = parts.length === 7;

  const listeningParts = parts.filter((p) => p <= 4);
  const readingParts = parts.filter((p) => p >= 5);

  const hasListening = listeningParts.length > 0;
  const hasReading = readingParts.length > 0;

  if (isFullTest) {
    return {
      scopeText: 'Phạm vi: Toàn bộ đề thi (Listening + Reading) · 200 câu',
      hasListening: true,
      hasReading: true,
    };
  }

  if (listeningParts.length === 4 && readingParts.length === 0) {
    return {
      scopeText: `Phạm vi: Listening · ${totalQuestions || 100} câu`,
      hasListening: true,
      hasReading: false,
    };
  }

  if (readingParts.length === 3 && listeningParts.length === 0) {
    return {
      scopeText: `Phạm vi: Reading · ${totalQuestions || 100} câu`,
      hasListening: false,
      hasReading: true,
    };
  }

  const skillSuffix = hasListening && hasReading
    ? 'Listening + Reading'
    : hasListening
    ? 'Listening'
    : 'Reading';

  const partsListStr = parts.map((p) => `Part ${p}`).join(', ');

  return {
    scopeText: `Phạm vi: ${partsListStr} (${skillSuffix}) · ${totalQuestions || 0} câu`,
    hasListening,
    hasReading,
  };
};

export const formatScopeDescription = formatScopeSummary;

/**
 * Biểu đồ vòng tròn tiến độ SVG hiển thị tỷ lệ % trực quan
 */
const CircularProgressRing: React.FC<{
  percentage: number;
  size?: number;
  strokeWidth?: number;
  ringColorClass?: string;
  children?: React.ReactNode;
}> = ({ percentage, size = 100, strokeWidth = 8, ringColorClass = 'text-brand-ink', children }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const safePercent = Math.max(0, Math.min(100, percentage));
  const offset = circumference - (safePercent / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90 transform">
        {/* Đường tròn nền */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-brand-ink/20"
          fill="transparent"
        />
        {/* Đường tròn tiến độ */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`transition-all duration-1000 ease-out ${ringColorClass}`}
          fill="transparent"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  );
};

/**
 * Cấu hình nhãn trạng thái đồng bộ hoàn toàn với màu chủ đạo vàng cam (Brand Primary) & màu nhấn hệ thống
 */
const getResultStatus = (accuracyRate: number) => {
  if (accuracyRate >= 70) {
    return {
      statusText: 'Xuất sắc',
      statusTagBg: 'bg-emerald-600/25 text-emerald-950 border-emerald-700/40',
      ringColor: 'text-emerald-800 dark:text-emerald-400',
      subText: 'Hoàn thành xuất sắc bài thi!',
    };
  }
  if (accuracyRate >= 40) {
    return {
      statusText: 'Khá tốt',
      statusTagBg: 'bg-amber-600/25 text-amber-950 border-amber-700/40',
      ringColor: 'text-brand-ink',
      subText: 'Kết quả đạt mức khá',
    };
  }
  return {
    statusText: 'Cần cố gắng',
    statusTagBg: 'bg-rose-600/25 text-rose-950 border-rose-700/40',
    ringColor: 'text-rose-800 dark:text-rose-400',
    subText: 'Cần tiếp tục luyện tập',
  };
};

export const ResultsHeader: React.FC<ResultsHeaderProps> = ({
  testTitle,
  testName,
  testYear,
  selectedParts,
  isPartial,
  completedAt,
  accuracyRate,
  totalScore,
  correctAnswers,
  totalQuestions,
}) => {
  const displayName = formatTestDisplayName(testTitle, testName, testYear);
  const scopeInfo = formatScopeSummary(selectedParts, totalQuestions);
  const isFullyCompleted200 = !isPartial && totalQuestions >= 200;
  const statusInfo = getResultStatus(accuracyRate);

  // Tạo dòng thông tin phụ duy nhất gộp gọn
  const sublineParts = [scopeInfo.scopeText];
  if (completedAt) {
    sublineParts.push(`Hoàn thành lúc ${completedAt}`);
  }
  const unifiedSubline = sublineParts.join(' · ');

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-brand-400/40 bg-[linear-gradient(125deg,#e5ad00,#ffd13f)] p-6 pb-12 sm:p-7 sm:pb-14 text-brand-ink shadow-[0_24px_60px_-25px_rgba(138,94,21,0.6)] transition-all duration-300">
      {/* Họa tiết vòng tròn trang trí chìm đặc trưng hệ thống */}
      <div className="pointer-events-none absolute -right-20 -top-32 size-80 rounded-full border-[52px] border-white/[0.08]" />

      <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
        {/* Cột trái (65% width): Nhãn loại trang -> Tiêu đề lớn -> Dòng phụ gộp gọn duy nhất */}
        <div className="space-y-3 md:max-w-[65%]">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-ink/15 bg-white/25 px-3.5 py-1 text-xs font-black text-brand-ink backdrop-blur-md shadow-2xs">
            <Trophy className="size-3.5 fill-amber-600 text-amber-700" />
            <span>Kết quả bài thi thử TOEIC</span>
            <span className={`ml-1.5 rounded-md border px-2 py-0.5 text-[10px] font-black uppercase ${statusInfo.statusTagBg}`}>
              {statusInfo.statusText}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-brand-ink leading-tight">
            {displayName}
          </h1>

          <p className="text-xs font-bold text-brand-ink/85 sm:text-sm leading-relaxed">
            {unifiedSubline}
          </p>
        </div>

        {/* Cột phải (35% width): Khối độ chính xác thiết kế mượt mà theo tone màu chủ đạo vàng cam */}
        <div className="flex shrink-0 items-center justify-center md:justify-end">
          <div className="flex items-center gap-4 rounded-3xl border border-brand-ink/15 bg-white/25 px-5 py-4 backdrop-blur-md shadow-xs text-brand-ink">
            <CircularProgressRing
              percentage={accuracyRate}
              size={88}
              strokeWidth={7}
              ringColorClass={statusInfo.ringColor}
            >
              <span className="text-xl font-black tracking-tight text-brand-ink">
                {isFullyCompleted200 ? (totalScore || 0) : `${accuracyRate}%`}
              </span>
              <span className="text-[9px] font-extrabold uppercase opacity-80 text-brand-ink">
                {isFullyCompleted200 ? 'điểm' : 'chính xác'}
              </span>
            </CircularProgressRing>

            <div className="space-y-1 text-left">
              <div className="text-xs font-extrabold uppercase tracking-wider opacity-80 text-brand-ink">
                {isFullyCompleted200 ? 'Thang điểm 990' : 'Độ chính xác'}
              </div>
              <div className="text-base font-black text-brand-ink">
                {isFullyCompleted200
                  ? `${totalScore || 0} điểm`
                  : `${correctAnswers}/${totalQuestions} câu đúng`}
              </div>
              <div className="text-[11px] font-bold opacity-85 text-brand-ink/90">
                {statusInfo.subText}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
