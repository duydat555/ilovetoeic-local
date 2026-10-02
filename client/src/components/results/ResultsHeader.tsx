import React from 'react';
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  History,
  PlayCircle,
  RotateCcw,
  Trash2,
  Trophy,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ALL_TEST_PARTS, normalizeTestParts } from '../../utils/testScope';

export interface ResultsHeaderProps {
  testTitle?: string;
  testName?: string;
  testYear?: number;
  testId?: string;
  attemptId?: string;
  selectedParts?: number[];
  isPartial?: boolean;
  completedAt?: string;
  timeSpentSeconds?: number;
  accuracyRate: number;
  totalScore?: number;
  listeningScore?: number;
  readingScore?: number;
  correctAnswers: number;
  wrongAnswers?: number;
  skippedAnswers?: number;
  totalQuestions: number;
  onRetake?: () => void;
  onViewHistory?: () => void;
  onDeleteAttempt?: () => void;
  onPracticeWrong?: () => void;
}

/**
 * Định dạng tên đề thi hiển thị tự nhiên, chuẩn mực
 */
export const formatTestDisplayName = (
  testTitle?: string,
  testName?: string,
  testYear?: number,
): string => {
  const nameCandidate = (testName || '').trim();
  const titleCandidate = (testTitle || '').trim();

  const isUuid = (str: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

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
    return `${cleanName} · Năm ${testYear}`;
  }

  return cleanName;
};

/**
 * Mô tả nội dung phần thi đã làm (Nghe, Đọc, hoặc các Part cụ thể)
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
      scopeText: 'Bài thi toàn phần (Listening + Reading · 200 câu)',
      shortBadge: 'Toàn bộ 7 Part',
      hasListening: true,
      hasReading: true,
    };
  }

  if (listeningParts.length === 4 && readingParts.length === 0) {
    return {
      scopeText: `Kỹ năng Nghe (Listening · Part 1 - 4 · ${totalQuestions || 100} câu)`,
      shortBadge: 'Toàn bộ Listening',
      hasListening: true,
      hasReading: false,
    };
  }

  if (readingParts.length === 3 && listeningParts.length === 0) {
    return {
      scopeText: `Kỹ năng Đọc (Reading · Part 5 - 7 · ${totalQuestions || 100} câu)`,
      shortBadge: 'Toàn bộ Reading',
      hasListening: false,
      hasReading: true,
    };
  }

  const skillSuffix =
    hasListening && hasReading
      ? 'Nghe & Đọc'
      : hasListening
      ? 'Nghe hiểu'
      : 'Đọc hiểu';

  const partsListStr = parts.map((p) => `Part ${p}`).join(', ');

  return {
    scopeText: `Luyện tập chuyên sâu: ${partsListStr} (${skillSuffix} · ${totalQuestions || 0} câu)`,
    shortBadge: partsListStr,
    hasListening,
    hasReading,
  };
};

export const formatScopeDescription = formatScopeSummary;

/**
 * Định dạng thời gian làm bài sang tiếng Việt tự nhiên
 */
export const formatDurationVietnamese = (seconds?: number): string => {
  if (!seconds || seconds <= 0) return 'Dưới 1 phút';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = seconds % 60;
  if (hours > 0) {
    return `${hours} giờ ${minutes > 0 ? `${minutes} phút` : ''}`.trim();
  }
  if (minutes > 0) {
    return `${minutes} phút ${remaining > 0 ? `${remaining} giây` : ''}`.trim();
  }
  return `${remaining} giây`;
};

/**
 * Định dạng thời điểm nộp bài
 */
export const formatCompletedAtVietnamese = (dateStr?: string): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d);
};

/**
 * Đánh giá năng lực theo chuẩn TOEIC thực tế (CEFR / Thang điểm ETS)
 */
