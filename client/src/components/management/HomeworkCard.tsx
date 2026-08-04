import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Bell,
  BellRing,
  CalendarClock,
  ChevronDown,
  ClipboardList,
  Clock3,
  Pencil,
  Trash2,
  UsersRound,
} from 'lucide-react';
import { HomeworkAssignment } from '../../types/management';
import { ManagedClassRecord, ManagedClassStudent } from '../../services/backend';

interface HomeworkCardProps {
  assignment: HomeworkAssignment;
  classes: ManagedClassRecord[];
  students: ManagedClassStudent[];
  expanded: boolean;
  onToggle: () => void;
  onEdit?: () => void;
  onCancel?: () => void;
  onExtend?: () => void;
  onRemindStudent?: (studentId: string) => void;
  onRemindAll?: (studentIds: string[]) => void;
}

const SubmissionProgress = ({ ratio }: { ratio: number }) => (
  <div
    role="img"
    aria-label={`Tỷ lệ nộp ${ratio}%`}
    className="grid size-11 shrink-0 place-items-center rounded-full"
    style={{
      backgroundImage: `conic-gradient(rgb(var(--color-brand-primary)) ${ratio}%, rgb(var(--color-bg-hover)) ${ratio}% 100%)`,
    }}
  >
    <span className="size-8 rounded-full bg-surface shadow-[inset_0_0_0_1px_rgb(var(--color-border-subtle))]" />
  </div>
);

const ReminderButton = ({
  student,
  onRemind,
}: {
  student: ManagedClassStudent;
  onRemind?: (studentId: string) => void;
}) => (
  <button
    type="button"
    onClick={() => onRemind?.(student.id)}
    aria-label={`Nhắc ${student.name} nộp bài`}
    title={`Nhắc ${student.name}`}
    className="grid size-8 shrink-0 place-items-center rounded-full text-content-muted transition hover:bg-brand-100 hover:text-brand-700 active:scale-[.96] dark:hover:bg-brand-500/15 dark:hover:text-brand-300"
  >
    <Bell className="size-4" aria-hidden="true" />
  </button>
);

