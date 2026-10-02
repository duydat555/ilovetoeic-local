import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  GraduationCap,
  LayoutGrid,
  List,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
  UsersRound,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { BoneyardSkeleton } from '../../components/common/BoneyardSkeleton';
import {
  ManagedClassRecord,
  ManagedClassStudent,
  backendService,
} from '../../services/backend';
import { PageHeader, managementInputClass } from '../../components/management/ManagementUI';
import { getDiceBearAvatar } from '../../utils/avatar';

type ClassSort = 'cohort_desc' | 'cohort_asc' | 'students' | 'progress';
type ViewMode = 'table' | 'grid';
type ToastState = { message: string; tone: 'success' | 'error' } | null;

const StudentAvatar: React.FC<{ student: ManagedClassStudent; className?: string }> = ({
  student,
  className = 'size-8',
}) => {
  const [src, setSrc] = useState(student.avatar || getDiceBearAvatar(student.name || student.id));
  return (
    <img
      src={src}
      alt={student.name}
      title={student.name}
      onError={() => setSrc(getDiceBearAvatar(student.name || 'student'))}
      className={`${className} rounded-full object-cover ring-2 ring-surface bg-surface-elevated`}
    />
  );
};

const ProgressRing: React.FC<{ value: number; size?: number }> = ({ value, size = 48 }) => {
  const normalized = Math.max(0, Math.min(100, Math.round(value)));
  const radius = (size / 2) - 4;
  const circumference = 2 * Math.PI * radius;
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Tiến độ ${normalized}%`}
    >
      <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90" style={{ width: size, height: size }} aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          className="text-surface-hover"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - normalized / 100)}
          className="text-brand transition-[stroke-dashoffset] duration-500 motion-reduce:transition-none"
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-[10px] font-black text-content">
        {normalized}%
      </span>
    </div>
  );
};

export const ClassesManagementPage: React.FC = () => {
  const [classes, setClasses] = useState<ManagedClassRecord[]>([]);
  const [students, setStudents] = useState<ManagedClassStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<ClassSort>('cohort_desc');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [selectedClass, setSelectedClass] = useState<ManagedClassRecord | null>(null);

  const loadClasses = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const [classData, studentData] = await Promise.all([
        backendService.getManagedClasses(),
        backendService.getManagedClassStudents(),
      ]);
      setClasses(classData);
      setStudents(studentData);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Không thể tải dữ liệu lớp học.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadClasses();
  }, [loadClasses]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const showToast = (message: string, tone: 'success' | 'error') => setToast({ message, tone });

  const studentById = useMemo(
    () => new Map(students.map((student) => [student.id, student])),
    [students],
  );

  const totalEnrolledStudents = useMemo(() => {
    return classes.reduce((sum, c) => sum + (c.studentCount || 0), 0);
  }, [classes]);

  const systemAverageProgress = useMemo(() => {
    if (classes.length === 0) return 0;
    const sum = classes.reduce((acc, c) => acc + (c.averageProgress || 0), 0);
    return Math.round(sum / classes.length);
  }, [classes]);

  const totalXp = useMemo(() => {
    return classes.reduce((sum, c) => sum + (c.totalXp || 0), 0);
  }, [classes]);

  const filteredClasses = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('vi');
    return classes
      .filter((classItem) => {
        if (!normalizedQuery) return true;
        const matchesBasic = `${classItem.name} ${classItem.code} ${classItem.description}`
          .toLocaleLowerCase('vi')
          .includes(normalizedQuery);
        if (matchesBasic) return true;

        // Also search by student name within the class
        const enrolledStudents = (classItem.students && classItem.students.length > 0)
          ? classItem.students
          : classItem.studentIds.map((id) => studentById.get(id)).filter(Boolean) as ManagedClassStudent[];
        return enrolledStudents.some((s) => `${s.name} ${s.email}`.toLocaleLowerCase('vi').includes(normalizedQuery));
      })
      .sort((first, second) => {
        if (sort === 'cohort_desc') {
          const numA = parseInt(first.code.replace(/\D/g, '') || '0', 10);
          const numB = parseInt(second.code.replace(/\D/g, '') || '0', 10);
          return numB - numA;
        }
        if (sort === 'cohort_asc') {
          const numA = parseInt(first.code.replace(/\D/g, '') || '0', 10);
          const numB = parseInt(second.code.replace(/\D/g, '') || '0', 10);
          return numA - numB;
        }
        if (sort === 'students') return second.studentCount - first.studentCount;
        if (sort === 'progress') return (second.averageProgress || 0) - (first.averageProgress || 0);
        return 0;
      });
  }, [classes, query, sort, studentById]);

  const copyClassCode = async (code: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(code);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = code;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const copied = document.execCommand('copy');
        textarea.remove();
        if (!copied) throw new Error('Không thể sao chép');
      }
      setCopiedCode(code);
      setTimeout(() => setCopiedCode((prev) => (prev === code ? null : prev)), 2000);
      showToast(`Đã sao chép mã khóa: ${code}`, 'success');
    } catch {
      showToast('Trình duyệt không cho phép sao chép tự động.', 'error');
    }
  };

  const getClassStudents = (classItem: ManagedClassRecord): ManagedClassStudent[] => {
    if (classItem.students && classItem.students.length > 0) {
      return classItem.students;
    }
    return classItem.studentIds
      .map((id) => studentById.get(id))
      .filter((s): s is ManagedClassStudent => Boolean(s));
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Page Header */}
      <PageHeader
        title="Quản lý lớp học"
        description="Hệ thống tự động phân lớp và đồng bộ từ định danh học viên (ví dụ: _K35, _K38)."
        action={(
          <button
            type="button"
            onClick={() => void loadClasses()}
            disabled={isLoading}
            className="btn-secondary whitespace-nowrap text-sm shadow-sm transition active:scale-[.98]"
          >
            <RefreshCw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>Làm mới dữ liệu</span>
          </button>
        )}
      />

      {/* 2. Key Metrics Bar */}
      {!isLoading && !loadError && (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Chỉ số tổng quan lớp học">
          <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm transition-colors dark:shadow-none sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-content-muted">Lớp học / Khóa</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-black tracking-tight text-content">{classes.length}</span>
                  <span className="text-xs font-medium text-content-muted">lớp</span>
                </div>
                <p className="mt-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  Tự động nhận diện
                </p>
              </div>
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                <GraduationCap className="size-5" aria-hidden="true" />
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm transition-colors dark:shadow-none sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-content-muted">Tổng học viên</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-black tracking-tight text-content">{totalEnrolledStudents}</span>
                  <span className="text-xs font-medium text-content-muted">học viên</span>
                </div>
                <p className="mt-1 text-[11px] font-semibold text-content-muted">
                  Đã phân bổ theo khóa
                </p>
              </div>
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                <UsersRound className="size-5" aria-hidden="true" />
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm transition-colors dark:shadow-none sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-content-muted">Tiến độ trung bình</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-black tracking-tight text-content">{systemAverageProgress}%</span>
                  <span className="text-xs font-medium text-content-muted">mục tiêu</span>
                </div>
                <p className="mt-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                  Theo điểm TOEIC
                </p>
              </div>
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300">
                <TrendingUp className="size-5" aria-hidden="true" />
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm transition-colors dark:shadow-none sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-content-muted">Tổng XP tích lũy</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-black tracking-tight text-content">{totalXp.toLocaleString('vi-VN')}</span>
                  <span className="text-xs font-medium text-content-muted">XP</span>
                </div>
                <p className="mt-1 text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                  Toàn bộ các khóa
                </p>
              </div>
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-300">
                <Sparkles className="size-5" aria-hidden="true" />
              </span>
            </div>
          </div>
        </section>
      )}

      {/* 3. Control Toolbar */}
      {!isLoading && !loadError && (
        <section className="rounded-2xl border border-line bg-surface p-4 shadow-sm transition-colors dark:shadow-none">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Search Input */}
            <div className="relative min-w-0 flex-1 sm:max-w-md">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-content-muted" aria-hidden="true" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className={`${managementInputClass} pl-10 pr-9`}
                placeholder="Tìm theo tên lớp, mã khóa (K35, K38) hoặc học viên..."
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Xóa nội dung tìm kiếm"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-content-muted transition hover:bg-surface-hover hover:text-content"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Sort & View Mode */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="hidden text-xs font-bold text-content-muted sm:inline">Sắp xếp:</span>
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value as ClassSort)}
                  className="min-h-9 rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-bold text-content shadow-xs transition focus:border-brand focus:outline-none"
                  aria-label="Sắp xếp danh sách lớp"
                >
                  <option value="cohort_desc">Khóa K mới nhất (K38...)</option>
                  <option value="cohort_asc">Khóa K tăng dần (K1...)</option>
                  <option value="students">Nhiều học viên nhất</option>
                  <option value="progress">Tiến độ cao nhất</option>
                </select>
              </div>

              {/* View Switcher */}
              <div
                className="flex items-center rounded-xl border border-line bg-surface-elevated p-1"
                role="group"
                aria-label="Chế độ hiển thị"
              >
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  aria-pressed={viewMode === 'table'}
                  title="Hiển thị dạng Bảng chi tiết"
                  className={`rounded-lg p-1.5 transition ${
                    viewMode === 'table'
                      ? 'bg-surface text-brand shadow-xs'
                      : 'text-content-muted hover:text-content'
                  }`}
                >
                  <List className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  aria-pressed={viewMode === 'grid'}
                  title="Hiển thị dạng Lưới thẻ"
                  className={`rounded-lg p-1.5 transition ${
                    viewMode === 'grid'
                      ? 'bg-surface text-brand shadow-xs'
                      : 'text-content-muted hover:text-content'
                  }`}
                >
                  <LayoutGrid className="size-4" />
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 4. Loading Skeleton */}
      {isLoading && (
        <div className="space-y-3">
          <BoneyardSkeleton name="class-stats-skeleton" height={96} />
          <BoneyardSkeleton name="class-list-skeleton" height={360} />
        </div>
      )}

      {/* 5. Error State */}
      {!isLoading && loadError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900/50 dark:bg-red-500/10">
          <p className="text-sm font-bold text-red-700 dark:text-red-300">{loadError}</p>
          <button
            type="button"
            onClick={() => void loadClasses()}
            className="btn-secondary mt-4 inline-flex items-center gap-2 text-sm"
          >
            <RefreshCw className="size-4" /> Thử lại
          </button>
        </div>
      )}

      {/* 6. Empty State */}
      {!isLoading && !loadError && filteredClasses.length === 0 && (
        <section className="rounded-3xl border border-dashed border-line bg-surface p-12 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-surface-elevated text-content-muted">
            <GraduationCap className="size-7" />
          </div>
          <h2 className="mt-4 text-base font-extrabold text-content">
            {query ? 'Không tìm thấy lớp học phù hợp' : 'Chưa có lớp học nào được nhận diện'}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-content-muted">
            {query
              ? `Không có lớp học nào khớp với từ khóa "${query}". Vui lòng thử từ khóa khác.`
              : 'Hệ thống tự động gom nhóm lớp khi học viên có tên theo định danh khóa (ví dụ: Đạt_K35, Dũng_K38).'}
          </p>
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="btn-secondary mt-5 text-xs"
            >
              Xóa bộ lọc tìm kiếm
            </button>
          )}
        </section>
      )}

      {/* 7. Table View */}
      {!isLoading && !loadError && filteredClasses.length > 0 && viewMode === 'table' && (
        <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm dark:shadow-none">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="border-b border-line bg-surface-elevated font-extrabold text-content-muted">
                <tr>
                  <th className="px-5 py-3.5">Lớp học</th>
                  <th className="px-5 py-3.5">Mã khóa</th>
                  <th className="px-5 py-3.5">Học viên</th>
                  <th className="px-5 py-3.5">Mục tiêu TOEIC</th>
                  <th className="px-5 py-3.5">Tiến độ trung bình</th>
                  <th className="px-5 py-3.5 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/70">
                {filteredClasses.map((classItem) => {
                  const enrolledStudents = getClassStudents(classItem);
                  const isCopied = copiedCode === classItem.code;

                  return (
                    <tr
                      key={classItem.id}
                      className="group transition-colors hover:bg-surface-hover/60"
                    >
                      {/* Name & description */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand/10 text-accent-strong font-black text-xs">
                            {classItem.code}
                          </div>
                          <div className="min-w-0">
                            <p className="font-extrabold text-sm text-content truncate">
                              {classItem.name}
                            </p>
                            <p className="mt-0.5 text-[11px] text-content-muted truncate max-w-xs sm:max-w-sm">
                              {classItem.description}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Code pill with 1-click copy */}
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => void copyClassCode(classItem.code)}
                          title="Sao chép mã khóa"
                          className="group/code inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface-elevated px-2.5 py-1 font-mono text-[11px] font-bold text-content hover:border-brand/40 hover:bg-surface transition"
                        >
                          <span>{classItem.code}</span>
                          {isCopied ? (
                            <Check className="size-3 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Copy className="size-3 text-content-muted opacity-60 group-hover/code:opacity-100" />
                          )}
                        </button>
                      </td>

                      {/* Student Avatars + Count */}
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => setSelectedClass(classItem)}
                          className="flex items-center gap-2 hover:opacity-85 transition"
                          title="Bấm để xem nhanh danh sách học viên"
                        >
                          <div className="flex -space-x-2 overflow-hidden">
                            {enrolledStudents.slice(0, 4).map((student) => (
                              <StudentAvatar key={student.id} student={student} className="size-7" />
                            ))}
                          </div>
                          <span className="font-extrabold text-xs text-content">
                            {classItem.studentCount}
                          </span>
                          <span className="text-[11px] text-content-muted">học viên</span>
                        </button>
                      </td>

                      {/* Target Score */}
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-0.5 font-extrabold text-xs text-content">
                          {classItem.targetScore} TOEIC
                        </span>
                      </td>

                      {/* Progress Bar */}
                      <td className="px-5 py-4">
                        <div className="w-36">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="text-content">{classItem.averageProgress}%</span>
                            <span className="text-content-muted">{classItem.totalQuestions || 0} câu</span>
                          </div>
                          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-surface-hover">
                            <div
                              className="h-full rounded-full bg-brand transition-all duration-500"
                              style={{ width: `${Math.max(0, Math.min(100, classItem.averageProgress))}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="px-5 py-4 text-right">
                        <Link
                          to={`/admin/classes/${classItem.id}/students`}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-extrabold text-content hover:border-brand/40 hover:bg-surface-hover transition active:scale-[.98]"
                        >
                          <span>Học viên</span>
                          <ExternalLink className="size-3.5 text-content-muted" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 8. Grid View */}
      {!isLoading && !loadError && filteredClasses.length > 0 && viewMode === 'grid' && (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredClasses.map((classItem) => {
            const enrolledStudents = getClassStudents(classItem);
            const isCopied = copiedCode === classItem.code;

            return (
              <div
                key={classItem.id}
                className="flex flex-col justify-between rounded-2xl border border-line bg-surface p-5 shadow-sm transition-all hover:border-brand/40 dark:shadow-none"
              >
                {/* Card Top */}
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand/10 text-accent-strong font-black text-sm">
                        {classItem.code}
                      </div>
                      <div>
                        <h2 className="font-extrabold text-base text-content">
                          {classItem.name}
                        </h2>
                        <button
                          type="button"
                          onClick={() => void copyClassCode(classItem.code)}
                          title="Sao chép mã khóa"
                          className="mt-1 inline-flex items-center gap-1 rounded-md border border-line bg-surface-elevated px-2 py-0.5 font-mono text-[10px] font-bold text-content-muted hover:text-content transition"
                        >
                          <span>{classItem.code}</span>
                          {isCopied ? (
                            <Check className="size-3 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Copy className="size-3" />
                          )}
                        </button>
                      </div>
                    </div>

                    <ProgressRing value={classItem.averageProgress} size={46} />
                  </div>

                  <p className="mt-3 text-xs leading-5 text-content-muted line-clamp-2">
                    {classItem.description}
                  </p>

                  {/* Metrics Pills */}
                  <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line/70 pt-3">
                    <div className="rounded-xl bg-surface-elevated p-2 text-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-content-muted">Học viên</span>
                      <p className="mt-0.5 text-sm font-extrabold text-content">{classItem.studentCount}</p>
                    </div>
                    <div className="rounded-xl bg-surface-elevated p-2 text-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-content-muted">Mục tiêu</span>
                      <p className="mt-0.5 text-sm font-extrabold text-content">{classItem.targetScore}</p>
                    </div>
                  </div>

                  {/* Student Avatars Stack */}
                  <div className="mt-4 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setSelectedClass(classItem)}
                      className="flex items-center gap-2 hover:opacity-85 transition"
                      title="Bấm để xem danh sách học viên"
                    >
                      <div className="flex -space-x-2 overflow-hidden">
                        {enrolledStudents.slice(0, 5).map((student) => (
                          <StudentAvatar key={student.id} student={student} className="size-7" />
                        ))}
                      </div>
                      {enrolledStudents.length > 5 && (
                        <span className="text-[11px] font-bold text-content-muted">
                          +{enrolledStudents.length - 5}
                        </span>
                      )}
                    </button>
                    <span className="text-[11px] font-semibold text-content-muted">
                      {classItem.totalXp ? `${classItem.totalXp.toLocaleString('vi-VN')} XP` : '0 XP'}
                    </span>
                  </div>
                </div>

                {/* Card Bottom CTA */}
                <div className="mt-5 border-t border-line pt-4">
                  <Link
                    to={`/admin/classes/${classItem.id}/students`}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-surface-elevated py-2.5 text-xs font-extrabold text-content hover:bg-brand hover:text-brand-ink transition active:scale-[.98]"
                  >
                    <span>Xem danh sách học viên ({classItem.studentCount})</span>
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* 9. Quick Student Drawer (Slide-over) */}
      <AnimatePresence>
        {selectedClass && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedClass(null)}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            />

            {/* Slide-over panel */}
            <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                className="w-screen max-w-md border-l border-line bg-surface shadow-2xl flex flex-col"
              >
                {/* Drawer Header */}
                <div className="flex items-center justify-between border-b border-line px-6 py-4">
                  <div>
                    <h2 className="text-base font-extrabold text-content">
                      {selectedClass.name}
                    </h2>
                    <p className="text-xs text-content-muted">
                      Mã khóa: <span className="font-mono font-bold text-content">{selectedClass.code}</span> • {selectedClass.studentCount} học viên
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedClass(null)}
                    aria-label="Đóng bảng chi tiết"
                    className="rounded-lg p-1.5 text-content-muted hover:bg-surface-hover hover:text-content transition"
                  >
                    <X className="size-5" />
                  </button>
                </div>

                {/* Drawer Body - Student list */}
                <div className="flex-1 overflow-y-auto p-6 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-content-muted">
                    Danh sách học viên trong khóa
                  </p>
                  {getClassStudents(selectedClass).length === 0 ? (
                    <div className="rounded-xl border border-dashed border-line p-8 text-center text-xs text-content-muted">
                      Chưa có học viên nào trong khóa này.
                    </div>
                  ) : (
                    getClassStudents(selectedClass).map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between rounded-xl border border-line bg-surface-elevated p-3.5 transition hover:border-brand/40"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <StudentAvatar student={student} className="size-9" />
                          <div className="min-w-0">
                            <p className="text-xs font-extrabold text-content truncate">
                              {student.name}
                            </p>
                            <p className="text-[11px] text-content-muted truncate">
                              {student.email}
                            </p>
                            <div className="mt-1 flex items-center gap-2 text-[10px] font-bold text-content-muted">
                              <span>Mục tiêu: {student.targetScore}</span>
                              <span>•</span>
                              <span className="text-amber-600 dark:text-amber-400">Chuỗi: {student.streakDays} ngày</span>
                            </div>
                          </div>
                        </div>

                        <Link
                          to={`/admin/accounts/${student.id}/practice`}
                          className="btn-secondary shrink-0 text-[11px] px-2.5 py-1 font-bold hover:border-brand/40"
                        >
                          Xem hồ sơ
                        </Link>
                      </div>
                    ))
                  )}
                </div>

                {/* Drawer Footer */}
                <div className="border-t border-line p-4 bg-surface-elevated flex items-center justify-between gap-3">
                  <Link
                    to={`/admin/classes/${selectedClass.id}/students`}
                    className="btn-primary w-full text-center text-xs justify-center"
                  >
                    <span>Mở trang danh sách lớp đầy đủ</span>
                    <ExternalLink className="size-3.5" />
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Feedback */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <div
              className={`flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-xs font-extrabold shadow-lg ${
                toast.tone === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/80 dark:text-emerald-200'
                  : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/80 dark:text-red-200'
              }`}
            >
              {toast.tone === 'success' ? <Check className="size-4" /> : <X className="size-4" />}
              <span>{toast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
