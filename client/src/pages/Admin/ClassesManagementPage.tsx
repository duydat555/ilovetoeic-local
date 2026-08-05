import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Archive,
  ArchiveRestore,
  Check,
  CheckCircle2,
  Copy,
  Edit3,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  School,
  Trash2,
  UserRoundPlus,
  UsersRound,
} from 'lucide-react';
import { BoneyardSkeleton } from '../../components/common/BoneyardSkeleton';
import {
  ManagedClassInput,
  ManagedClassRecord,
  ManagedClassStudent,
  backendService,
} from '../../services/backend';
import { DialogShell, PageHeader, managementInputClass } from '../../components/management/ManagementUI';
import { getDiceBearAvatar } from '../../utils/avatar';

type ClassFilter = 'all' | 'active' | 'archived';
type ClassSort = 'newest' | 'name' | 'students';
type ToastState = { message: string; tone: 'success' | 'error' } | null;

interface ClassFormState extends ManagedClassInput {
  id?: string;
}

const createEmptyForm = (): ClassFormState => ({
  name: '',
  code: '',
  description: '',
  targetScore: 750,
  studentIds: [],
  isActive: true,
});

const formatDate = (value: string) => {
  if (!value) return 'Chưa xác định';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

const initialsFor = (name: string) => name
  .trim()
  .split(/\s+/)
  .slice(-2)
  .map((part) => part.charAt(0).toUpperCase())
  .join('') || 'HS';

const StudentAvatar: React.FC<{ student: ManagedClassStudent; className?: string }> = ({
  student,
  className = 'size-9',
}) => (
  <img
    src={student.avatar || getDiceBearAvatar(student.name)}
    alt={student.name}
    className={`${className} rounded-full object-cover ring-2 ring-surface`}
  />
);

const ProgressRing: React.FC<{ value: number }> = ({ value }) => {
  const normalized = Math.max(0, Math.min(100, Math.round(value)));
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative size-12 shrink-0" role="img" aria-label={`Tiến độ trung bình ${normalized}%`}>
      <svg viewBox="0 0 44 44" className="size-12 -rotate-90" aria-hidden="true">
        <circle cx="22" cy="22" r={radius} fill="none" stroke="currentColor" strokeWidth="4" className="text-surface-hover" />
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - normalized / 100)}
          className="text-brand transition-[stroke-dashoffset] duration-500 motion-reduce:transition-none"
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-[11px] font-black text-content">{normalized}%</span>
    </div>
  );
};

const ClassCardSkeleton: React.FC = () => (
  <BoneyardSkeleton name="class-card-skeleton" variant="card" height={210} />
);