const getToeicEvaluation = (isFullTest: boolean, totalScore: number, accuracyRate: number) => {
  if (isFullTest) {
    if (totalScore >= 850) {
      return {
        level: 'Xuất sắc · Tương đương C1',
        description: 'Khả năng giao tiếp tiếng Anh chuyên nghiệp, trôi chảy và chuẩn xác trong môi trường quốc tế.',
        tagClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
        ringColor: 'text-emerald-500',
      };
    }
    if (totalScore >= 785) {
      return {
        level: 'Rất tốt · Tương đương B2',
        description: 'Giao tiếp làm việc hiệu quả, đáp ứng hầu hết các yêu cầu công việc tại doanh nghiệp đa quốc gia.',
        tagClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
        ringColor: 'text-amber-500',
      };
    }
    if (totalScore >= 605) {
      return {
        level: 'Khá tốt · Tương đương B1',
        description: 'Đáp ứng tốt các tình huống giao tiếp thường ngày và văn phòng cơ bản.',
        tagClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
        ringColor: 'text-amber-500',
      };
    }
    if (totalScore >= 405) {
      return {
        level: 'Trung cấp · Tương đương A2',
        description: 'Hiểu các thông điệp cơ bản, cần tăng cường từ vựng và luyện tập tốc độ xử lý câu hỏi.',
        tagClass: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
        ringColor: 'text-sky-500',
      };
    }
    return {
      level: 'Cần nỗ lực rèn luyện thêm',
      description: 'Nên tập trung củng cố nền tảng ngữ pháp, học từ vựng theo chủ đề và luyện nghe từng Part ngắn.',
      tagClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
      ringColor: 'text-rose-500',
    };
  }

  // Chế độ luyện tập từng phần
  if (accuracyRate >= 85) {
    return {
      level: 'Nắm rất vững kiến thức',
      description: 'Độ chính xác rất cao! Bạn đã làm chủ tốt dạng bài này.',
      tagClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
      ringColor: 'text-emerald-500',
    };
  }
  if (accuracyRate >= 65) {
    return {
      level: 'Kết quả khá tốt',
      description: 'Bạn đã nắm được phần lớn kiến thức, hãy xem lại các câu sai để rút kinh nghiệm.',
      tagClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
      ringColor: 'text-amber-500',
    };
  }
  return {
    level: 'Cần luyện tập thêm',
    description: 'Hãy xem kỹ phần giải thích chi tiết và dịch nghĩa bên dưới để nắm chắc lý thuyết.',
    tagClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
    ringColor: 'text-rose-500',
  };
};

/**
 * Biểu đồ vòng tròn tiến độ SVG tỉ lệ % tinh tế
 */
