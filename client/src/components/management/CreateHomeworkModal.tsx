import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardCheck,
  FileCheck2,
  FileText,
  Search,
  UsersRound,
  X,
} from 'lucide-react';
import { HomeworkAssignment } from '../../types/management';
import { ManagedClassRecord } from '../../services/backend';
import { MockTestItem } from '../../types';
import { TestCard } from '../mock-test/TestCard';
import { BoneyardSkeleton } from '../common/BoneyardSkeleton';
import { HomeworkSetupStep } from './HomeworkSetupStep';
import { getModalMotion } from '../common/modalMotion';
import {
  getOptionStateClass,
  OPTION_BASE_CLASS,
  PARTS_CONFIG,
  PartOption,
  SelectionIndicator,
} from '../mock-test/SelectModeModal';

interface CreateHomeworkModalProps {
  open: boolean;
  classes: ManagedClassRecord[];
  tests: MockTestItem[];
  testsLoading?: boolean;
  initialAssignment?: HomeworkAssignment;
  initialStep?: number;
  onClose: () => void;
  onSubmit: (assignment: HomeworkAssignment) => void | Promise<void>;
}

const STEP_LABELS = ['Chọn lớp', 'Chọn đề', 'Phạm vi', 'Thiết lập', 'Xác nhận'];
const stepTitleClassName = 'text-lg font-bold tracking-tight text-content';
const stepDescriptionClassName = 'mt-1.5 text-sm font-normal leading-relaxed text-content-muted';

const inputClassName =
  'min-h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-sm text-content outline-none transition-colors duration-200 placeholder:text-content-muted focus:border-accent focus:ring-4 focus:ring-accent/10';

const getDefaultDeadline = () => {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 10);
};

const getSuggestedTitle = (
  test: MockTestItem | undefined,
  scope: HomeworkAssignment['scope'],
  selectedParts: number[],
) => {
  if (!test) return '';
  if (scope === 'full') return `${test.title} - Cả bài`;
  if (!selectedParts.length) return test.title;

  const sortedParts = [...selectedParts].sort((a, b) => a - b);
  if (sortedParts.length === 1) {
    const part = sortedParts[0];
    const section = part <= 4 ? 'Listening' : 'Reading';
    return `${section} Part ${part} - ${test.title}`;
  }

  return `${sortedParts.map((part) => `Part ${part}`).join(' + ')} - ${test.title}`;
};

const PartGroup = ({
  label,
  category,
  selectedParts,
  onToggle,
}: {
  label: string;
  category: PartOption['category'];
  selectedParts: number[];
  onToggle: (part: number) => void;
}) => (
  <section>
    <h3 className="mb-2.5 mt-4 text-sm font-semibold text-content">
      {label}
    </h3>
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {PARTS_CONFIG.filter((part) => part.category === category).map((part) => {
        const selected = selectedParts.includes(part.id);
        return (
          <button
            key={part.id}
            type="button"
            role="checkbox"
            aria-checked={selected}
            onClick={() => onToggle(part.id)}
            className={`${OPTION_BASE_CLASS} ${getOptionStateClass(selected)} flex min-h-12 items-center justify-between gap-3 rounded-2xl p-3 text-left text-sm font-medium`}
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <SelectionIndicator selected={selected} />
              <span>{part.name}</span>
            </span>
            <span className="shrink-0 text-xs font-normal text-content-muted">
              {part.count}
            </span>
          </button>
        );
      })}
    </div>
  </section>
);

