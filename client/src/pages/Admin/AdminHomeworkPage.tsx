import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, ClipboardList, Loader2, Plus, RefreshCw } from 'lucide-react';
import { CreateHomeworkModal } from '../../components/management/CreateHomeworkModal';
import { HomeworkCard } from '../../components/management/HomeworkCard';
import { PageHeader } from '../../components/management/ManagementUI';
import { HomeworkAssignment } from '../../types/management';
import { apiService } from '../../services/api';
import {
  ManagedClassRecord,
  ManagedClassStudent,
  backendService,
} from '../../services/backend';
import { MockTestItem } from '../../types';

export const AdminHomeworkPage: React.FC = () => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<HomeworkAssignment[]>([]);
  const [classes, setClasses] = useState<ManagedClassRecord[]>([]);
  const [students, setStudents] = useState<ManagedClassStudent[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState('');
  const [toast, setToast] = useState('');
  const [editor, setEditor] = useState<{
    assignment?: HomeworkAssignment;
    initialStep: number;
  } | null>(null);
  const [tests, setTests] = useState<MockTestItem[]>([]);
  const [testsLoading, setTestsLoading] = useState(false);
  const [testsLoaded, setTestsLoaded] = useState(false);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(''), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const loadManagementData = async () => {
    setDataLoading(true);
    setDataError('');
    try {
      const [serverAssignments, serverClasses, serverStudents] = await Promise.all([
        backendService.getHomeworkAssignments(),
        backendService.getManagedClasses(),
        backendService.getManagedClassStudents(),
      ]);
      setAssignments(serverAssignments);
      setClasses(serverClasses);
      setStudents(serverStudents);
      try {
        window.localStorage.removeItem('ilovetoeic_homework_assignments_v1');
      } catch {
        // Legacy local data does not affect the API-backed screen.
      }
    } catch (error) {
      setDataError(error instanceof Error ? error.message : 'Không thể tải dữ liệu bài tập.');
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    void loadManagementData();
  }, []);

  useEffect(() => {
    if (!editor || testsLoaded) return undefined;
    let active = true;
    const loadTests = async () => {
      setTestsLoading(true);
      const result = await apiService.getTests();
      if (!active) return;
      setTests(result);
      setTestsLoaded(true);
      setTestsLoading(false);
    };
    void loadTests();
    return () => {
      active = false;
    };
  }, [editor, testsLoaded]);

  const handleCancel = async (assignmentId: string, assignmentTitle: string) => {
    const confirmed = window.confirm(
      `Huỷ giao bài “${assignmentTitle}”? Hành động này chỉ áp dụng khi chưa có học sinh nộp bài.`,
    );
    if (!confirmed) return;
    try {
      await backendService.deleteHomeworkAssignment(assignmentId);
      setAssignments((current) => current.filter((item) => item.id !== assignmentId));
      setExpandedId((current) => (current === assignmentId ? null : current));
      setToast('Đã huỷ giao bài tập.');
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Không thể huỷ bài tập.');
    }
  };

  const handleSubmit = async (assignment: HomeworkAssignment) => {
    const savedAssignment = editor?.assignment
      ? await backendService.updateHomeworkAssignment(assignment)
      : await backendService.createHomeworkAssignment(assignment);

    setAssignments((current) => [
      savedAssignment,
      ...current.filter((item) => item.id !== savedAssignment.id),
    ]);
    setEditor(null);
    setToast(
      editor?.assignment
        ? 'Đã cập nhật bài tập thành công.'
        : 'Đã giao bài tập thành công.',
    );
  };

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Bài tập về nhà"
        description="Theo dõi tỷ lệ nộp theo từng lớp và xem nhanh danh sách học sinh cần nhắc."
        action={(
          <button
            type="button"
            onClick={() => setEditor({ initialStep: 1 })}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-brand-ink shadow-sm transition hover:bg-accent-hover active:scale-[.98]"
          >
            <Plus className="size-4" aria-hidden="true" />
            Giao bài tập mới
          </button>
        )}
      />

      {dataLoading ? (
        <div className="flex min-h-48 items-center justify-center rounded-2xl border border-line bg-surface text-sm font-semibold text-content-muted">
          <Loader2 className="mr-2 size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          Đang tải dữ liệu bài tập...
        </div>
      ) : dataError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900 dark:bg-red-500/10">
          <h2 className="text-base font-extrabold text-content">Chưa tải được dữ liệu</h2>
          <p className="mt-2 text-sm text-content-muted">{dataError}</p>
          <button type="button" onClick={() => void loadManagementData()} className="btn-secondary mt-5 text-sm">
            <RefreshCw className="size-4" aria-hidden="true" /> Thử lại
          </button>
        </div>
      ) : assignments.length ? (
        <div className="space-y-3">
          {assignments.map((assignment) => {
            const assignmentClasses = classes.filter((classItem) =>
              assignment.classIds.includes(classItem.id),
            );
            const studentIds = new Set(
              assignmentClasses.flatMap((classItem) => classItem.studentIds),
            );
            const assignmentStudents = students.filter((student) =>
              studentIds.has(student.id),
            );

            return (
              <HomeworkCard
                key={assignment.id}
                assignment={assignment}
                classes={assignmentClasses}
                students={assignmentStudents}
                expanded={expandedId === assignment.id}
                onToggle={() =>
                  setExpandedId((currentId) =>
                    currentId === assignment.id ? null : assignment.id,
                  )
                }
                onEdit={() => setEditor({ assignment, initialStep: 1 })}
                onExtend={() => setEditor({ assignment, initialStep: 4 })}
                onCancel={() => void handleCancel(assignment.id, assignment.title)}
              />
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-line bg-surface p-10 text-center">
          <ClipboardList className="mx-auto size-8 text-content-muted" />
          <h2 className="mt-3 text-sm font-extrabold text-content">Chưa có bài tập nào</h2>
          <p className="mt-1 text-xs text-content-muted">Tạo bài tập đầu tiên cho lớp học của bạn.</p>
        </div>
      )}

      <AnimatePresence initial={false}>
        {editor && (
          <CreateHomeworkModal
            key={editor.assignment?.id ?? 'new-homework'}
            open
            classes={classes.filter((classItem) => (
              classItem.isActive || editor.assignment?.classIds.includes(classItem.id)
            ))}
            tests={tests}
            testsLoading={testsLoading}
            initialAssignment={editor.assignment}
            initialStep={editor.initialStep}
            onClose={() => setEditor(null)}
            onSubmit={handleSubmit}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            className="fixed bottom-5 right-5 z-[110] flex max-w-sm items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 shadow-xl dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300"
          >
            <CheckCircle2 className="size-5 shrink-0" aria-hidden="true" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