const CircularScoreRing: React.FC<{
  percentage: number;
  size?: number;
  strokeWidth?: number;
  ringColorClass?: string;
  children?: React.ReactNode;
}> = ({ percentage, size = 104, strokeWidth = 8, ringColorClass = 'text-amber-500', children }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const safePercent = Math.max(0, Math.min(100, percentage));
  const offset = circumference - (safePercent / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90 transform">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-line/40 dark:text-line/20"
          fill="transparent"
        />
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

export const ResultsHeader: React.FC<ResultsHeaderProps> = ({
  testTitle,
  testName,
  testYear,
  testId,
  selectedParts,
  isPartial,
  completedAt,
  timeSpentSeconds,
  accuracyRate,
  totalScore = 0,
  listeningScore = 0,
  readingScore = 0,
  correctAnswers,
  wrongAnswers,
  totalQuestions,
  onRetake,
  onViewHistory,
  onDeleteAttempt,
  onPracticeWrong,
}) => {
  const navigate = useNavigate();
  const displayName = formatTestDisplayName(testTitle, testName, testYear);
  const scopeInfo = formatScopeSummary(selectedParts, totalQuestions);
  const isFull200 = !isPartial && totalQuestions === 200;
  const evalInfo = getToeicEvaluation(isFull200, totalScore, accuracyRate);

  const handleRetakeClick = () => {
    if (onRetake) {
      onRetake();
    } else if (testId) {
      const parts = normalizeTestParts(selectedParts || ALL_TEST_PARTS);
      const scopeParam = parts.length === 7 ? 'all' : parts.join(',');
      navigate(`/practice/runner/${scopeParam}?testId=${encodeURIComponent(testId)}`);
    } else {
      navigate('/mock-test');
    }
  };

  const handleViewHistoryClick = () => {
    if (onViewHistory) {
      onViewHistory();
    } else if (testId) {
      navigate(`/mock-test?tab=history&testId=${encodeURIComponent(testId)}`);
    } else {
      navigate('/mock-test?tab=history');
    }
  };

  const scorePercent = isFull200
    ? Math.round((totalScore / 990) * 100)
    : accuracyRate;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-line bg-surface p-6 sm:p-8 shadow-xs">
      <div className="relative z-10 space-y-6">
        {/* Hàng 1: Thanh trạng thái & Nút thao tác nhanh */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-line/60 pb-5">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => navigate('/mock-test')}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 font-bold text-content-muted transition hover:bg-surface-hover hover:text-content"
            >
              <span>← Kho đề thi</span>
            </button>

            <span className="text-content-muted/40">/</span>

            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 font-extrabold text-amber-700 dark:text-amber-300">
              <Trophy className="size-3.5" />
              <span>Bảng điểm kết quả</span>
            </div>

            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-extrabold ${evalInfo.tagClass}`}>
              <Award className="size-3" />
              <span>{evalInfo.level}</span>
            </span>
          </div>

          {/* Cụm nút hành động */}
          <div className="flex flex-wrap items-center gap-2">
            {onDeleteAttempt && (
              <button
                type="button"
                onClick={onDeleteAttempt}
                className="inline-flex items-center gap-1.5 rounded-xl border border-negative/20 bg-negative/5 px-3 py-2 text-xs font-bold text-negative transition hover:bg-negative/15 hover:border-negative/40 shadow-2xs"
                title="Xoá kết quả lượt làm bài này"
              >
                <Trash2 className="size-3.5" />
                <span>Xoá kết quả này</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleViewHistoryClick}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 py-2 text-xs font-bold text-content transition hover:bg-surface-hover hover:border-amber-400/50 shadow-2xs"
            >
              <History className="size-3.5 text-content-muted" />
              <span>Lịch sử làm bài</span>
            </button>

            <button
              type="button"
              onClick={handleRetakeClick}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 py-2 text-xs font-bold text-content transition hover:bg-surface-hover hover:border-amber-400/50 shadow-2xs"
            >
              <RotateCcw className="size-3.5 text-content-muted" />
              <span>Làm lại bài này</span>
            </button>

            {wrongAnswers !== undefined && wrongAnswers > 0 && onPracticeWrong && (
              <button
                type="button"
                onClick={onPracticeWrong}
                className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-black text-brand-ink shadow-2xs transition hover:bg-accent-hover hover:shadow-xs"
              >
                <PlayCircle className="size-3.5" />
                <span>Luyện {wrongAnswers} câu sai</span>
              </button>
            )}
          </div>
        </div>

        {/* Hàng 2: Tên đề thi, Thông tin bài làm & Khối điểm số Hero */}
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          {/* Cột trái: Tên đề thi + Nhãn bài thi + Lời nhận xét */}
          <div className="space-y-3.5">
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Chứng chỉ kết quả luyện thi
              </div>
              <h1 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-content leading-snug">
                {displayName}
              </h1>
            </div>

            {/* Các thẻ thông tin bài thi (Metadata hiển thị tự nhiên) */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1 font-semibold text-content-muted">
                <BookOpen className="size-3.5 text-amber-500" />
                <span>{scopeInfo.scopeText}</span>
              </span>

              {completedAt && (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1 font-semibold text-content-muted">
                  <Calendar className="size-3.5 text-content-muted" />
                  <span>Nộp bài: {formatCompletedAtVietnamese(completedAt)}</span>
                </span>
              )}

              {timeSpentSeconds !== undefined && timeSpentSeconds > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1 font-semibold text-content-muted">
                  <Clock className="size-3.5 text-content-muted" />
                  <span>Thời gian: {formatDurationVietnamese(timeSpentSeconds)}</span>
                </span>
              )}
            </div>

            {/* Lời nhận xét & khuyến khích học tập */}
            <p className="text-xs leading-relaxed text-content-muted sm:text-sm font-medium">
              {evalInfo.description}
            </p>
          </div>

          {/* Cột phải: Khối điểm Hero với vòng tròn tiến độ SVG */}
          <div className="flex items-center justify-start lg:justify-end">
            <div className="flex items-center gap-5 rounded-2xl border border-line bg-surface/90 p-4 sm:p-5 shadow-xs backdrop-blur-sm">
              <CircularScoreRing
                percentage={scorePercent}
                size={104}
                strokeWidth={8}
                ringColorClass={evalInfo.ringColor}
              >
                <span className="text-2xl font-black tracking-tight text-content tabular-nums">
                  {isFull200 ? totalScore : `${accuracyRate}%`}
                </span>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-content-muted">
                  {isFull200 ? 'Thang 990' : 'Chính xác'}
                </span>
              </CircularScoreRing>

              <div className="space-y-1.5">
                <div className="text-xs font-extrabold text-content">
                  {isFull200 ? 'Tổng điểm đạt được' : 'Tỷ lệ trả lời đúng'}
                </div>

                {isFull200 ? (
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between gap-4 font-bold text-content">
                      <span className="text-content-muted">Nghe (Listening):</span>
                      <span className="font-extrabold text-amber-600 dark:text-amber-400 tabular-nums">
                        {listeningScore} / 495
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4 font-bold text-content">
                      <span className="text-content-muted">Đọc (Reading):</span>
                      <span className="font-extrabold text-sky-600 dark:text-sky-400 tabular-nums">
                        {readingScore} / 495
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs font-semibold text-content-muted">
                    Đúng <strong className="text-content font-extrabold">{correctAnswers}</strong> trên tổng số{' '}
                    <strong className="text-content font-extrabold">{totalQuestions}</strong> câu
                  </div>
                )}

                <div className="pt-1 flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-3.5" />
                  <span>Đã chấm điểm chi tiết</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
