import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookOpenCheck, CalendarDays, CheckCircle2, ChevronDown, Clock3, Database, History, Layers3, Loader2, RefreshCcw, RotateCcw, Target, Trash2, Trophy, X, XCircle } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { BoneyardSkeleton } from '../../components/common/BoneyardSkeleton';
import { getModalMotion } from '../../components/common/modalMotion';
import { useAuth } from '../../context/AuthContext';
import { backendService } from '../../services/backend';
import { StudyAttempt, StudyAttemptMode, StudyAttemptQuestionStatus, StudyAttemptReviewQuestion } from '../../types';
import { getBestToeicGoalScore } from '../../utils/toeicGoal';
import { ALL_TEST_PARTS, getTestPartScopeLabel, normalizeTestParts, serializeTestPartScope } from '../../utils/testScope';
import { storage } from '../../utils/storage';

type HistoryFilter = 'all' | StudyAttemptMode;
type ReviewFilter = 'all' | StudyAttemptQuestionStatus;
type ReviewState = { loading: boolean; error: string; questions: StudyAttemptReviewQuestion[] };

const STATUS_META = {
  correct: { label: 'Đúng', icon: CheckCircle2, className: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300' },
  wrong: { label: 'Sai', icon: XCircle, className: 'text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300' },
  skipped: { label: 'Bỏ qua', icon: RefreshCcw, className: 'text-content-muted bg-surface-elevated' },
} as const;

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
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

const getAttemptParts = (attempt: StudyAttempt) => {
  const selected = attempt.metadata?.selected_parts;
  if (Array.isArray(selected)) return normalizeTestParts(selected.map(Number));
  return attempt.part ? [attempt.part] : [...ALL_TEST_PARTS];
};

const getYearLabel = (attempt: StudyAttempt) => {
  const years = attempt.testYears?.length ? attempt.testYears : attempt.testYear ? [attempt.testYear] : [];
  if (!years.length) return 'Chưa rõ năm';
  return years.length === 1 ? `Đề năm ${years[0]}` : `Nguồn đề ${years.join(', ')}`;
};

const buildReviewPath = (attempt: StudyAttempt, result: 'correct' | 'wrong') => {
  const parts = getAttemptParts(attempt);
  const query = new URLSearchParams({ reviewAttempt: attempt.id, reviewResult: result });
  if (attempt.testId) query.set('testId', attempt.testId);
  else {
    const level = Number(attempt.metadata?.selected_level);
    if (!Number.isInteger(level) || level < 1 || level > 5 || parts.length !== 1) return null;
    query.set('level', String(level));
  }
  return `/practice/runner/${serializeTestPartScope(parts)}?${query.toString()}`;
};

const QuestionReview: React.FC<{ question: StudyAttemptReviewQuestion }> = ({ question }) => {
  const status = STATUS_META[question.status];
  const StatusIcon = status.icon;
  const prompt = question.promptText || question.transcript || 'Câu hỏi nghe — đối chiếu đáp án bên dưới.';
  return (
    <article className="border-t border-line py-5 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-elevated font-mono text-xs font-black tabular-nums">{question.displayNumber}</span>
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2 text-[11px] font-bold text-content-muted"><span>Part {question.part}</span><span>· Câu gốc {question.questionNumber}</span>{question.testYear && <span>· {question.testName || 'Đề thi'} {question.testYear}</span>}{question.level && <span>· Level {question.level}</span>}</div>
            <h4 className="mt-1.5 max-w-3xl text-sm font-bold leading-relaxed text-content">{prompt}</h4>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-extrabold ${status.className}`}><StatusIcon className="size-3.5" />{status.label}</span>
      </div>
      {question.passageText && <details className="mt-4 rounded-xl bg-surface-elevated px-4 py-3 sm:ml-12"><summary className="cursor-pointer text-xs font-extrabold">Xem đoạn văn / nội dung chung</summary><p className="mt-3 whitespace-pre-line text-sm leading-7 text-content-muted">{question.passageText}</p></details>}
      <div className="mt-4 grid gap-2 sm:ml-12 sm:grid-cols-2">
        {question.choices.map((choice) => {
          const correct = choice.id === question.correctAnswer;
          const selected = choice.id === question.selectedAnswer;
          return <div key={choice.id} className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-sm ${correct ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200' : selected ? 'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200' : 'border-line text-content-muted'}`}><strong className="font-mono">{choice.id}.</strong><span className="leading-relaxed">{choice.text}</span>{correct && <CheckCircle2 className="ml-auto size-4 shrink-0" aria-label="Đáp án đúng" />}{selected && !correct && <XCircle className="ml-auto size-4 shrink-0" aria-label="Đáp án đã chọn" />}</div>;
        })}
      </div>
      <div className="mt-3 grid gap-3 sm:ml-12 lg:grid-cols-[1.3fr_0.7fr]">
        <section className="rounded-xl border-l-2 border-accent bg-brand-50/60 px-4 py-3 dark:bg-brand-500/5"><h5 className="text-xs font-extrabold">Giải thích</h5><p className="mt-1.5 whitespace-pre-line text-sm leading-6 text-content-muted">{question.explanation || question.explanationEn || 'Câu này chưa có giải thích chi tiết.'}</p></section>
        <section className="rounded-xl bg-surface-elevated px-4 py-3"><h5 className="text-xs font-extrabold">Kết quả của bạn</h5><p className="mt-1.5 text-sm text-content-muted">Đã chọn: <strong className="text-content">{question.selectedAnswer || 'Bỏ qua'}</strong> · Đáp án: <strong className="text-emerald-700 dark:text-emerald-300">{question.correctAnswer}</strong></p>{question.translation && <details className="mt-2"><summary className="cursor-pointer text-xs font-bold text-accent-strong">Xem bản dịch</summary><p className="mt-1.5 whitespace-pre-line text-xs leading-5 text-content-muted">{question.translation}</p></details>}</section>
      </div>
    </article>
  );
};

