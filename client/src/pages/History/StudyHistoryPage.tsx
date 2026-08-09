import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  Clock3,
  Database,
  History,
  Target,
  Trophy,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { BoneyardSkeleton } from '../../components/common/BoneyardSkeleton';
import { useAuth } from '../../context/AuthContext';
import { backendService } from '../../services/backend';
import { StudyAttempt, StudyAttemptMode } from '../../types';
import {
  ALL_TEST_PARTS,
  getTestPartScopeLabel,
  normalizeTestParts,
  serializeTestPartScope,
} from '../../utils/testScope';

type HistoryFilter = 'all' | StudyAttemptMode;

const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = seconds % 60;
  if (hours > 0) return `${hours} giờ ${minutes} phút`;
  if (minutes > 0) return `${minutes} phút ${remaining} giây`;
  return `${remaining} giây`;
};

const formatCompletedAt = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('vi-VN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date);
};

export const StudyHistoryPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const testId = searchParams.get('testId') || undefined;
  const [attempts, setAttempts] = useState<StudyAttempt[]>([]);
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadHistory = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    const data = await backendService.getStudyHistory(user.id, testId);
    if (data === null) {
      setError('Không thể tải lịch sử từ MySQL. Vui lòng kiểm tra máy chủ và kết nối.');
    } else {
      setAttempts(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadHistory();
  }, [testId, user?.id]);

  const filteredAttempts = useMemo(
    () => attempts.filter((attempt) => filter === 'all' || attempt.mode === filter),
    [attempts, filter],
  );
  const averageAccuracy = attempts.length
    ? Math.round(attempts.reduce((total, attempt) => total + attempt.accuracyRate, 0) / attempts.length)
    : 0;
  const bestScore = attempts
    .filter((attempt) => attempt.mode === 'exam')
    .reduce((best, attempt) => Math.max(best, attempt.totalScore || 0), 0);

  return (
    <div className="space-y-6 pb-12">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="eyebrow mb-3"><History className="size-3.5" /> Hoạt động học tập</div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl dark:text-content">
            Lịch sử làm bài
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {testId ? 'Các lần làm của đề thi đã chọn.' : 'Tất cả bài Luyện tập và Thi đã nộp trên tài khoản này.'}
          </p>
        </div>
        <Link to="/mock-test" className="btn-secondary text-xs">
          Chọn đề khác <ArrowRight className="size-4" />
        </Link>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="surface flex items-center gap-4 rounded-2xl p-5">
          <div className="grid size-11 place-items-center rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
            <Database className="size-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-950 dark:text-content">{attempts.length}</div>
            <div className="text-xs font-semibold text-slate-500">Lần đã nộp</div>
          </div>
        </div>
        <div className="surface flex items-center gap-4 rounded-2xl p-5">
          <div className="grid size-11 place-items-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <Target className="size-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-950 dark:text-content">{averageAccuracy}%</div>
            <div className="text-xs font-semibold text-slate-500">Độ chính xác trung bình</div>
          </div>
        </div>
        <div className="surface flex items-center gap-4 rounded-2xl p-5">
          <div className="grid size-11 place-items-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            <Trophy className="size-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-950 dark:text-content">{bestScore || '—'}</div>
            <div className="text-xs font-semibold text-slate-500">Điểm Thi cao nhất</div>
          </div>
        </div>
      </section>

      <div className="flex w-fit items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-surface-elevated">
        {([
          ['all', 'Tất cả'],
          ['practice', 'Luyện tập'],
          ['exam', 'Thi'],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              filter === value
                ? 'bg-white text-slate-950 shadow-sm dark:bg-surface-hover dark:text-content'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <BoneyardSkeleton name="study-history-list" height={320} />
      ) : error ? (
        <div className="surface rounded-2xl p-8 text-center">
          <Database className="mx-auto size-9 text-rose-500" />
          <p className="mt-3 text-sm font-bold text-slate-800 dark:text-content">{error}</p>
          <button type="button" onClick={() => void loadHistory()} className="btn-primary mt-4 text-xs">
            Thử lại
          </button>
        </div>
      ) : filteredAttempts.length === 0 ? (
        <div className="surface rounded-2xl p-10 text-center">
          <History className="mx-auto size-10 text-slate-300" />
          <h2 className="mt-3 text-base font-extrabold text-slate-900 dark:text-content">Chưa có lịch sử phù hợp</h2>
          <p className="mt-1 text-xs text-slate-500">Hoàn thành và nộp một bài để kết quả xuất hiện tại đây.</p>
        </div>
      ) : (
        <section className="space-y-3">
          {filteredAttempts.map((attempt) => {
            const metadataParts = Array.isArray(attempt.metadata?.selected_parts)
              ? normalizeTestParts(attempt.metadata.selected_parts.map(Number))
              : [];
            const attemptParts = metadataParts.length > 0
              ? metadataParts
              : attempt.part
                ? [attempt.part]
                : [...ALL_TEST_PARTS];
            const partScope = serializeTestPartScope(attemptParts);
            const scopeLabel = getTestPartScopeLabel(attemptParts);
            const retryPath = attempt.mode === 'exam'
              ? `/mock-test/exam/${attempt.testId}?parts=${encodeURIComponent(partScope)}`
              : `/practice/runner/${partScope}${attempt.testId ? `?testId=${encodeURIComponent(attempt.testId)}` : ''}`;
            return (
              <article key={attempt.id} className="surface rounded-2xl p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className={`grid size-10 shrink-0 place-items-center rounded-xl ${
                      attempt.mode === 'exam'
                        ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}>
                      <BookOpenCheck className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-sm font-extrabold text-slate-950 dark:text-content">
                          {attempt.testName || (attempt.testId ? `Đề thi ${attempt.testId}` : 'Luyện tập nhanh')}
                        </h2>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${
                          attempt.mode === 'exam'
                            ? 'bg-slate-200 text-slate-700 dark:bg-surface-hover dark:text-content'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}>
                          {attempt.mode === 'exam' ? `Thi, ${scopeLabel}` : `Luyện tập, ${scopeLabel}`}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-slate-500">
                        <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" /> {formatCompletedAt(attempt.completedAt)}</span>
                        <span className="inline-flex items-center gap-1"><Clock3 className="size-3.5" /> {formatDuration(attempt.timeSpentSeconds)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <div className="text-right">
                      <div className="text-lg font-black text-slate-950 dark:text-content">
                        {attempt.correctAnswers}/{attempt.totalQuestions}
                      </div>
                      <div className="text-[11px] font-semibold text-slate-500">{attempt.accuracyRate}% chính xác</div>
                    </div>
                    {attempt.mode === 'exam' && (
                      <div className="min-w-14 border-l border-slate-200 pl-4 text-right dark:border-line">
                        <div className="text-lg font-black text-amber-600">{attempt.totalScore || '—'}</div>
                        <div className="text-[11px] font-semibold text-slate-500">điểm</div>
                      </div>
                    )}
                    {attempt.testId && (
                      <Link to={retryPath} className="btn-secondary px-3 text-xs">
                        Làm lại <ArrowRight className="size-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
};
