import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Calendar,
  Clock,
  Eye,
  History,
  RotateCcw,
  Target,
  Trash2,
  TrendingUp,
  Trophy,
  AlertCircle,
  AlertTriangle,
  BookOpen,
  ChevronDown,
  Headphones,
  Loader2,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { BoneyardSkeleton } from '../../../components/common/BoneyardSkeleton';
import { TopToast } from '../../../components/common/TopToast';
import { getModalMotion } from '../../../components/common/modalMotion';
import { backendService } from '../../../services/backend';
import { MockTestItem, StudyAttempt } from '../../../types';
import { getTestHistoryAttemptId, storage } from '../../../utils/storage';
import { deleteTestPracticeSessions, deleteAllPracticeSessions } from '../../../utils/practiceSessions';
import { normalizeTestParts, serializeTestPartScope } from '../../../utils/testScope';

interface MockTestHistoryViewProps {
  userId?: string;
  allTests: MockTestItem[];
  filteredTestId?: string | null;
  filteredTestYear?: number | null;
  onClearTestFilter?: () => void;
  onSwitchToLibrary: () => void;
  onRetakeTest?: (testId: string) => void;
}

const formatDuration = (seconds: number) => {
  if (!seconds || seconds <= 0) return '0 giây';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = seconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${remaining}s`;
  return `${remaining}s`;
};

const formatCompletedAt = (value: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

export const MockTestHistoryView: React.FC<MockTestHistoryViewProps> = ({
  userId,
  allTests,
  filteredTestId,
  filteredTestYear,
  onClearTestFilter,
  onSwitchToLibrary,
  onRetakeTest,
}) => {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const modalMotion = getModalMotion(reduceMotion);

  const [attempts, setAttempts] = useState<StudyAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters & Sorting
  const [modeFilter, setModeFilter] = useState<'all' | 'exam' | 'practice'>('all');
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>(() => {
    if (filteredTestYear) return String(filteredTestYear);
    if (filteredTestId) {
      const found = allTests.find((t) => t.id === filteredTestId);
      if (found && found.year) return String(found.year);
    }
    return 'all';
  });
  const [selectedTestId, setSelectedTestId] = useState<string>(filteredTestId || 'all');
  const [sortBy, setSortBy] = useState<'newest' | 'highest_score' | 'highest_accuracy'>('newest');

  // Single attempt delete state
  const [deleteTarget, setDeleteTarget] = useState<StudyAttempt | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Bulk delete state
  const [bulkDeleteTarget, setBulkDeleteTarget] = useState<{
    type: 'test' | 'all';
    testId?: string;
    testTitle?: string;
    count: number;
  } | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDeleteError, setBulkDeleteError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const historyRequestGeneration = React.useRef(0);

  // Lock scroll & handle Escape key for modals (modal motion contract)
  useEffect(() => {
    if (!deleteTarget && !bulkDeleteTarget) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (deleteTarget && !deleting) setDeleteTarget(null);
        if (bulkDeleteTarget && !bulkDeleting) setBulkDeleteTarget(null);
      }
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [deleteTarget, bulkDeleteTarget, deleting, bulkDeleting]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(''), 3200);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Available unique years sorted descending
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    allTests.forEach((t) => {
      if (Number.isFinite(t.year) && t.year > 0) yearsSet.add(t.year);
    });
    attempts.forEach((a) => {
      const yr = a.testYear || (a.metadata?.test_year as number | undefined);
      if (Number.isFinite(yr) && yr! > 0) yearsSet.add(yr!);
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [allTests, attempts]);

  // Sync props into state if changed externally
  useEffect(() => {
    if (filteredTestId) {
      setSelectedTestId(filteredTestId);
      const found = allTests.find((t) => t.id === filteredTestId);
      if (found && found.year) {
        setSelectedYearFilter(String(found.year));
      }
    } else {
      setSelectedTestId('all');
    }
  }, [filteredTestId, allTests]);

  useEffect(() => {
    if (filteredTestYear) {
      setSelectedYearFilter(String(filteredTestYear));
    }
  }, [filteredTestYear]);

  // Load study history: kết hợp dữ liệu từ database và local storage
  const loadHistory = async (isSilent = false) => {
    const generation = ++historyRequestGeneration.current;
    if (!isSilent && attempts.length === 0) {
      setLoading(true);
    }
    setError('');
    try {
      // 1. Đọc lịch sử đã lưu tại trình duyệt
      const localAttempts: StudyAttempt[] = storage.getTestHistory().map((item, index) => {
        const listeningPart = item.partBreakdown?.find((p) => p.part.toLowerCase().includes('listening'));
        const readingPart = item.partBreakdown?.find((p) => p.part.toLowerCase().includes('reading'));
        const totalQ = item.questionIds?.length || (item.correctAnswers + item.wrongAnswers + item.skippedAnswers);
        const attId = getTestHistoryAttemptId(item, index);
        return {
          id: attId,
          userId: userId || 'local',
          testId: item.testId,
          testName: item.testName || item.testTitle,
          testYear: item.testYear,
          mode: ((item as any).mode || 'exam') as 'exam' | 'practice',
          totalQuestions: totalQ,
          answeredQuestions: item.correctAnswers + item.wrongAnswers,
          correctAnswers: item.correctAnswers,
          accuracyRate: item.accuracyRate,
          timeSpentSeconds: item.timeSpentSeconds,
          listeningCorrect: listeningPart?.correct || 0,
          readingCorrect: readingPart?.correct || 0,
          listeningScore: item.listeningScore,
          readingScore: item.readingScore,
          totalScore: item.totalScore,
          answers: item.answers || {},
          questionIds: item.questionIds || [],
          completedAt: item.completedAt,
          metadata: {
            test_name: item.testTitle,
            test_year: item.testYear,
            selected_parts: item.selectedParts,
            is_partial: item.isPartial,
          },
        };
      });

      // 2. Tải lịch sử từ database nếu đã đăng nhập
      let serverAttempts: StudyAttempt[] = [];
      if (userId) {
        try {
          const data = await backendService.getStudyHistory(userId);
          if (data && Array.isArray(data)) {
            serverAttempts = data;
          }
        } catch (err) {
          console.warn('[!] Không thể tải lịch sử từ MySQL, dùng bản ghi local:', err);
        }
      }

      // 3. Hợp nhất: bản ghi server ghi đè bản ghi local nếu trùng id
      const attemptMap = new Map<string, StudyAttempt>();
      localAttempts.forEach((a) => attemptMap.set(a.id, a));
      serverAttempts.forEach((a) => attemptMap.set(a.id, a));

      const merged = Array.from(attemptMap.values()).sort(
        (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
      );
      if (generation === historyRequestGeneration.current) setAttempts(merged);
    } catch {
      if (generation === historyRequestGeneration.current) setError('Lỗi khi tải lịch sử làm bài.');
    } finally {
      if (generation === historyRequestGeneration.current) setLoading(false);
    }
  };

  useEffect(() => {
    void loadHistory(false);
  }, [userId]);

  useEffect(() => {
    const handleUpdate = () => {
      void loadHistory(true);
    };
    window.addEventListener('wrong-questions-updated', handleUpdate);
    return () => {
      window.removeEventListener('wrong-questions-updated', handleUpdate);
    };
  }, [userId]);

  // Handle deleting a single attempt (resilient)
  const handleDeleteAttempt = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setDeleteError('');
    try {
      if (userId) await backendService.deleteSingleStudyAttempt(deleteTarget.id);
      historyRequestGeneration.current += 1;
      storage.deleteSingleAttempt(deleteTarget.id);

      // Cập nhật state UI only after the authoritative server confirms deletion.
      setAttempts((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      setToastMessage('Đã xoá lượt làm bài thành công.');
      setDeleteTarget(null);
      window.dispatchEvent(new CustomEvent('wrong-questions-updated'));
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi xoá lượt làm bài.');
    } finally {
      setDeleting(false);
    }
  };

  // Handle bulk deleting history for a specific test or all tests (resilient)
  const handleConfirmBulkDelete = async () => {
    if (!bulkDeleteTarget || bulkDeleting) return;
    setBulkDeleting(true);
    setBulkDeleteError('');
    try {
      if (bulkDeleteTarget.type === 'test' && bulkDeleteTarget.testId) {
        const tId = String(bulkDeleteTarget.testId).trim().toLowerCase();

        const res = userId
          ? await backendService.deleteTestStudyHistory(tId)
          : { success: true, deletedCount: 0 };
        const serverDeleted = res?.deletedCount || 0;
        historyRequestGeneration.current += 1;

        // Clear local mirrors after the server transaction succeeds. The backend
        // collection delete already handles wrong questions and practice sessions.
        const localDeleted = storage.deleteTestHistory(tId);
        storage.clearExamDraftsForTest(tId);
        deleteTestPracticeSessions(tId);

        setAttempts((prev) => prev.filter((a) => String(a.testId || '').trim().toLowerCase() !== tId));
        const totalDeleted = Math.max(serverDeleted, localDeleted, bulkDeleteTarget.count);
        setToastMessage(
          totalDeleted > 0
            ? `Đã xoá ${totalDeleted} lượt làm và dữ liệu liên quan của ${bulkDeleteTarget.testTitle || 'đề thi'}.`
            : `Đã dọn sạch dữ liệu của ${bulkDeleteTarget.testTitle || 'đề thi'}.`,
        );
        setBulkDeleteTarget(null);
        window.dispatchEvent(new CustomEvent('wrong-questions-updated'));
      } else {
        // Delete all history on the server first; only then clear local mirrors.
        const res = userId
          ? await backendService.deleteAllStudyHistory('all')
          : { success: true, deletedCount: 0 };
        const serverDeleted = res?.deletedCount || 0;
        historyRequestGeneration.current += 1;
        storage.clearAllTestHistory();
        storage.clearAllExamDrafts();
        deleteAllPracticeSessions();

        setAttempts([]);
        setToastMessage(`Đã dọn sạch toàn bộ ${serverDeleted || bulkDeleteTarget.count} lượt làm bài thi.`);
        setBulkDeleteTarget(null);
        window.dispatchEvent(new CustomEvent('wrong-questions-updated'));
      }
    } catch (err) {
      setBulkDeleteError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi xoá lịch sử làm bài.');
    } finally {
      setBulkDeleting(false);
    }
  };

  // Change Year Filter Handler
  const handleYearChange = (newYear: string) => {
    setSelectedYearFilter(newYear);
    if (newYear !== 'all') {
      const yr = Number(newYear);
      if (selectedTestId !== 'all') {
        const curTest = allTests.find((t) => t.id === selectedTestId);
        if (curTest && curTest.year !== yr) {
          setSelectedTestId('all');
          if (onClearTestFilter) onClearTestFilter();
        }
      }
    }
  };

  // Tests available under the selected year
  const testsForSelectedYear = useMemo(() => {
    if (selectedYearFilter === 'all') return allTests;
    const yr = Number(selectedYearFilter);
    return allTests.filter((t) => t.year === yr);
  }, [allTests, selectedYearFilter]);

  // Attempts filtered by year only
  const filteredAttemptsByYear = useMemo(() => {
    if (selectedYearFilter === 'all') return attempts;
    const yr = Number(selectedYearFilter);
    return attempts.filter((a) => {
      const attemptYear =
        a.testYear ||
        allTests.find((t) => t.id === a.testId)?.year ||
        (a.metadata?.test_year as number | undefined);
      return attemptYear === yr;
    });
  }, [attempts, selectedYearFilter, allTests]);

  // Filtered & Sorted attempts
  const filteredAttempts = useMemo(() => {
    return attempts
      .filter((attempt) => {
        // Mode filter
        if (modeFilter !== 'all' && attempt.mode !== modeFilter) return false;

        // Year filter
        if (selectedYearFilter !== 'all') {
          const yr = Number(selectedYearFilter);
          const attemptYear =
            attempt.testYear ||
            allTests.find((t) => t.id === attempt.testId)?.year ||
            (attempt.metadata?.test_year as number | undefined);
          if (attemptYear !== yr) return false;
        }

        // Test ID filter
        if (selectedTestId !== 'all' && attempt.testId !== selectedTestId) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'highest_score') {
          return (b.totalScore || 0) - (a.totalScore || 0);
        }
        if (sortBy === 'highest_accuracy') {
          return (b.accuracyRate || 0) - (a.accuracyRate || 0);
        }
        // newest (default)
        return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
      });
  }, [attempts, modeFilter, selectedYearFilter, selectedTestId, sortBy, allTests]);

  const hasActiveFilters =
    selectedYearFilter !== 'all' || selectedTestId !== 'all' || modeFilter !== 'all';

  const resetAllFilters = () => {
    setSelectedYearFilter('all');
    setSelectedTestId('all');
    setModeFilter('all');
    if (onClearTestFilter) onClearTestFilter();
  };

  // Overall Statistics from DB data
  const stats = useMemo(() => {
    if (!attempts.length) {
      return {
        totalAttempts: 0,
        bestScore: 0,
        avgScore: 0,
        avgAccuracy: 0,
        bestListening: 0,
        bestReading: 0,
      };
    }

    const examAttempts = attempts.filter(
      (a) => a.mode === 'exam' && !a.metadata?.is_partial && (a.totalScore || 0) > 0,
    );
    const bestAttempt = examAttempts.reduce<StudyAttempt | null>((best, current) => {
      if (!best || (current.totalScore || 0) > (best.totalScore || 0)) return current;
      return best;
    }, null);

    const totalAccuracy = attempts.reduce((sum, a) => sum + (a.accuracyRate || 0), 0);
    const avgAccuracy = Math.round(totalAccuracy / attempts.length);

    const scoredAttempts = attempts.filter((a) => (a.totalScore || 0) > 0);
    const totalScoreSum = scoredAttempts.reduce((sum, a) => sum + (a.totalScore || 0), 0);
    const avgScore = scoredAttempts.length ? Math.round(totalScoreSum / scoredAttempts.length) : 0;

    return {
      totalAttempts: attempts.length,
      bestScore: bestAttempt?.totalScore || 0,
      bestListening: bestAttempt?.listeningScore || 0,
      bestReading: bestAttempt?.readingScore || 0,
      avgScore,
      avgAccuracy,
    };
  }, [attempts]);

  return (
    <div className="space-y-6">
      {/* 1. Overview KPI Cards */}
      <section className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
        {/* Total Attempts */}
        <div className="surface flex items-center gap-3 rounded-2xl border border-line p-3 sm:p-4 transition-colors hover:border-line-hover">
          <div className="grid size-10 sm:size-11 shrink-0 place-items-center rounded-xl bg-surface-elevated text-content-muted">
            <History className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-mono text-xl sm:text-2xl font-black text-content tabular-nums truncate">
              {loading ? '—' : stats.totalAttempts}
            </div>
            <div className="text-[11px] font-bold text-content-muted truncate">Tổng lượt làm</div>
          </div>
        </div>

        {/* Highest Score */}
        <div className="surface flex items-center gap-3 rounded-2xl border border-line p-3 sm:p-4 transition-colors hover:border-brand/40">
          <div className="grid size-10 sm:size-11 shrink-0 place-items-center rounded-xl bg-brand/15 text-brand-ink dark:text-brand-300">
            <Trophy className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-1 font-mono text-xl sm:text-2xl font-black text-brand-ink dark:text-brand-300 tabular-nums truncate">
              {loading ? '—' : stats.bestScore || '—'}
              {stats.bestScore > 0 && <span className="text-[10px] sm:text-xs font-bold text-content-muted">/990</span>}
            </div>
            <div className="text-[11px] font-bold text-content-muted truncate">
              {stats.bestScore > 0 ? (
                <span>
                  L:{stats.bestListening} · R:{stats.bestReading}
                </span>
              ) : (
                'Điểm cao nhất'
              )}
            </div>
          </div>
        </div>

        {/* Average Score */}
        <div className="surface flex items-center gap-3 rounded-2xl border border-line p-3 sm:p-4 transition-colors hover:border-line-hover">
          <div className="grid size-10 sm:size-11 shrink-0 place-items-center rounded-xl bg-surface-elevated text-content-muted">
            <Target className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-mono text-xl sm:text-2xl font-black text-content tabular-nums truncate">
              {loading ? '—' : stats.avgScore || '—'}
            </div>
            <div className="text-[11px] font-bold text-content-muted truncate">Điểm trung bình</div>
          </div>
        </div>

        {/* Average Accuracy */}
        <div className="surface flex items-center gap-3 rounded-2xl border border-line p-3 sm:p-4 transition-colors hover:border-positive/30">
          <div className="grid size-10 sm:size-11 shrink-0 place-items-center rounded-xl bg-positive/10 text-positive">
            <TrendingUp className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-mono text-xl sm:text-2xl font-black text-positive tabular-nums truncate">
              {loading ? '—' : `${stats.avgAccuracy}%`}
            </div>
            <div className="text-[11px] font-bold text-content-muted truncate">Độ chính xác TB</div>
          </div>
        </div>
      </section>

      {/* 2. Filter & Sort Toolbar */}
      <div className="surface rounded-2xl border border-line p-3 sm:p-3.5 space-y-2.5">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
          {/* Left: Mode Buttons */}
          <div className="inline-flex items-center rounded-xl border border-line bg-surface-elevated/70 p-1 text-xs w-fit">
            {(
              [
                { id: 'all', label: 'Tất cả' },
                { id: 'exam', label: 'Thi thử (120p)' },
                { id: 'practice', label: 'Luyện từng Part' },
              ] as const
            ).map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setModeFilter(mode.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold shrink-0 transition-colors ${
                  modeFilter === mode.id
                    ? 'bg-accent text-brand-ink shadow-xs'
                    : 'text-content-muted hover:text-content hover:bg-surface-hover'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          {/* Right: Select Year, Test, Sort, and Reset */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Year Selector */}
            <div className="relative flex items-center">
              <select
                value={selectedYearFilter}
                onChange={(e) => handleYearChange(e.target.value)}
                aria-label="Lọc theo năm thi"
                className="appearance-none cursor-pointer rounded-xl border border-line bg-surface-elevated pl-3 pr-8 py-1.5 text-xs font-semibold text-content hover:border-line-hover focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none transition-colors"
              >
                <option value="all">Tất cả năm ({attempts.length})</option>
                {availableYears.map((yr) => {
                  const count = attempts.filter((a) => {
                    const attemptYear =
                      a.testYear ||
                      allTests.find((t) => t.id === a.testId)?.year ||
                      (a.metadata?.test_year as number | undefined);
                    return attemptYear === yr;
                  }).length;
                  return (
                    <option key={yr} value={String(yr)}>
                      Năm {yr} {count > 0 ? `(${count})` : ''}
                    </option>
                  );
                })}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-content-muted" />
            </div>

            {/* Test Selector */}
            <div className="relative flex items-center">
              <select
                value={selectedTestId}
                onChange={(e) => {
                  setSelectedTestId(e.target.value);
                  if (e.target.value === 'all' && onClearTestFilter) {
                    onClearTestFilter();
                  }
                }}
                aria-label="Lọc theo đề thi"
                className="appearance-none cursor-pointer rounded-xl border border-line bg-surface-elevated pl-3 pr-8 py-1.5 text-xs font-semibold text-content hover:border-line-hover focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none transition-colors max-w-[200px] truncate"
              >
                <option value="all">
                  {selectedYearFilter !== 'all'
                    ? `Tất cả đề năm ${selectedYearFilter}`
                    : 'Tất cả đề thi'}
                </option>
                {selectedYearFilter !== 'all' ? (
                  testsForSelectedYear.map((t) => {
                    const count = attempts.filter((a) => a.testId === t.id).length;
                    return (
                      <option key={t.id} value={t.id}>
                        {t.title} {count > 0 ? `(${count})` : ''}
                      </option>
                    );
                  })
                ) : (
                  availableYears.map((yr) => {
                    const testsInYear = allTests.filter((t) => t.year === yr);
                    if (testsInYear.length === 0) return null;
                    return (
                      <optgroup key={yr} label={`Năm ${yr}`}>
                        {testsInYear.map((t) => {
                          const count = attempts.filter((a) => a.testId === t.id).length;
                          return (
                            <option key={t.id} value={t.id}>
                              {yr} · {t.title} {count > 0 ? `(${count})` : ''}
                            </option>
                          );
                        })}
                      </optgroup>
                    );
                  })
                )}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-content-muted" />
            </div>

            {/* Sort Selector */}
            <div className="relative flex items-center">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                aria-label="Sắp xếp kết quả"
                className="appearance-none cursor-pointer rounded-xl border border-line bg-surface-elevated pl-3 pr-8 py-1.5 text-xs font-semibold text-content hover:border-line-hover focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none transition-colors"
              >
                <option value="newest">Mới nhất trước</option>
                <option value="highest_score">Điểm cao nhất</option>
                <option value="highest_accuracy">Chính xác cao nhất</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-content-muted" />
            </div>

            {/* Reset Filters action button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="inline-flex items-center gap-1 rounded-xl border border-line bg-surface-elevated px-2.5 py-1.5 text-xs font-bold text-content-muted hover:text-content hover:border-line-hover transition-colors"
                title="Xoá toàn bộ bộ lọc đang áp dụng"
              >
                <RotateCcw className="size-3" />
                <span>Đặt lại</span>
              </button>
            )}

            {/* Bulk Delete for selected test */}
            {selectedTestId !== 'all' && (
              <button
                type="button"
                onClick={() => {
                  const curTest = allTests.find((t) => String(t.id).trim().toLowerCase() === String(selectedTestId).trim().toLowerCase());
                  const count = attempts.filter((a) => String(a.testId || '').trim().toLowerCase() === String(selectedTestId).trim().toLowerCase()).length;
                  setBulkDeleteError('');
                  setBulkDeleteTarget({
                    type: 'test',
                    testId: selectedTestId,
                    testTitle: curTest?.title || selectedTestId,
                    count,
                  });
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-negative/30 bg-negative/10 px-2.5 py-1.5 text-xs font-bold text-negative transition hover:bg-negative/20 hover:border-negative/50 active:scale-95"
                title="Xoá toàn bộ lượt làm bài của đề thi này"
              >
                <Trash2 className="size-3.5" />
                <span>Xoá lịch sử đề này</span>
              </button>
            )}

            {/* Bulk Delete all history */}
            {selectedTestId === 'all' && (
              <button
                type="button"
                onClick={() => {
                  if (attempts.length === 0) {
                    setToastMessage('Chưa có lịch sử làm bài thi nào để xoá.');
                    return;
                  }
                  setBulkDeleteError('');
                  setBulkDeleteTarget({
                    type: 'all',
                    count: attempts.length,
                  });
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-negative/20 bg-negative/5 px-2.5 py-1.5 text-xs font-bold text-negative transition hover:bg-negative/15 hover:border-negative/40 active:scale-95"
                title="Xoá toàn bộ lịch sử làm bài thi"
              >
                <Trash2 className="size-3.5" />
                <span className="hidden sm:inline">Xoá tất cả lịch sử{attempts.length > 0 ? ` (${attempts.length})` : ''}</span>
                <span className="sm:hidden">Xoá tất cả</span>
              </button>
            )}
          </div>
        </div>

        {/* Subtle Inline Filter Chips (Integrated into toolbar instead of clumsy banner) */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-line/60 text-xs">
            <span className="text-[11px] font-bold text-content-muted">Đang lọc:</span>
            {selectedYearFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-brand/30 bg-brand/10 px-2 py-0.5 text-[11px] font-bold text-brand-ink dark:text-brand-200">
                Năm {selectedYearFilter}
                <button
                  type="button"
                  onClick={() => handleYearChange('all')}
                  className="hover:text-negative ml-0.5"
                  aria-label="Bỏ lọc năm"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}
            {selectedTestId !== 'all' && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-brand/30 bg-brand/10 px-2 py-0.5 text-[11px] font-bold text-brand-ink dark:text-brand-200">
                Đề: {allTests.find((t) => t.id === selectedTestId)?.title || selectedTestId}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTestId('all');
                    if (onClearTestFilter) onClearTestFilter();
                  }}
                  className="hover:text-negative ml-0.5"
                  aria-label="Bỏ lọc đề thi"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}
            {modeFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface-elevated px-2 py-0.5 text-[11px] font-bold text-content">
                {modeFilter === 'exam' ? 'Thi thử 120p' : 'Luyện từng Part'}
                <button
                  type="button"
                  onClick={() => setModeFilter('all')}
                  className="hover:text-negative ml-0.5"
                  aria-label="Bỏ lọc chế độ"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}
            <span className="text-[11px] text-content-muted font-medium ml-1">
              ({filteredAttempts.length} lượt làm)
            </span>
            <button
              type="button"
              onClick={resetAllFilters}
              className="ml-auto text-[11px] font-bold text-brand-ink dark:text-brand-300 hover:underline"
            >
              Xoá bộ lọc
            </button>
          </div>
        )}
      </div>

      {/* 3. Error Banner */}
      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-negative/30 bg-negative/10 p-4 text-xs font-semibold text-negative">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 4. Attempts List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, idx) => (
            <BoneyardSkeleton
              key={idx}
              name={`history-attempt-skel-${idx}`}
              variant="card"
              height={120}
            />
          ))}
        </div>
      ) : filteredAttempts.length > 0 ? (
        <div className="space-y-3">
          {filteredAttempts.map((attempt) => {
            const isFullExam =
              attempt.mode === 'exam' &&
              !attempt.metadata?.is_partial &&
              attempt.totalQuestions >= 180;
            const wrongAnswersCount = Math.max(
              attempt.answeredQuestions - attempt.correctAnswers,
              0,
            );
            const selectedParts = Array.isArray(attempt.metadata?.selected_parts)
              ? normalizeTestParts(attempt.metadata.selected_parts.map(Number))
              : attempt.part ? [attempt.part] : [];
            const retryScope = selectedParts.length > 0
              ? serializeTestPartScope(selectedParts)
              : 'all';
            const attemptYear =
              attempt.testYear ||
              allTests.find((t) => t.id === attempt.testId)?.year ||
              (attempt.metadata?.test_year as number | undefined);
            const testTitle =
              attempt.testName ||
              (attempt.metadata?.test_name as string) ||
              allTests.find((t) => t.id === attempt.testId)?.title ||
              'Đề thi TOEIC';

            return (
              <article
                key={attempt.id}
                className="surface group relative overflow-hidden rounded-2xl border border-line p-4 sm:p-5 transition-colors hover:border-brand/40"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  {/* Left Column: Test & Mode Meta */}
                  <div className="space-y-2 lg:max-w-[35%]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-lg px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                          isFullExam
                            ? 'bg-brand/15 text-brand-ink dark:text-brand-200 border border-brand/30'
                            : 'bg-surface-elevated text-content-muted border border-line'
                        }`}
                      >
                        {isFullExam ? 'Mô phỏng 120p' : 'Luyện tập'}
                      </span>

                      {attemptYear && (
                        <span className="rounded-lg border border-brand/30 bg-brand/10 px-2 py-0.5 font-mono text-[10px] font-extrabold text-brand-ink dark:text-brand-200">
                          Năm {attemptYear}
                        </span>
                      )}

                      {attempt.metadata?.scope_label ? (
                        <span className="text-[11px] font-bold text-content-muted">
                          {String(attempt.metadata.scope_label)}
                        </span>
                      ) : attempt.part ? (
                        <span className="text-[11px] font-bold text-content-muted">
                          Part {attempt.part}
                        </span>
                      ) : null}
                    </div>

                    <h3 className="text-base font-extrabold text-content group-hover:text-brand-ink dark:group-hover:text-brand-300 transition-colors">
                      {attemptYear && !testTitle.includes(String(attemptYear))
                        ? `${testTitle} · Năm ${attemptYear}`
                        : testTitle}
                    </h3>

                    <div className="flex items-center gap-3 text-xs text-content-muted">
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3.5" />
                        {formatCompletedAt(attempt.completedAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="size-3.5" />
                        {formatDuration(attempt.timeSpentSeconds)}
                      </span>
                    </div>
                  </div>

                  {/* Middle Column: Scores & Accuracy */}
                  <div className="flex flex-wrap items-center gap-4 sm:gap-6 border-y border-line py-3 lg:border-y-0 lg:py-0">
                    {/* Total Score Badge */}
                    <div className="text-left">
                      <div className="text-[10px] font-bold text-content-muted uppercase tracking-wider">
                        {isFullExam ? 'Tổng điểm' : 'Điểm ước tính'}
                      </div>
                      <div className="flex items-baseline gap-1 font-mono text-2xl font-black text-brand-ink dark:text-brand-300 tabular-nums">
                        {attempt.totalScore ? attempt.totalScore : '—'}
                        {attempt.totalScore ? (
                          <span className="text-xs font-semibold text-content-muted">/990</span>
                        ) : null}
                      </div>
                    </div>

                    {/* Breakdown L & R */}
                    <div className="text-xs space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Headphones className="size-3 text-brand-ink dark:text-brand-300" />
                        <span className="text-content-muted">Listening:</span>
                        <strong className="font-mono text-content">
                          {attempt.listeningScore || 0}
                        </strong>
                        <span className="text-[10px] text-content-muted">
                          ({attempt.listeningCorrect || 0} câu)
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="size-3 text-positive" />
                        <span className="text-content-muted">Reading:</span>
                        <strong className="font-mono text-content">
                          {attempt.readingScore || 0}
                        </strong>
                        <span className="text-[10px] text-content-muted">
                          ({attempt.readingCorrect || 0} câu)
                        </span>
                      </div>
                    </div>

                    {/* Accuracy Rate */}
                    <div className="text-left">
                      <div className="text-[10px] font-bold text-content-muted uppercase tracking-wider">
                        Chính xác
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-base font-black text-positive tabular-nums">
                          {attempt.accuracyRate}%
                        </span>
                        <span className="text-xs text-content-muted">
                          ({attempt.correctAnswers}/{attempt.totalQuestions})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex flex-wrap items-center gap-2 justify-end">
                    {/* Review Button */}
                    <button
                      type="button"
                      onClick={() => navigate(`/results?attemptId=${encodeURIComponent(attempt.id)}`)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-3.5 py-2 text-xs font-bold text-brand-ink shadow-xs transition-all hover:bg-accent/90 active:scale-95"
                      title="Xem lại từng câu, đối chiếu đáp án và lời giải chi tiết"
                    >
                      <Eye className="size-3.5" />
                      <span>Xem đáp án</span>
                      <ArrowUpRight className="size-3 opacity-70" />
                    </button>

                    {/* Retake Button */}
                    {attempt.testId && (
                      <button
                        type="button"
                        onClick={() => {
                          if (onRetakeTest) {
                            onRetakeTest(attempt.testId!);
                          } else {
                            navigate(`/mock-test/exam/${attempt.testId}`);
                          }
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface-elevated px-3 py-2 text-xs font-bold text-content transition-all hover:bg-surface-hover active:scale-95"
                        title="Thi lại đề này"
                      >
                        <RotateCcw className="size-3.5" />
                        <span>Thi lại</span>
                      </button>
                    )}

                    {/* Practice Wrong Questions Button */}
                    {wrongAnswersCount > 0 && attempt.testId && (
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/practice/runner/${retryScope}?testId=${encodeURIComponent(attempt.testId!)}&reviewAttempt=${encodeURIComponent(attempt.id)}&reviewResult=wrong`,
                          )
                        }
                        className="inline-flex items-center gap-1.5 rounded-xl border border-negative/25 bg-negative/10 px-3 py-2 text-xs font-bold text-negative transition-all hover:bg-negative/15 active:scale-95"
                        title={`Luyện lại ${wrongAnswersCount} câu sai của đề này`}
                      >
                        <Target className="size-3.5" />
                        <span>Luyện {wrongAnswersCount} câu sai</span>
                      </button>
                    )}

                    {/* Delete single attempt button */}
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(attempt)}
                      aria-label="Xoá lượt làm bài này"
                      title="Xoá lượt làm bài này khỏi cơ sở dữ liệu"
                      className="grid size-9 place-items-center rounded-xl border border-line text-content-muted transition-colors hover:border-negative/30 hover:bg-negative/10 hover:text-negative active:scale-95"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>

                {/* Part stats miniature progress segments (if available) */}
                {attempt.partStats && attempt.partStats.length > 1 && (
                  <div className="mt-3.5 border-t border-line/60 pt-3">
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                      <span className="text-[10px] font-bold text-content-muted shrink-0">
                        Chi tiết Parts:
                      </span>
                      {attempt.partStats.map((ps) => {
                        const rate = ps.total ? Math.round((ps.correct / ps.total) * 100) : 0;
                        return (
                          <div
                            key={ps.part}
                            className="flex items-center gap-1 rounded-lg border border-line bg-surface-elevated px-2 py-0.5 text-[10px] font-semibold shrink-0"
                            title={`Part ${ps.part}: Đúng ${ps.correct}/${ps.total} câu (${rate}%)`}
                          >
                            <span className="text-content-muted">P{ps.part}:</span>
                            <span
                              className={`font-mono font-bold ${
                                rate >= 80
                                  ? 'text-positive'
                                  : rate >= 50
                                    ? 'text-brand-ink dark:text-brand-300'
                                    : 'text-negative'
                              }`}
                            >
                              {ps.correct}/{ps.total}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="rounded-3xl border border-dashed border-line bg-surface p-10 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-brand/10 text-brand-ink dark:text-brand-300">
            <History className="size-6" />
          </div>
          <h3 className="mt-4 text-base font-black text-content">
            {hasActiveFilters
              ? 'Chưa có lượt làm bài nào phù hợp với bộ lọc'
              : 'Chưa có lịch sử làm bài thi nào'}
          </h3>
          <p className="mx-auto mt-1.5 max-w-md text-xs text-content-muted leading-relaxed">
            {selectedTestId !== 'all'
              ? `Bạn chưa có lượt làm bài nào cho ${allTests.find((t) => t.id === selectedTestId)?.title || selectedTestId}${selectedYearFilter !== 'all' ? ` (Năm ${selectedYearFilter})` : ''}. Bạn có thể bắt đầu làm bài ngay để ghi nhận điểm số!`
              : hasActiveFilters
              ? 'Hãy thử đặt lại bộ lọc hoặc chọn một đề thi khác để xem các kết quả đã lưu.'
              : 'Khi bạn hoàn thành bất kỳ bài thi thử 120 phút hoặc luyện theo Part, toàn bộ kết quả và điểm số sẽ được tự động lưu vào database.'}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2.5">
            {selectedTestId !== 'all' && onRetakeTest && (
              <button
                type="button"
                onClick={() => onRetakeTest(selectedTestId)}
                className="btn-primary text-xs font-bold shadow-xs"
              >
                Làm đề này ngay
              </button>
            )}
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={resetAllFilters}
                className="btn-secondary text-xs font-bold"
              >
                Đặt lại bộ lọc
              </button>
            ) : (
              <button
                type="button"
                onClick={onSwitchToLibrary}
                className="btn-primary text-xs font-bold shadow-xs"
              >
                Bắt đầu làm bài thi ngay
              </button>
            )}
          </div>
        </div>
      )}

      {/* 5. Confirmation Modal to Delete Single Attempt (Strict modalMotion contract from AGENTS.md) */}
      {createPortal(
        <AnimatePresence>
          {deleteTarget && (
            <motion.div
              {...modalMotion.backdrop}
              className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/65 p-4 backdrop-blur-md"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget && !deleting) setDeleteTarget(null);
              }}
            >
              <motion.div
                {...modalMotion.panel}
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="delete-attempt-title"
                aria-describedby="delete-attempt-desc"
                className="relative my-auto w-full max-w-md rounded-3xl border border-line bg-surface p-6 text-content shadow-2xl"
              >
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                  aria-label="Đóng xác nhận xoá lượt làm bài"
                  className="absolute right-4 top-4 rounded-full p-2 text-content-muted transition-colors duration-200 hover:bg-surface-hover hover:text-content disabled:opacity-40"
                >
                  <X className="size-5" />
                </button>

                <div className="grid size-11 place-items-center rounded-2xl bg-negative/10 text-negative">
                  <Trash2 className="size-5" />
                </div>

                <h2 id="delete-attempt-title" className="mt-4 pr-8 text-lg font-extrabold text-content">
                  Xoá lượt làm bài này?
                </h2>

                <p id="delete-attempt-desc" className="mt-2 text-xs leading-relaxed text-content-muted">
                  Kết quả bài làm của{' '}
                  <strong className="text-content">
                    {deleteTarget.testName ||
                      (deleteTarget.metadata?.test_name as string) ||
                      'đề thi'}
                  </strong>{' '}
                  ngày{' '}
                  <strong className="text-content">
                    {formatCompletedAt(deleteTarget.completedAt)}
                  </strong>{' '}
                  (điểm số: <strong>{deleteTarget.totalScore || 0}/990</strong>, đúng{' '}
                  <strong>{deleteTarget.correctAnswers} câu</strong>) sẽ bị xoá vĩnh viễn khỏi cơ sở dữ liệu.
                </p>

                {deleteError && (
                  <p className="mt-3 rounded-xl border border-negative/30 bg-negative/10 px-3 py-2 text-xs font-semibold text-negative">
                    {deleteError}
                  </p>
                )}

                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(null)}
                    disabled={deleting}
                    className="btn-secondary justify-center text-xs disabled:opacity-40"
                  >
                    Huỷ
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteAttempt()}
                    disabled={deleting}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-negative bg-negative px-4 py-2 text-xs font-bold text-white transition hover:bg-negative/90 active:scale-95 disabled:opacity-40"
                  >
                    {deleting && <Loader2 className="size-3.5 animate-spin" />}
                    <span>{deleting ? 'Đang xoá...' : 'Xác nhận xoá'}</span>
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {/* 6. Confirmation Modal for Bulk Delete (Test History or All History) */}
      {createPortal(
        <AnimatePresence>
          {bulkDeleteTarget && (
            <motion.div
              {...modalMotion.backdrop}
              className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/65 p-4 backdrop-blur-md"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget && !bulkDeleting) setBulkDeleteTarget(null);
              }}
            >
              <motion.div
                {...modalMotion.panel}
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="bulk-delete-title"
                aria-describedby="bulk-delete-desc"
                className="relative my-auto w-full max-w-md rounded-3xl border border-line bg-surface p-6 text-content shadow-2xl"
              >
                <button
                  type="button"
                  onClick={() => setBulkDeleteTarget(null)}
                  disabled={bulkDeleting}
                  aria-label="Đóng xác nhận xoá lịch sử"
                  className="absolute right-4 top-4 rounded-full p-2 text-content-muted transition-colors duration-200 hover:bg-surface-hover hover:text-content disabled:opacity-40"
                >
                  <X className="size-5" />
                </button>

                <div className="grid size-11 place-items-center rounded-2xl bg-negative/10 text-negative">
                  <AlertTriangle className="size-5" />
                </div>

                <h2 id="bulk-delete-title" className="mt-4 pr-8 text-lg font-extrabold text-content">
                  {bulkDeleteTarget.type === 'test'
                    ? bulkDeleteTarget.count > 0
                      ? 'Xoá lịch sử làm bài đề này?'
                      : 'Dọn dẹp dữ liệu đề thi này?'
                    : 'Xoá tất cả lịch sử làm bài?'}
                </h2>

                <p id="bulk-delete-desc" className="mt-2 text-xs leading-relaxed text-content-muted">
                  {bulkDeleteTarget.type === 'test' ? (
                    bulkDeleteTarget.count > 0 ? (
                      <>
                        Toàn bộ <strong className="text-content">{bulkDeleteTarget.count} lượt làm bài</strong>, kết quả câu đúng/sai và phiên làm dở của đề{' '}
                        <strong className="text-content">{bulkDeleteTarget.testTitle}</strong> sẽ bị xoá vĩnh viễn khỏi database và trình duyệt. Thao tác này không thể hoàn tác.
                      </>
                    ) : (
                      <>
                        Đề thi <strong className="text-content">{bulkDeleteTarget.testTitle}</strong> hiện chưa có lượt làm bài nào trong danh sách. Thao tác này sẽ dọn sạch toàn bộ bài thi nháp và dữ liệu tạm của đề này khỏi thiết bị và cơ sở dữ liệu.
                      </>
                    )
                  ) : (
                    <>
                      Toàn bộ <strong className="text-content">{bulkDeleteTarget.count} lượt làm bài thi</strong> của tất cả các đề đã lưu trong tài khoản của bạn sẽ bị xoá vĩnh viễn khỏi cơ sở dữ liệu. Thao tác này không thể hoàn tác.
                    </>
                  )}
                </p>

                {bulkDeleteError && (
                  <p className="mt-3 rounded-xl border border-negative/30 bg-negative/10 px-3 py-2 text-xs font-semibold text-negative" role="alert">
                    {bulkDeleteError}
                  </p>
                )}

                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setBulkDeleteTarget(null)}
                    disabled={bulkDeleting}
                    className="btn-secondary justify-center text-xs disabled:opacity-40"
                  >
                    Huỷ
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleConfirmBulkDelete()}
                    disabled={bulkDeleting}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-negative bg-negative px-4 py-2 text-xs font-bold text-white transition hover:bg-negative/90 active:scale-95 disabled:opacity-40"
                  >
                    {bulkDeleting && <Loader2 className="size-3.5 animate-spin" />}
                    <span>
                      {bulkDeleting
                        ? 'Đang xoá...'
                        : bulkDeleteTarget.type === 'test'
                          ? bulkDeleteTarget.count > 0
                            ? 'Xác nhận xoá đề này'
                            : 'Dọn sạch dữ liệu'
                          : 'Xoá toàn bộ lịch sử'}
                    </span>
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {toastMessage && <TopToast message={toastMessage} />}
    </div>
  );
};