export const CreateHomeworkModal: React.FC<CreateHomeworkModalProps> = ({
  open,
  classes,
  tests,
  testsLoading = false,
  initialAssignment,
  initialStep = 1,
  onClose,
  onSubmit,
}) => {
  const reduceMotion = useReducedMotion();
  const modalMotion = getModalMotion(reduceMotion);
  const [step, setStep] = useState(Math.min(5, Math.max(1, initialStep)));
  const [classIds, setClassIds] = useState<string[]>(initialAssignment?.classIds ?? []);
  const [classPickerOpen, setClassPickerOpen] = useState(false);
  const [testId, setTestId] = useState(initialAssignment?.testId ?? '');
  const [testSearch, setTestSearch] = useState('');
  const [testYear, setTestYear] = useState<number | null>(() => (
    tests.find((test) => test.id === initialAssignment?.testId)?.year
      ?? tests.reduce<number | null>(
        (latest, test) => (latest === null || test.year > latest ? test.year : latest),
        null,
      )
  ));
  const [scope, setScope] = useState<HomeworkAssignment['scope']>(
    initialAssignment?.scope ?? 'full',
  );
  const [selectedParts, setSelectedParts] = useState<number[]>(
    initialAssignment?.selectedParts ?? [],
  );
  const [title, setTitle] = useState(initialAssignment?.title ?? '');
  const [titleTouched, setTitleTouched] = useState(Boolean(initialAssignment));
  const [description, setDescription] = useState(initialAssignment?.description ?? '');
  const [deadline, setDeadline] = useState(
    initialAssignment?.deadline ?? getDefaultDeadline(),
  );
  const [allowLate, setAllowLate] = useState(initialAssignment?.allowLate ?? false);
  const [validationMessage, setValidationMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedTest = useMemo(
    () => tests.find((test) => test.id === testId),
    [testId, tests],
  );
  const selectedClasses = useMemo(
    () => classes.filter((classItem) => classIds.includes(classItem.id)),
    [classIds, classes],
  );
  const recipientCount = useMemo(
    () => new Set(selectedClasses.flatMap((classItem) => classItem.studentIds)).size,
    [selectedClasses],
  );
  const questionCount = useMemo(() => {
    if (!selectedTest) return 0;
    if (scope === 'full') return selectedTest.totalQuestions;
    return PARTS_CONFIG.filter((part) => selectedParts.includes(part.id)).reduce(
      (total, part) => total + Number.parseInt(part.count, 10),
      0,
    );
  }, [scope, selectedParts, selectedTest]);
  const testYears = useMemo(
    () => Array.from(new Set(tests.map((test) => test.year))).sort((a, b) => b - a),
    [tests],
  );
  const filteredTests = useMemo(() => {
    if (testYear === null) return [];
    const query = testSearch.trim().toLocaleLowerCase('vi');
    return tests.filter((test) =>
      test.year === testYear
      && (!query || `${test.title} ${test.type}`.toLocaleLowerCase('vi').includes(query)),
    );
  }, [testSearch, testYear, tests]);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [onClose, open, submitting]);

  useEffect(() => {
    if (titleTouched) return;
    setTitle(getSuggestedTitle(selectedTest, scope, selectedParts));
  }, [scope, selectedParts, selectedTest, titleTouched]);

  useEffect(() => {
    const assignedYear = tests.find((test) => test.id === testId)?.year;
    setTestYear((current) => {
      if (initialAssignment && assignedYear) return assignedYear;
      if (current !== null && testYears.includes(current)) return current;
      return assignedYear ?? testYears[0] ?? null;
    });
  }, [initialAssignment, testId, testYears, tests]);

  if (!open || typeof document === 'undefined') return null;

  const toggleClass = (classId: string) => {
    setClassIds((current) =>
      current.includes(classId)
        ? current.filter((id) => id !== classId)
        : [...current, classId],
    );
    setValidationMessage('');
  };

  const togglePart = (partId: number) => {
    setSelectedParts((current) =>
      current.includes(partId)
        ? current.filter((id) => id !== partId)
        : [...current, partId].sort((a, b) => a - b),
    );
    setValidationMessage('');
  };

  const getStepError = () => {
    if (step === 1 && classIds.length === 0) return 'Vui lòng chọn ít nhất một lớp.';
    if (step === 2 && !testId) return 'Vui lòng chọn một đề thi.';
    if (step === 3 && scope === 'parts' && selectedParts.length === 0) {
      return 'Vui lòng chọn ít nhất một Part.';
    }
    if (step === 4 && !title.trim()) return 'Vui lòng nhập tên bài tập.';
    if (step === 4 && !deadline) return 'Vui lòng chọn hạn nộp.';
    return '';
  };

  const goNext = () => {
    const error = getStepError();
    if (error) {
      setValidationMessage(error);
      return;
    }
    setValidationMessage('');
    setStep((current) => Math.min(5, current + 1));
  };

  const handleSubmit = async () => {
    if (!selectedTest || !classIds.length || !title.trim() || !deadline) return;
    setSubmitting(true);
    setValidationMessage('');
    try {
      await onSubmit({
        id: initialAssignment?.id ?? `homework-${Date.now()}`,
        classIds,
        testId: selectedTest.id,
        scope,
        selectedParts: scope === 'parts' ? selectedParts : [],
        title: title.trim(),
        description: description.trim(),
        deadline,
        allowLate,
        createdAt: initialAssignment?.createdAt ?? new Date().toISOString(),
        submittedStudentIds: initialAssignment?.submittedStudentIds ?? [],
        lateStudentIds: initialAssignment?.lateStudentIds ?? [],
      });
    } catch (error) {
      setValidationMessage(
        error instanceof Error
          ? error.message
          : 'Không thể lưu bài tập. Vui lòng thử lại.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const content = (() => {
    if (step === 1) {
      return (
        <div className="mx-auto max-w-2xl">
          <h2 className={stepTitleClassName}>Chọn lớp nhận bài tập</h2>
          <p className={stepDescriptionClassName}>
            Có thể giao cùng một bài cho nhiều nhóm lớp.
          </p>

          <div className="relative mt-4">
            <button
              type="button"
              onClick={() => setClassPickerOpen((current) => !current)}
              aria-expanded={classPickerOpen}
              className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 text-left text-sm text-content transition hover:border-accent/45"
            >
              <span className={classIds.length ? 'font-semibold' : 'text-content-muted'}>
                {classIds.length
                  ? `${classIds.length} lớp đã chọn`
                  : 'Chọn một hoặc nhiều lớp'}
              </span>
              <ChevronDown
                className={`size-4 text-content-muted transition-transform ${classPickerOpen ? 'rotate-180' : ''}`}
              />
            </button>

            <AnimatePresence initial={false}>
              {classPickerOpen && (
                <motion.div
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                  className="mt-2 grid gap-2 rounded-2xl border border-line bg-surface-elevated p-2 sm:grid-cols-2"
                >
                  {classes.map((classItem) => {
                    const selected = classIds.includes(classItem.id);
                    return (
                      <button
                        key={classItem.id}
                        type="button"
                        role="checkbox"
                        aria-checked={selected}
                        onClick={() => toggleClass(classItem.id)}
                        className={`${OPTION_BASE_CLASS} ${getOptionStateClass(selected)} flex items-center gap-3 rounded-xl p-3 text-left`}
                      >
                        <SelectionIndicator selected={selected} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{classItem.name}</span>
                          <span className="mt-1 block text-xs leading-relaxed text-content-muted">
                            {classItem.code} - {classItem.studentIds.length} học sinh
                          </span>
                        </span>
                      </button>
                    );
                  })}
                  {classes.length === 0 && (
                    <div className="p-5 text-center sm:col-span-2">
                      <UsersRound className="mx-auto size-7 text-content-muted" aria-hidden="true" />
                      <p className="mt-3 text-sm font-semibold text-content">Chưa có lớp đang hoạt động</p>
                      <p className="mt-1 text-sm leading-relaxed text-content-muted">
                        Hãy tạo hoặc kích hoạt một lớp trong trang Quản lý lớp học trước khi giao bài.
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {selectedClasses.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {selectedClasses.map((classItem) => (
                <span
                  key={classItem.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-700 dark:border-brand-500/25 dark:bg-brand-500/10 dark:text-brand-300"
                >
                  {classItem.code}
                  <button
                    type="button"
                    onClick={() => toggleClass(classItem.id)}
                    aria-label={`Bỏ chọn lớp ${classItem.code}`}
                    className="rounded-full p-0.5 hover:bg-brand-100 dark:hover:bg-brand-500/20"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (step === 2) {
      return (
        <div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className={stepTitleClassName}>Chọn nguồn đề thi</h2>
              <p className={stepDescriptionClassName}>Chọn một Test trong Kho đề thi.</p>
            </div>
            <label className="relative block w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-content-muted" />
              <input
                type="search"
                value={testSearch}
                onChange={(event) => setTestSearch(event.target.value)}
                aria-label={`Tìm đề thi trong năm ${testYear ?? ''}`}
                placeholder={testYear ? `Tìm đề năm ${testYear}...` : 'Tìm đề thi...'}
                className={`${inputClassName} pl-9`}
              />
            </label>
          </div>

          {!testsLoading && testYears.length > 0 && (
            <section className="mt-4" aria-labelledby="test-year-label">
              <div className="flex items-center justify-between gap-3">
                <h3 id="test-year-label" className="text-sm font-semibold text-content">
                  Chọn năm phát hành
                </h3>
                <span className="text-xs font-medium text-content-muted">
                  {testYears.length} năm có đề
                </span>
              </div>

              <div
                role="tablist"
                aria-label="Năm phát hành đề thi"
                className="mt-2.5 flex gap-2 overflow-x-auto pb-1"
              >
                {testYears.map((year) => {
                  const selected = year === testYear;
                  const count = tests.filter((test) => test.year === year).length;
                  return (
                    <button
                      key={year}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      aria-controls="test-year-panel"
                      onClick={() => {
                        if (year === testYear) return;
                        setTestYear(year);
                        setTestSearch('');
                        if (selectedTest?.year !== year) setTestId('');
                        setValidationMessage('');
                      }}
                      className={`shrink-0 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors duration-200 ${
                        selected
                          ? 'border-accent bg-accent text-brand-ink shadow-sm'
                          : 'border-line bg-surface-elevated text-content-muted hover:border-accent/45 hover:text-content'
                      }`}
                    >
                      {year} <span className="font-normal opacity-75">({count})</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {testsLoading ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[0, 1, 2, 3].map((item) => (
                <BoneyardSkeleton key={item} name={`hw-test-card-${item}`} variant="card" height={176} />
              ))}
            </div>
          ) : testYears.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-line p-6 text-center">
              <FileText className="mx-auto size-7 text-content-muted" aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold text-content">Kho đề chưa có dữ liệu</p>
              <p className="mt-1 text-sm text-content-muted">
                Chỉ các đề được tải từ hệ thống mới xuất hiện tại đây.
              </p>
            </div>
          ) : filteredTests.length ? (
            <div
              id="test-year-panel"
              role="tabpanel"
              className="mt-4"
              aria-label={`Đề thi năm ${testYear}`}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-content">Đề thi năm {testYear}</h3>
                <span className="text-sm text-content-muted">{filteredTests.length} đề</span>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {filteredTests.map((test) => (
                  <TestCard
                    key={test.id}
                    test={test}
                    variant="picker"
                    selected={test.id === testId}
                    onSelect={(selected) => {
                      setTestId(selected.id);
                      setValidationMessage('');
                    }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div
              id="test-year-panel"
              role="tabpanel"
              className="mt-4 rounded-2xl border border-dashed border-line p-6 text-center text-sm text-content-muted"
            >
              Không tìm thấy đề thi phù hợp trong năm {testYear}.
            </div>
          )}
        </div>
      );
    }

    if (step === 3) {
      return (
        <div className="mx-auto max-w-3xl">
          <h2 className={stepTitleClassName}>Chọn phạm vi bài tập</h2>
          <p className={stepDescriptionClassName}>Giao toàn bộ Test hoặc chọn nhiều Part.</p>

          <div role="radiogroup" className="mt-4 grid grid-cols-2 gap-2 rounded-2xl border border-line bg-surface-elevated p-1.5">
            {([
              { value: 'full' as const, label: 'Giao cả bài', icon: FileCheck2 },
              { value: 'parts' as const, label: 'Chọn Part cụ thể', icon: ClipboardCheck },
            ]).map((option) => {
              const Icon = option.icon;
              const selected = scope === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => {
                    setScope(option.value);
                    setValidationMessage('');
                  }}
                  className={`${OPTION_BASE_CLASS} ${getOptionStateClass(selected)} flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold`}
                >
                  <Icon className="size-4" />
                  {option.label}
                </button>
              );
            })}
          </div>

          {scope === 'full' ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
              Học sinh sẽ làm toàn bộ {selectedTest?.totalQuestions ?? 200} câu trong {selectedTest?.durationMinutes ?? 120} phút.
            </div>
          ) : (
            <div role="group" aria-label="Các Part được giao">
              <PartGroup
                label="Listening"
                category="listening"
                selectedParts={selectedParts}
                onToggle={togglePart}
              />
              <PartGroup
                label="Reading"
                category="reading"
                selectedParts={selectedParts}
                onToggle={togglePart}
              />
            </div>
          )}
        </div>
      );
    }

    if (step === 4) {
      return (
        <HomeworkSetupStep
          title={title}
          description={description}
          deadline={deadline}
          allowLate={allowLate}
          onTitleChange={(value) => {
            setTitle(value);
            setTitleTouched(true);
          }}
          onDescriptionChange={setDescription}
          onDeadlineChange={setDeadline}
          onAllowLateChange={setAllowLate}
        />
      );
    }

    return (
      <div className="mx-auto max-w-3xl">
        <h2 className={stepTitleClassName}>Xác nhận và giao bài</h2>
        <p className={stepDescriptionClassName}>Kiểm tra tổng quan trước khi gửi cho học sinh.</p>

        <div className="mt-4 rounded-2xl border border-line bg-surface-elevated p-4">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
              <FileText className="size-5" />
            </span>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-content">{title}</h3>
              <p className="mt-1 text-sm text-content-muted">{selectedTest?.title}</p>
              {description && <p className="mt-2 text-sm leading-relaxed text-content-muted">{description}</p>}
            </div>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <div className="rounded-xl bg-surface p-2.5">
              <dt className="text-xs font-medium text-content-muted">Nhóm lớp</dt>
              <dd className="mt-1 text-base font-bold text-content">{classIds.length}</dd>
            </div>
            <div className="rounded-xl bg-surface p-2.5">
              <dt className="text-xs font-medium text-content-muted">Học sinh nhận bài</dt>
              <dd className="mt-1 text-base font-bold text-content">{recipientCount}</dd>
            </div>
            <div className="rounded-xl bg-surface p-2.5">
              <dt className="text-xs font-medium text-content-muted">Số câu</dt>
              <dd className="mt-1 text-base font-bold text-content">{questionCount}</dd>
            </div>
            <div className="rounded-xl bg-surface p-2.5">
              <dt className="text-xs font-medium text-content-muted">Phạm vi</dt>
              <dd className="mt-1 text-base font-bold text-content">
                {scope === 'full' ? 'Cả bài' : `${selectedParts.length} Part`}
              </dd>
            </div>
          </dl>

          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-3 text-sm font-medium text-content-muted">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-4" /> Hạn {deadline}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <UsersRound className="size-4" /> {selectedClasses.map((item) => item.code).join(', ')}
            </span>
            <span>{allowLate ? 'Cho phép nộp trễ' : 'Không nhận bài trễ'}</span>
          </div>
        </div>
      </div>
    );
  })();

  return createPortal(
    <motion.div
      {...modalMotion.backdrop}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/65 p-2 backdrop-blur-sm sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <motion.section
        {...modalMotion.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-homework-title"
        aria-busy={submitting}
        className="flex max-h-[min(720px,calc(100dvh_-_2rem))] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-line bg-surface text-content shadow-2xl dark:shadow-none"
      >
        <header className="border-b border-line px-4 py-3 sm:px-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 id="create-homework-title" className="text-xl font-bold tracking-tight text-content">
                {initialAssignment ? 'Chỉnh sửa bài tập' : 'Giao bài tập mới'}
              </h1>
              <p className="mt-1 text-sm font-normal text-content-muted">{STEP_LABELS[step - 1]}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              aria-label="Đóng"
              className="grid size-9 place-items-center rounded-xl text-content-muted transition hover:bg-surface-hover hover:text-content active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X className="size-4.5" />
            </button>
          </div>

          <ol className="mt-3 flex items-center gap-1 overflow-x-auto pb-1">
            {STEP_LABELS.map((label, index) => {
              const number = index + 1;
              const active = number === step;
              const complete = number < step;
              return (
                <li key={label} className="flex min-w-0 flex-1 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => complete && setStep(number)}
                    disabled={!complete || submitting}
                    aria-current={active ? 'step' : undefined}
                    className={`flex min-w-0 items-center gap-2.5 ${complete ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <span
                      className={`inline-flex size-8 shrink-0 items-center justify-center rounded-full p-0 text-xs font-bold leading-none tabular-nums ${
                        active
                          ? 'bg-accent text-brand-ink'
                          : complete
                            ? 'bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300'
                            : 'bg-surface-hover text-content-muted'
                      }`}
                    >
                      {complete ? <Check className="size-4" /> : number}
                    </span>
                    <span className={`hidden truncate text-sm font-semibold md:block ${active ? 'text-content' : 'text-content-muted'}`}>
                      {label}
                    </span>
                  </button>
                  {number < STEP_LABELS.length && <span className="h-px min-w-3 flex-1 bg-line" />}
                </li>
              );
            })}
          </ol>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -12 }}
              transition={{ duration: reduceMotion ? 0.1 : 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              {content}
            </motion.div>
          </AnimatePresence>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface-elevated/50 px-4 py-2.5 sm:px-5">
          <div className="min-h-5 text-sm font-medium text-red-600 dark:text-red-300">
            {validationMessage}
          </div>
          <div className="ml-auto flex items-center gap-2">
            {step > 1 && (
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  setValidationMessage('');
                  setStep((current) => Math.max(1, current - 1));
                }}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-line bg-surface px-4 text-sm font-semibold text-content transition hover:bg-surface-hover active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ArrowLeft className="size-4" /> Quay lại
              </button>
            )}
            {step < 5 ? (
              <button
                type="button"
                onClick={goNext}
                disabled={submitting}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-accent px-4 text-sm font-semibold text-brand-ink shadow-sm transition hover:bg-accent-hover active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Tiếp tục <ArrowRight className="size-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={submitting}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-accent px-5 text-sm font-semibold text-brand-ink shadow-sm transition hover:bg-accent-hover active:scale-[.98] disabled:cursor-wait disabled:opacity-60"
              >
                <ClipboardCheck className="size-4" />
                {submitting
                  ? 'Đang lưu...'
                  : initialAssignment
                    ? 'Lưu thay đổi'
                    : 'Giao bài tập'}
              </button>
            )}
          </div>
        </footer>
      </motion.section>
    </motion.div>,
    document.body,
  );
};