export const HomeworkCard: React.FC<HomeworkCardProps> = ({
  assignment,
  classes,
  students,
  expanded,
  onToggle,
  onEdit,
  onCancel,
  onExtend,
  onRemindStudent,
  onRemindAll,
}) => {
  const reduceMotion = useReducedMotion();
  const submittedCount = students.filter((student) =>
    assignment.submittedStudentIds.includes(student.id),
  ).length;
  const missing = students.filter(
    (student) => !assignment.submittedStudentIds.includes(student.id),
  );
  const ratio = students.length
    ? Math.round((submittedCount / students.length) * 100)
    : 0;
  const detailsId = `homework-details-${assignment.id}`;
  const showAsChips = missing.length > 0 && missing.length <= 5;
  const scopeLabel = assignment.scope === 'full'
    ? 'Cả bài'
    : `${assignment.selectedParts.length} Part`;
  const classLabel = classes.length > 1
    ? `${classes[0]?.code ?? 'Lớp'} +${classes.length - 1}`
    : classes[0]?.code ?? 'Chưa có lớp';
  const formattedDeadline = assignment.deadline.includes('/')
    ? assignment.deadline
    : new Intl.DateTimeFormat('vi-VN').format(
        new Date(`${assignment.deadline}T00:00:00`),
      );

  const managementActions = (
    <>
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Sửa ${assignment.title}`}
        title="Sửa bài tập"
        className="grid size-8 place-items-center rounded-lg text-content-muted transition hover:bg-surface-hover hover:text-content active:scale-[.96]"
      >
        <Pencil className="size-3.5" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={onExtend}
        aria-label={`Gia hạn ${assignment.title}`}
        title="Gia hạn"
        className="grid size-8 place-items-center rounded-lg text-content-muted transition hover:bg-brand-50 hover:text-brand-700 active:scale-[.96] dark:hover:bg-brand-500/10 dark:hover:text-brand-300"
      >
        <CalendarClock className="size-3.5" aria-hidden="true" />
      </button>
      {submittedCount === 0 && (
        <button
          type="button"
          onClick={onCancel}
          aria-label={`Huỷ giao ${assignment.title}`}
          title="Huỷ giao bài"
          className="grid size-8 place-items-center rounded-lg text-content-muted transition hover:bg-red-50 hover:text-red-600 active:scale-[.96] dark:hover:bg-red-500/10 dark:hover:text-red-300"
        >
          <Trash2 className="size-3.5" aria-hidden="true" />
        </button>
      )}
    </>
  );

  return (
    <motion.article
      layout={!reduceMotion}
      transition={{ layout: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } }}
      className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm dark:shadow-none"
    >
      <div className="p-3 sm:p-4">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 lg:grid-cols-[auto_minmax(0,1fr)_auto_auto_auto] lg:gap-4">
          <div className="flex shrink-0 items-center gap-1.5">
            <span
              title={classes.map((classItem) => classItem.code).join(', ')}
              className="inline-flex h-7 items-center rounded-lg border border-line bg-surface-elevated px-2.5 text-[10px] font-extrabold text-content-muted"
            >
              {classLabel}
            </span>
            <span className="inline-flex h-7 items-center rounded-lg border border-brand-200 bg-brand-50 px-2 text-[10px] font-extrabold text-brand-700 dark:border-brand-500/25 dark:bg-brand-500/10 dark:text-brand-300">
              {scopeLabel}
            </span>
          </div>

          <div className="flex min-w-0 items-baseline gap-2.5">
            <h2
              title={assignment.title}
              className="min-w-0 truncate text-sm font-extrabold text-content sm:text-base"
            >
              {assignment.title}
            </h2>
            <p
              title={assignment.description}
              className="hidden min-w-0 truncate text-xs text-content-muted sm:block"
            >
              {assignment.description}
            </p>
          </div>

          <div className="hidden items-center gap-4 whitespace-nowrap text-[11px] font-semibold text-content-muted lg:flex">
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="size-3.5" aria-hidden="true" />
              Hạn {formattedDeadline}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <UsersRound className="size-3.5" aria-hidden="true" />
              {submittedCount}/{students.length} đã nộp
            </span>
          </div>

          <div className="hidden items-center gap-2.5 lg:flex">
            <SubmissionProgress ratio={ratio} />
            <div className="w-[4.5rem]">
              <p className="text-base font-black leading-none text-content">{ratio}%</p>
              <p className="mt-1 whitespace-nowrap text-[10px] font-bold text-content-muted">
                {missing.length} chưa nộp
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <span className="hidden items-center gap-0.5 lg:flex">{managementActions}</span>
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={expanded}
              aria-controls={detailsId}
              aria-label={expanded ? 'Ẩn danh sách học sinh chưa nộp' : `Xem ${missing.length} học sinh chưa nộp`}
              className="grid size-10 place-items-center rounded-xl border border-line text-content-muted transition hover:border-accent/50 hover:bg-surface-hover hover:text-content active:scale-[.96]"
            >
              <motion.span
                animate={{ rotate: expanded ? 180 : 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
              >
                <ChevronDown className="size-4" aria-hidden="true" />
              </motion.span>
            </button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-line pt-3 lg:hidden">
          <div className="min-w-0 space-y-1 text-[11px] font-semibold text-content-muted">
            <span className="flex items-center gap-1.5">
              <Clock3 className="size-3.5" aria-hidden="true" />
              Hạn {formattedDeadline}
            </span>
            <span className="flex items-center gap-1.5">
              <UsersRound className="size-3.5" aria-hidden="true" />
              {submittedCount}/{students.length} học sinh đã nộp
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <SubmissionProgress ratio={ratio} />
            <div className="w-16">
              <p className="text-sm font-black leading-none text-content">{ratio}%</p>
              <p className="mt-1 whitespace-nowrap text-[10px] font-bold text-content-muted">
                {missing.length} chưa nộp
              </p>
            </div>
          </div>
          <div className="col-span-2 flex items-center justify-end gap-0.5 border-t border-line pt-2 lg:hidden">
            {managementActions}
          </div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            id={detailsId}
            key="details"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: reduceMotion ? 0.1 : 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="border-t border-line bg-surface-elevated/55 px-3 py-3 sm:px-4"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xs font-extrabold text-content">
                Học sinh chưa nộp
                <span className="ml-1.5 font-semibold text-content-muted">({missing.length})</span>
              </h3>
              {missing.length > 0 && (
                <button
                  type="button"
                  onClick={() => onRemindAll?.(missing.map((student) => student.id))}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-2.5 text-[10px] font-extrabold text-brand-700 transition hover:bg-brand-100 active:scale-[.97] dark:border-brand-500/25 dark:bg-brand-500/10 dark:text-brand-300 dark:hover:bg-brand-500/15"
                >
                  <BellRing className="size-3.5" aria-hidden="true" />
                  Nhắc tất cả
                </button>
              )}
            </div>

            {showAsChips ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {missing.map((student) => (
                  <li
                    key={student.id}
                    title={`${student.name} - ${student.email}`}
                    className="flex h-11 min-w-0 items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1.5 pr-1.5"
                  >
                    <img
                      src={student.avatar}
                      alt=""
                      className="size-8 rounded-full object-cover"
                    />
                    <span className="max-w-40 truncate text-xs font-bold text-content">
                      {student.name}
                    </span>
                    <ReminderButton student={student} onRemind={onRemindStudent} />
                  </li>
                ))}
              </ul>
            ) : missing.length > 0 ? (
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {missing.map((student) => (
                  <li
                    key={student.id}
                    className="flex h-12 items-center gap-2.5 rounded-xl border border-line bg-surface px-2"
                  >
                    <img
                      src={student.avatar}
                      alt=""
                      className="size-8 rounded-full object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-content">{student.name}</p>
                      <p className="truncate text-[10px] text-content-muted">{student.email}</p>
                    </div>
                    <ReminderButton student={student} onRemind={onRemindStudent} />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-bold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
                <ClipboardList className="size-4" aria-hidden="true" />
                Tất cả học sinh đã hoàn thành.
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
};
