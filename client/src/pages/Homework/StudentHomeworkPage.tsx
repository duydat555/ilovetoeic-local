import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpenCheck,
  CalendarClock,
  ClipboardList,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader, HomeworkStatusBadge } from '../../components/management/ManagementUI';
import { useAuth } from '../../context/AuthContext';
import { backendService } from '../../services/backend';
import type { HomeworkAssignment, HomeworkStatus } from '../../types/management';
import { serializeTestPartScope } from '../../utils/testScope';

const formatDate = (value: string) => new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
}).format(new Date(`${value}T00:00:00`));

const getStatus = (assignment: HomeworkAssignment, studentId: string): HomeworkStatus => {
  if (assignment.lateStudentIds.includes(studentId)) return 'late';
  if (assignment.submittedStudentIds.includes(studentId)) return 'submitted';
  return 'missing';
};

const getAssignmentUrl = (assignment: HomeworkAssignment) => {
  const parts = assignment.scope === 'parts'
    ? serializeTestPartScope(assignment.selectedParts)
    : 'all';
  return `/mock-test/exam/${encodeURIComponent(assignment.testId)}?parts=${encodeURIComponent(parts)}`;
};

export const StudentHomeworkPage: React.FC = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<HomeworkAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAssignments = async () => {
    setLoading(true);
    setError('');
    try {
      setAssignments(await backendService.getHomeworkAssignments());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Không thể tải bài tập về nhà.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAssignments();
  }, []);

  const summary = useMemo(() => {
    if (!user) return { pending: 0, submitted: 0 };
    return assignments.reduce((result, assignment) => {
      if (assignment.submittedStudentIds.includes(user.id)) result.submitted += 1;
      else result.pending += 1;
      return result;
    }, { pending: 0, submitted: 0 });
  }, [assignments, user]);

  if (!user) return null;

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Bài tập về nhà"
        description="Theo dõi bài được giao theo lớp, thời hạn và trạng thái hoàn thành của bạn."
      />

      <section className="grid gap-3 sm:grid-cols-2">
        <article className="rounded-2xl border border-line bg-surface p-4 shadow-sm dark:shadow-none">
          <span className="grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
            <CalendarClock className="size-5" aria-hidden="true" />
          </span>
          <p className="mt-3 text-2xl font-black text-content">{summary.pending}</p>
          <p className="mt-1 text-xs font-bold text-content-muted">Bài cần hoàn thành</p>
        </article>
        <article className="rounded-2xl border border-line bg-surface p-4 shadow-sm dark:shadow-none">
          <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
            <BookOpenCheck className="size-5" aria-hidden="true" />
          </span>
          <p className="mt-3 text-2xl font-black text-content">{summary.submitted}</p>
          <p className="mt-1 text-xs font-bold text-content-muted">Bài đã nộp</p>
        </article>
      </section>

      {error && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-500/10">
          <p className="text-sm font-semibold text-red-700 dark:text-red-300">{error}</p>
          <button type="button" onClick={() => void loadAssignments()} className="btn-secondary text-sm">
            <RefreshCw className="size-4" /> Thử lại
          </button>
        </div>
      )}

      {loading ? (
        <div className="grid min-h-64 place-items-center rounded-2xl border border-line bg-surface">
          <Loader2 className="size-7 animate-spin text-brand-700 motion-reduce:animate-none" aria-label="Đang tải bài tập" />
        </div>
      ) : assignments.length === 0 ? (
        <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-line bg-surface p-8 text-center">
          <div>
            <ClipboardList className="mx-auto size-9 text-content-muted" aria-hidden="true" />
            <h2 className="mt-4 text-base font-extrabold text-content">Chưa có bài tập được giao</h2>
            <p className="mt-1 text-sm text-content-muted">Bài tập mới từ giáo viên sẽ xuất hiện tại đây.</p>
          </div>
        </div>
      ) : (
        <section className="grid gap-4 lg:grid-cols-2">
          {assignments.map((assignment) => {
            const status = getStatus(assignment, user.id);
            const isPastDeadline = new Date(`${assignment.deadline}T23:59:59`).getTime() < Date.now();
            const scopeLabel = assignment.scope === 'full'
              ? 'Toàn bộ đề thi'
              : `Part ${assignment.selectedParts.join(', ')}`;
            return (
              <article key={assignment.id} className="flex flex-col rounded-2xl border border-line bg-surface p-5 shadow-sm dark:shadow-none">
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                    <ClipboardList className="size-5" aria-hidden="true" />
                  </span>
                  <HomeworkStatusBadge status={status} />
                </div>
                <h2 className="mt-4 text-base font-extrabold text-content">{assignment.title}</h2>
                {assignment.description && <p className="mt-2 text-sm leading-relaxed text-content-muted">{assignment.description}</p>}
                <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-surface-elevated p-3 text-xs">
                  <div><dt className="font-semibold text-content-muted">Nội dung</dt><dd className="mt-1 font-extrabold text-content">{scopeLabel}</dd></div>
                  <div><dt className="font-semibold text-content-muted">Hạn nộp</dt><dd className="mt-1 font-extrabold text-content">{formatDate(assignment.deadline)}</dd></div>
                </dl>
                <div className="mt-auto pt-4">
                  {status !== 'submitted' && (!isPastDeadline || assignment.allowLate) ? (
                    <Link to={getAssignmentUrl(assignment)} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-extrabold text-brand-ink transition hover:bg-brand-300">
                      Làm bài <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                  ) : null}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
};