export const ClassesManagementPage: React.FC = () => {
  const reduceMotion = useReducedMotion();
  const [classes, setClasses] = useState<ManagedClassRecord[]>([]);
  const [students, setStudents] = useState<ManagedClassStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ClassFilter>('all');
  const [sort, setSort] = useState<ClassSort>('newest');
  const [form, setForm] = useState<ClassFormState>(createEmptyForm);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ManagedClassRecord | null>(null);
  const [studentQuery, setStudentQuery] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyClassId, setBusyClassId] = useState('');
  const [toast, setToast] = useState<ToastState>(null);

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

  const studentById = useMemo(
    () => new Map(students.map((student) => [student.id, student])),
    [students],
  );
  const activeCount = useMemo(() => classes.filter((classItem) => classItem.isActive).length, [classes]);

  const filteredClasses = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('vi');
    return classes
      .filter((classItem) => {
        const matchesQuery = !normalizedQuery || `${classItem.name} ${classItem.code} ${classItem.description}`
          .toLocaleLowerCase('vi')
          .includes(normalizedQuery);
        const matchesStatus = filter === 'all'
          || (filter === 'active' && classItem.isActive)
          || (filter === 'archived' && !classItem.isActive);
        return matchesQuery && matchesStatus;
      })
      .sort((first, second) => {
        if (sort === 'name') return first.name.localeCompare(second.name, 'vi');
        if (sort === 'students') return second.studentCount - first.studentCount;
        return new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime();
      });
  }, [classes, filter, query, sort]);

  const filteredStudents = useMemo(() => {
    const normalizedQuery = studentQuery.trim().toLocaleLowerCase('vi');
    return students.filter((student) => (
      !normalizedQuery || `${student.name} ${student.email}`.toLocaleLowerCase('vi').includes(normalizedQuery)
    ));
  }, [studentQuery, students]);

  const showToast = (message: string, tone: 'success' | 'error') => setToast({ message, tone });

  const openCreate = () => {
    setForm(createEmptyForm());
    setStudentQuery('');
    setFormError('');
    setDialogOpen(true);
  };

  const openEdit = (classItem: ManagedClassRecord) => {
    setForm({
      id: classItem.id,
      name: classItem.name,
      code: classItem.code,
      description: classItem.description,
      targetScore: classItem.targetScore,
      studentIds: classItem.studentIds,
      isActive: classItem.isActive,
    });
    setStudentQuery('');
    setFormError('');
    setDialogOpen(true);
  };

  const closeEditor = () => {
    if (!isSubmitting) setDialogOpen(false);
  };

  const toggleStudent = (studentId: string) => {
    setForm((current) => ({
      ...current,
      studentIds: current.studentIds.includes(studentId)
        ? current.studentIds.filter((id) => id !== studentId)
        : [...current.studentIds, studentId],
    }));
  };

  const toggleAllFilteredStudents = () => {
    const filteredIds = filteredStudents.map((student) => student.id);
    const allSelected = filteredIds.length > 0 && filteredIds.every((id) => form.studentIds.includes(id));
    setForm((current) => ({
      ...current,
      studentIds: allSelected
        ? current.studentIds.filter((id) => !filteredIds.includes(id))
        : Array.from(new Set([...current.studentIds, ...filteredIds])),
    }));
  };

  const saveClass = async (event: FormEvent) => {
    event.preventDefault();
    const name = form.name.trim();
    const code = form.code.trim().toUpperCase();
    if (name.length < 2) {
      setFormError('Tên lớp phải có ít nhất 2 ký tự.');
      return;
    }
    if (!/^[A-Z0-9][A-Z0-9-]{1,18}[A-Z0-9]$/.test(code)) {
      setFormError('Mã lớp cần từ 3 đến 20 ký tự, chỉ gồm chữ in hoa, số và dấu gạch nối.');
      return;
    }
    if (classes.some((item) => item.code.toUpperCase() === code && item.id !== form.id)) {
      setFormError('Mã lớp này đã được sử dụng.');
      return;
    }

    const input: ManagedClassInput = {
      name,
      code,
      description: form.description.trim(),
      targetScore: form.targetScore,
      studentIds: form.studentIds,
      isActive: form.isActive,
    };
    setIsSubmitting(true);
    setFormError('');
    try {
      if (form.id) {
        const updated = await backendService.updateManagedClass(form.id, input);
        setClasses((current) => current.map((item) => item.id === updated.id ? updated : item));
        showToast('Đã cập nhật lớp học.', 'success');
      } else {
        const created = await backendService.createManagedClass(input);
        setClasses((current) => [created, ...current]);
        showToast('Đã tạo lớp học mới.', 'success');
      }
      setDialogOpen(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Không thể lưu lớp học.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleClassStatus = async (classItem: ManagedClassRecord) => {
    setBusyClassId(classItem.id);
    try {
      const updated = await backendService.updateManagedClass(classItem.id, {
        name: classItem.name,
        code: classItem.code,
        description: classItem.description,
        targetScore: classItem.targetScore,
        studentIds: classItem.studentIds,
        isActive: !classItem.isActive,
      });
      setClasses((current) => current.map((item) => item.id === updated.id ? updated : item));
      showToast(updated.isActive ? 'Đã kích hoạt lại lớp học.' : 'Đã lưu trữ lớp học.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không thể đổi trạng thái lớp.', 'error');
    } finally {
      setBusyClassId('');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setBusyClassId(deleteTarget.id);
    try {
      await backendService.deleteManagedClass(deleteTarget.id);
      setClasses((current) => current.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
      showToast('Đã xóa lớp học.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không thể xóa lớp học.', 'error');
      setDeleteTarget(null);
    } finally {
      setBusyClassId('');
    }
  };

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
      showToast(`Đã sao chép mã lớp ${code}.`, 'success');
    } catch {
      showToast('Trình duyệt không cho phép sao chép tự động.', 'error');
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Quản lý lớp học"
        description="Tạo nhóm lớp, sắp xếp học sinh và theo dõi tiến độ trong một không gian quản trị thống nhất."
        action={(
          <button type="button" onClick={openCreate} className="btn-primary whitespace-nowrap text-sm">
            <Plus className="size-4" aria-hidden="true" /> Tạo lớp mới
          </button>
        )}
      />

      {!isLoading && !loadError && classes.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm dark:shadow-none">
          <div className="flex flex-col gap-4 border-b border-line p-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                <School className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-content">{activeCount} lớp đang hoạt động</p>
                <p className="mt-0.5 text-xs text-content-muted">
                  {classes.length} lớp trong hệ thống, {students.length} tài khoản Học sinh khả dụng
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="relative block w-full sm:w-72">
                <span className="sr-only">Tìm lớp học</span>
                <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-content-muted" aria-hidden="true" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className={`${managementInputClass} pl-10`}
                  placeholder="Tìm tên, mã hoặc mô tả"
                />
              </label>
              <label className="sr-only" htmlFor="class-sort">Sắp xếp lớp học</label>
              <select
                id="class-sort"
                value={sort}
                onChange={(event) => setSort(event.target.value as ClassSort)}
                className={`${managementInputClass} sm:w-44`}
              >
                <option value="newest">Mới tạo gần đây</option>
                <option value="name">Tên từ A đến Z</option>
                <option value="students">Sĩ số cao nhất</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto p-3" role="tablist" aria-label="Lọc trạng thái lớp học">
            {([
              ['all', `Tất cả ${classes.length}`],
              ['active', `Đang hoạt động ${activeCount}`],
              ['archived', `Đã lưu trữ ${classes.length - activeCount}`],
            ] as Array<[ClassFilter, string]>).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={filter === value}
                onClick={() => setFilter(value)}
                className={`min-h-9 shrink-0 rounded-xl px-3.5 text-xs font-extrabold transition active:scale-[.98] ${
                  filter === value ? 'bg-brand text-brand-ink' : 'bg-surface-elevated text-content-muted hover:bg-surface-hover hover:text-content'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>
      )}

      {isLoading && (
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2" aria-label="Đang tải lớp học">
          {[0, 1, 2, 3].map((item) => <ClassCardSkeleton key={item} />)}
        </section>
      )}

      {!isLoading && loadError && (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900/70 dark:bg-red-500/10">
          <span className="mx-auto grid size-11 place-items-center rounded-xl bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300">
            <RefreshCw className="size-5" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-base font-extrabold text-content">Chưa tải được lớp học</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-content-muted">{loadError}</p>
          <button type="button" onClick={() => void loadClasses()} className="btn-secondary mt-5 text-sm">
            <RefreshCw className="size-4" aria-hidden="true" /> Thử lại
          </button>
        </section>
      )}

      {!isLoading && !loadError && classes.length === 0 && (
        <section className="rounded-2xl border border-dashed border-line bg-surface px-6 py-14 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
            <School className="size-7" aria-hidden="true" />
          </span>
          <h2 className="mt-5 text-lg font-extrabold text-content">Bắt đầu với lớp học đầu tiên</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-content-muted">
            Tạo lớp, chọn học sinh và đặt mục tiêu TOEIC. Dữ liệu sẽ được lưu trực tiếp trên hệ thống.
          </p>
          <button type="button" onClick={openCreate} className="btn-primary mt-6 text-sm">
            <Plus className="size-4" aria-hidden="true" /> Tạo lớp mới
          </button>
        </section>
      )}

      {!isLoading && !loadError && classes.length > 0 && filteredClasses.length === 0 && (
        <section className="rounded-2xl border border-dashed border-line bg-surface p-10 text-center">
          <Search className="mx-auto size-8 text-content-muted" aria-hidden="true" />
          <h2 className="mt-4 text-base font-extrabold text-content">Không có lớp phù hợp</h2>
          <p className="mt-1 text-sm text-content-muted">Thử đổi từ khóa hoặc trạng thái đang lọc.</p>
          <button type="button" onClick={() => { setQuery(''); setFilter('all'); }} className="btn-secondary mt-5 text-sm">Xóa bộ lọc</button>
        </section>
      )}

      {!isLoading && !loadError && filteredClasses.length > 0 && (
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {filteredClasses.map((classItem) => {
            const classStudents = classItem.studentIds
              .map((studentId) => studentById.get(studentId))
              .filter((student): student is ManagedClassStudent => Boolean(student));
            const isBusy = busyClassId === classItem.id;
            return (
              <article
                key={classItem.id}
                className={`rounded-2xl border bg-surface p-5 shadow-sm transition-colors dark:shadow-none ${
                  classItem.isActive ? 'border-line hover:border-accent/35' : 'border-line/80 opacity-80 hover:opacity-100'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-extrabold ${
                        classItem.isActive
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                          : 'bg-surface-elevated text-content-muted'
                      }`}>
                        <span className={`size-1.5 rounded-full ${classItem.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {classItem.isActive ? 'Đang hoạt động' : 'Đã lưu trữ'}
                      </span>
                      <button
                        type="button"
                        onClick={() => void copyClassCode(classItem.code)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface-elevated px-2 py-1 text-xs font-extrabold tracking-wide text-content-muted transition hover:border-accent/35 hover:text-content"
                        title="Sao chép mã lớp"
                      >
                        {classItem.code} <Copy className="size-3.5" aria-hidden="true" />
                      </button>
                    </div>
                    <h2 className="mt-3 truncate text-lg font-extrabold tracking-tight text-content">{classItem.name}</h2>
                    <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-content-muted">
                      {classItem.description || 'Chưa có mô tả cho lớp học này.'}
                    </p>
                  </div>
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                    <School className="size-5" aria-hidden="true" />
                  </span>
                </div>

                <div className="mt-5 flex items-center gap-4 rounded-xl border border-line bg-surface-elevated/70 p-3.5">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex shrink-0 -space-x-2">
                      {classStudents.slice(0, 3).map((student) => <StudentAvatar key={student.id} student={student} className="size-8" />)}
                      {classStudents.length === 0 && (
                        <span className="grid size-8 place-items-center rounded-full bg-surface-hover text-content-muted ring-2 ring-surface">
                          <UsersRound className="size-4" aria-hidden="true" />
                        </span>
                      )}
                      {classStudents.length > 3 && (
                        <span className="grid size-8 place-items-center rounded-full bg-brand-100 text-[11px] font-extrabold text-brand-800 ring-2 ring-surface dark:bg-brand-500/15 dark:text-brand-300">
                          +{classStudents.length - 3}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold text-content">{classItem.studentCount} học sinh</p>
                      <p className="mt-0.5 text-xs text-content-muted">Mục tiêu {classItem.targetScore} TOEIC</p>
                    </div>
                  </div>
                  <div className="hidden h-8 w-px bg-line sm:block" />
                  <div className="flex shrink-0 items-center gap-2.5">
                    <div className="hidden text-right sm:block">
                      <p className="text-xs font-bold text-content">Tiến độ lớp</p>
                      <p className="mt-0.5 text-xs text-content-muted">Trung bình hiện tại</p>
                    </div>
                    <ProgressRing value={classItem.averageProgress} />
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-content-muted">Tạo ngày {formatDate(classItem.createdAt)}</p>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => openEdit(classItem)} disabled={isBusy} className="btn-secondary min-h-10 flex-1 px-4 text-sm sm:flex-none">
                      <Edit3 className="size-4" aria-hidden="true" /> Quản lý lớp
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleClassStatus(classItem)}
                      disabled={isBusy}
                      aria-label={classItem.isActive ? 'Lưu trữ lớp' : 'Kích hoạt lại lớp'}
                      title={classItem.isActive ? 'Lưu trữ lớp' : 'Kích hoạt lại lớp'}
                      className="grid size-10 shrink-0 place-items-center rounded-xl border border-line text-content-muted transition hover:border-accent/35 hover:bg-brand-50 hover:text-content disabled:cursor-wait disabled:opacity-60 dark:hover:bg-brand-500/10"
                    >
                      {isBusy
                        ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                        : classItem.isActive
                          ? <Archive className="size-4" aria-hidden="true" />
                          : <ArchiveRestore className="size-4" aria-hidden="true" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(classItem)}
                      disabled={isBusy}
                      aria-label="Xóa lớp"
                      title="Xóa lớp"
                      className="grid size-10 shrink-0 place-items-center rounded-xl border border-red-200 text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-500/10"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      <DialogShell
        open={dialogOpen}
        onClose={closeEditor}
        title={form.id ? 'Quản lý lớp học' : 'Tạo lớp mới'}
        description={form.id ? 'Cập nhật thông tin và danh sách Học sinh trong lớp.' : 'Thiết lập thông tin cơ bản, sau đó chọn Học sinh tham gia.'}
        maxWidth="max-w-xl"
        footer={(
          <>
            <button type="button" onClick={closeEditor} disabled={isSubmitting} className="btn-secondary text-sm">Hủy</button>
            <button type="submit" form="class-form" disabled={isSubmitting} className="btn-primary min-w-32 text-sm disabled:cursor-wait disabled:opacity-70">
              {isSubmitting && <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
              {form.id ? 'Lưu thay đổi' : 'Tạo lớp'}
            </button>
          </>
        )}
      >
        <form id="class-form" onSubmit={saveClass} className="space-y-5">
          {formError && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium leading-relaxed text-red-700 dark:border-red-900 dark:bg-red-500/10 dark:text-red-300">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_160px]">
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-content">Tên lớp <span className="text-red-500">*</span></span>
              <input required maxLength={255} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={managementInputClass} placeholder="TOEIC 750 buổi tối" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-content">Mã lớp <span className="text-red-500">*</span></span>
              <input
                required
                minLength={3}
                maxLength={20}
                value={form.code}
                onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '') })}
                className={`${managementInputClass} font-bold uppercase tracking-wide`}
                placeholder="T750-A"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-content">Mô tả ngắn</span>
            <textarea
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              rows={2}
              maxLength={1000}
              className={`${managementInputClass} min-h-20 resize-y py-3 leading-relaxed`}
              placeholder="Mục tiêu và nội dung chính của lớp"
            />
            <span className="mt-1.5 block text-right text-xs text-content-muted">{form.description.length}/1000</span>
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[200px_minmax(0,1fr)]">
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-content">Mục tiêu điểm</span>
              <select value={form.targetScore} onChange={(event) => setForm({ ...form, targetScore: Number(event.target.value) })} className={managementInputClass}>
                {[500, 600, 650, 700, 750, 800, 850, 900].map((score) => <option key={score} value={score}>{score} TOEIC</option>)}
              </select>
            </label>

            {form.id && (
              <div className="rounded-xl border border-line bg-surface-elevated px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-content">Trạng thái lớp</p>
                    <p className="mt-1 text-xs leading-relaxed text-content-muted">
                      {form.isActive ? 'Lớp đang nhận bài tập mới.' : 'Lớp đã được lưu trữ.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.isActive}
                    onClick={() => setForm((current) => ({ ...current, isActive: !current.isActive }))}
                    className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ${form.isActive ? 'bg-brand' : 'bg-slate-300 dark:bg-slate-700'}`}
                  >
                    <span className={`absolute left-1 top-1 size-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${form.isActive ? 'translate-x-5' : 'translate-x-0'}`} />
                    <span className="sr-only">{form.isActive ? 'Lưu trữ lớp' : 'Kích hoạt lớp'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <fieldset>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <legend className="text-sm font-bold text-content">Học sinh trong lớp</legend>
                <p className="mt-1 text-xs leading-relaxed text-content-muted">
                  Đã chọn {form.studentIds.length} trong {students.length} tài khoản Học sinh.
                </p>
              </div>
              {filteredStudents.length > 0 && (
                <button type="button" onClick={toggleAllFilteredStudents} className="text-xs font-extrabold text-brand-700 hover:text-brand-800 dark:text-brand-300">
                  {filteredStudents.every((student) => form.studentIds.includes(student.id)) ? 'Bỏ chọn kết quả' : 'Chọn tất cả kết quả'}
                </button>
              )}
            </div>
            <div className="relative mt-3">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-content-muted" aria-hidden="true" />
              <input value={studentQuery} onChange={(event) => setStudentQuery(event.target.value)} className={`${managementInputClass} pl-10`} placeholder="Tìm theo tên hoặc email" aria-label="Tìm Học sinh để thêm vào lớp" />
            </div>
            <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-line bg-surface">
              {filteredStudents.map((student) => {
                const selected = form.studentIds.includes(student.id);
                return (
                  <label key={student.id} className={`flex min-h-14 cursor-pointer items-center gap-3 border-b border-line/70 px-3 py-2.5 transition-colors last:border-b-0 ${selected ? 'bg-brand-50 dark:bg-brand-500/10' : 'hover:bg-surface-hover'}`}>
                    <input type="checkbox" checked={selected} onChange={() => toggleStudent(student.id)} className="sr-only" />
                    <span className={`grid size-5 shrink-0 place-items-center rounded-md border transition-colors ${selected ? 'border-brand bg-brand text-brand-ink' : 'border-line bg-surface-elevated'}`}>
                      {selected && <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />}
                    </span>
                    <StudentAvatar student={student} className="size-9" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-content">{student.name}</span>
                      <span className="mt-0.5 block truncate text-xs text-content-muted">{student.email}</span>
                    </span>
                    <span className="hidden shrink-0 text-right sm:block">
                      <span className="block text-xs font-extrabold text-content">{student.currentScore || 'Chưa có điểm'}</span>
                      <span className="mt-0.5 block text-xs text-content-muted">Mục tiêu {student.targetScore}</span>
                    </span>
                  </label>
                );
              })}

              {students.length === 0 && (
                <div className="px-5 py-8 text-center">
                  <UserRoundPlus className="mx-auto size-7 text-content-muted" aria-hidden="true" />
                  <p className="mt-3 text-sm font-bold text-content">Chưa có tài khoản Học sinh</p>
                  <p className="mt-1 text-xs leading-relaxed text-content-muted">Bạn vẫn có thể tạo lớp và thêm thành viên sau.</p>
                </div>
              )}
              {students.length > 0 && filteredStudents.length === 0 && (
                <div className="px-5 py-8 text-center">
                  <Search className="mx-auto size-7 text-content-muted" aria-hidden="true" />
                  <p className="mt-3 text-sm font-bold text-content">Không tìm thấy Học sinh</p>
                  <p className="mt-1 text-xs text-content-muted">Thử một tên hoặc email khác.</p>
                </div>
              )}
            </div>
          </fieldset>
        </form>
      </DialogShell>

      <DialogShell
        open={Boolean(deleteTarget)}
        onClose={() => { if (!busyClassId) setDeleteTarget(null); }}
        title="Xóa lớp học?"
        description="Hành động này không xóa tài khoản Học sinh."
        maxWidth="max-w-md"
        footer={(
          <>
            <button type="button" onClick={() => setDeleteTarget(null)} disabled={Boolean(busyClassId)} className="btn-secondary text-sm">Giữ lại lớp</button>
            <button type="button" onClick={() => void confirmDelete()} disabled={Boolean(busyClassId)} className="inline-flex min-h-11 min-w-32 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-extrabold text-white transition hover:bg-red-700 active:scale-[.98] disabled:cursor-wait disabled:opacity-70">
              {busyClassId && <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
              Xác nhận xóa
            </button>
          </>
        )}
      >
        <div className="flex gap-3 rounded-xl bg-surface-elevated p-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300">
            <Trash2 className="size-5" aria-hidden="true" />
          </span>
          <p className="text-sm leading-relaxed text-content-muted">
            Lớp <strong className="font-extrabold text-content">{deleteTarget?.name}</strong> và danh sách thành viên liên kết sẽ bị xóa. Nếu lớp đã dùng để giao bài, hệ thống sẽ yêu cầu bạn lưu trữ lớp thay thế.
          </p>
        </div>
      </DialogShell>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: reduceMotion ? 0.1 : 0.2, ease: 'easeOut' }}
            role="status"
            className={`fixed bottom-5 left-1/2 z-[120] flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold shadow-xl ${
              toast.tone === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-slate-900 dark:text-emerald-300'
                : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-slate-900 dark:text-red-300'
            }`}
          >
            {toast.tone === 'success' ? <CheckCircle2 className="size-4" aria-hidden="true" /> : <RefreshCw className="size-4" aria-hidden="true" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