export const StudyHistoryLivePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const testId = searchParams.get('testId') || undefined;
  const [attempts, setAttempts] = useState<StudyAttempt[]>([]);
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const [yearFilter, setYearFilter] = useState<number | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('all');
  const [reviews, setReviews] = useState<Record<string, ReviewState>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reduceMotion = useReducedMotion();
  const modalMotion = getModalMotion(reduceMotion);
  const [deleteTarget, setDeleteTarget] = useState<StudyAttempt | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    if (!deleteTarget) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !deleting) setDeleteTarget(null);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [deleteTarget, deleting]);

  const handleDeleteAttempt = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setDeleteError('');
    try {
      storage.deleteSingleAttempt(deleteTarget.id);
      try {
        await backendService.deleteSingleStudyAttempt(deleteTarget.id);
      } catch (serverErr) {
        console.warn('[!] Server deleteSingleStudyAttempt warning:', serverErr);
      }
      setAttempts((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      setDeleteTarget(null);
      window.dispatchEvent(new CustomEvent('wrong-questions-updated'));
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi xoá lượt làm bài.');
    } finally {
      setDeleting(false);
    }
  };

  const loadHistory = async () => {
    if (!user) return;
    setLoading(true); setError('');
    const data = await backendService.getStudyHistory(user.id, testId);
    if (data === null) setError('Không thể tải lịch sử từ database. Vui lòng kiểm tra kết nối máy chủ.');
    else setAttempts(data);
    setLoading(false);
  };
  useEffect(() => { void loadHistory(); }, [testId, user?.id]);

  const years = useMemo(() => Array.from(new Set(attempts.flatMap((attempt) => attempt.testYears?.length ? attempt.testYears : attempt.testYear ? [attempt.testYear] : []))).sort((a, b) => b - a), [attempts]);
  const visibleAttempts = useMemo(() => attempts.filter((attempt) => (filter === 'all' || attempt.mode === filter) && (yearFilter === 'all' || attempt.testYear === yearFilter || attempt.testYears?.includes(yearFilter))), [attempts, filter, yearFilter]);
  const averageAccuracy = attempts.length ? Math.round(attempts.reduce((sum, item) => sum + item.accuracyRate, 0) / attempts.length) : 0;
  const bestScore = getBestToeicGoalScore(attempts);

  const toggleReview = async (attemptId: string) => {
    if (expandedId === attemptId) { setExpandedId(null); return; }
    setExpandedId(attemptId); setReviewFilter('all');
    if (reviews[attemptId]) return;
    setReviews((state) => ({ ...state, [attemptId]: { loading: true, error: '', questions: [] } }));
    try {
      const response = await backendService.getStudyAttemptReview(attemptId);
      setReviews((state) => ({ ...state, [attemptId]: { loading: false, error: '', questions: response.questions } }));
    } catch (requestError) {
      setReviews((state) => ({ ...state, [attemptId]: { loading: false, error: requestError instanceof Error ? requestError.message : 'Không thể tải chi tiết lượt làm.', questions: [] } }));
    }
  };

  return <div className="mx-auto max-w-7xl space-y-7 pb-14">
    <header className="grid gap-5 border-b border-line pb-7 lg:grid-cols-[1fr_auto] lg:items-end"><div><div className="eyebrow mb-3"><History className="size-3.5" /> Hồ sơ luyện thi</div><h1 className="text-3xl font-black tracking-[-0.035em] text-content sm:text-4xl">Lịch sử làm bài</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-content-muted">Xem lại từng Part, đối chiếu đáp án và luyện lại chính xác nhóm câu bạn cần cải thiện.</p></div><Link to="/mock-test" className="btn-secondary w-fit text-xs"><ArrowLeft className="size-4" /> Trở lại kho đề</Link></header>

    <section className="grid overflow-hidden rounded-3xl bg-slate-950 text-white shadow-[0_24px_70px_-36px_rgba(15,23,42,0.75)] sm:grid-cols-2 lg:grid-cols-4">{[
      { label: 'Lượt đã lưu', value: attempts.length, icon: Database }, { label: 'Câu đã ghi nhận', value: attempts.reduce((sum, item) => sum + item.totalQuestions, 0), icon: Layers3 }, { label: 'Độ chính xác TB', value: `${averageAccuracy}%`, icon: Target }, { label: 'Điểm Thi cao nhất', value: bestScore || '—', icon: Trophy },
    ].map((item, index) => <div key={item.label} className={`flex items-center gap-3 px-5 py-5 ${index ? 'border-t border-white/10 sm:border-l sm:border-t-0' : ''}`}><item.icon className="size-4 text-amber-300" /><div><div className="font-mono text-2xl font-black tabular-nums">{item.value}</div><div className="text-[11px] font-semibold text-slate-400">{item.label}</div></div></div>)}</section>

    <section className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between" aria-label="Bộ lọc lịch sử"><div className="flex w-fit gap-1 rounded-xl bg-surface-elevated p-1">{([['all', 'Tất cả'], ['practice', 'Luyện tập'], ['exam', 'Thi']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${filter === value ? 'bg-surface text-content shadow-sm' : 'text-content-muted'}`}>{label}</button>)}</div>{!!years.length && <div className="flex items-center gap-2 overflow-x-auto"><span className="text-xs font-bold text-content-muted">Năm đề:</span><button type="button" onClick={() => setYearFilter('all')} className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ${yearFilter === 'all' ? 'bg-content text-canvas' : 'bg-surface-elevated text-content-muted'}`}>Tất cả</button>{years.map((year) => <button key={year} type="button" onClick={() => setYearFilter(year)} className={`rounded-lg px-2.5 py-1.5 font-mono text-xs font-bold ${yearFilter === year ? 'bg-content text-canvas' : 'bg-surface-elevated text-content-muted'}`}>{year}</button>)}</div>}</section>

    {loading ? <div className="space-y-3"><BoneyardSkeleton name="history-1" height={210} /><BoneyardSkeleton name="history-2" height={210} /></div> : error ? <div className="surface rounded-2xl p-8 text-center"><Database className="mx-auto size-9 text-negative" /><p className="mt-3 text-sm font-bold">{error}</p><button type="button" onClick={() => void loadHistory()} className="btn-primary mt-4 text-xs">Thử lại</button></div> : !visibleAttempts.length ? <div className="py-16 text-center"><History className="mx-auto size-10 text-content-muted" /><h2 className="mt-3 text-lg font-extrabold">Chưa có lịch sử phù hợp</h2><p className="mt-1 text-sm text-content-muted">Hoàn thành một bài Thi hoặc Luyện tập để dữ liệu xuất hiện tại đây.</p></div> : <section className="space-y-4" aria-label="Các lượt làm bài">
      {visibleAttempts.map((attempt) => {
        const parts = getAttemptParts(attempt); const partStats = attempt.partStats || [];
        const wrongCount = partStats.reduce((sum, item) => sum + item.wrong, 0); const correctCount = partStats.reduce((sum, item) => sum + item.correct, 0);
        const review = reviews[attempt.id]; const questions = review?.questions.filter((question) => reviewFilter === 'all' || question.status === reviewFilter) || [];
        const expanded = expandedId === attempt.id; const wrongPath = buildReviewPath(attempt, 'wrong'); const correctPath = buildReviewPath(attempt, 'correct');
        const level = Number(attempt.metadata?.selected_level); const source = attempt.metadata?.source === 'level_practice' && Number.isInteger(level) ? `Luyện theo Level ${level}` : attempt.mode === 'exam' ? 'Thi' : 'Luyện tập';
        return <article key={attempt.id} className="overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="p-4 sm:p-5"><div className="grid gap-5 xl:grid-cols-[0.9fr_1.4fr_auto] xl:items-center">
            <div><div className="flex gap-3"><span className={`grid size-10 shrink-0 place-items-center rounded-xl ${attempt.mode === 'exam' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'}`}><BookOpenCheck className="size-5" /></span><div className="min-w-0"><h2 className="truncate text-base font-extrabold">{attempt.testName || (attempt.testId ? `Đề thi ${attempt.testId}` : source)}</h2><p className="mt-1 text-xs font-semibold text-content-muted">{getYearLabel(attempt)} · {source} · {getTestPartScopeLabel(parts)}</p></div></div><div className="mt-3 flex flex-wrap gap-4 text-[11px] font-semibold text-content-muted"><span className="inline-flex gap-1"><CalendarDays className="size-3.5" />{formatCompletedAt(attempt.completedAt)}</span><span className="inline-flex gap-1"><Clock3 className="size-3.5" />{formatDuration(attempt.timeSpentSeconds)}</span></div></div>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-7">{partStats.length ? partStats.map((part) => <div key={part.part} className="rounded-xl bg-surface-elevated px-2 py-2 text-center"><div className="text-[10px] font-extrabold text-content-muted">Part {part.part}</div><div className="mt-1 font-mono text-sm font-black"><span className="text-emerald-600">{part.correct}</span><span className="text-content-muted"> / </span><span className="text-rose-600">{part.wrong}</span></div><div className="text-[9px] text-content-muted">đúng / sai</div></div>) : <p className="col-span-full text-xs text-content-muted">Lượt làm cũ chưa đủ dữ liệu Part.</p>}</div>
            <div className="flex justify-between gap-4 xl:justify-end"><div className="text-right"><div className="font-mono text-2xl font-black">{attempt.correctAnswers}<span className="text-sm text-content-muted">/{attempt.totalQuestions}</span></div><div className="text-[10px] font-bold text-content-muted">{attempt.accuracyRate}% chính xác</div></div>{attempt.mode === 'exam' && <div className="border-l border-line pl-4 text-right"><div className="font-mono text-2xl font-black text-amber-600">{attempt.totalScore || '—'}</div><div className="text-[10px] font-bold text-content-muted">điểm TOEIC</div></div>}</div>
          </div><div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3"><button type="button" onClick={() => void toggleReview(attempt.id)} className="btn-secondary text-xs" aria-expanded={expanded}>Xem từng câu <ChevronDown className={`size-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} /></button><button type="button" disabled={!wrongPath || !wrongCount} onClick={() => wrongPath && navigate(wrongPath)} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-bold text-rose-700 disabled:opacity-40 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300"><RotateCcw className="size-3.5" />Làm lại {wrongCount} câu sai</button><button type="button" disabled={!correctPath || !correctCount} onClick={() => correctPath && navigate(correctPath)} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-bold text-emerald-700 disabled:opacity-40 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"><RotateCcw className="size-3.5" />Làm lại {correctCount} câu đúng</button><button type="button" onClick={() => setDeleteTarget(attempt)} className="ml-auto grid size-9 place-items-center rounded-xl border border-line text-content-muted transition-colors hover:border-negative/30 hover:bg-negative/10 hover:text-negative active:scale-95" title="Xoá lượt làm bài này" aria-label="Xoá lượt làm bài này"><Trash2 className="size-3.5" /></button></div></div>
          {expanded && <div className="border-t border-line bg-canvas/40 p-4 sm:p-5">{review?.loading ? <BoneyardSkeleton name={`review-${attempt.id}`} height={240} /> : review?.error ? <p className="rounded-xl bg-negative/10 p-4 text-sm font-semibold text-negative">{review.error}</p> : <><div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-sm font-extrabold">Chi tiết đáp án</h3><p className="text-xs text-content-muted">Đáp án và giải thích lấy trực tiếp từ database.</p></div><div className="flex gap-1 rounded-xl bg-surface-elevated p-1">{([['all', 'Tất cả'], ['wrong', 'Sai'], ['correct', 'Đúng'], ['skipped', 'Bỏ qua']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setReviewFilter(value)} className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ${reviewFilter === value ? 'bg-surface shadow-sm' : 'text-content-muted'}`}>{label}</button>)}</div></div>{questions.length ? questions.map((question) => <QuestionReview key={question.id} question={question} />) : <p className="py-8 text-center text-sm text-content-muted">Không có câu hỏi trong bộ lọc này.</p>}</>}</div>}
        </article>;
      })}
    </section>}

    <AnimatePresence>
      {deleteTarget &&
        createPortal(
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
          </motion.div>,
          document.body,
        )}
    </AnimatePresence>
  </div>;
};

export default StudyHistoryLivePage;
