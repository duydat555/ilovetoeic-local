import React from 'react';
import { AlertTriangle, CheckCircle2, ClipboardList, RefreshCw, School, UsersRound } from 'lucide-react';
import { PageHeader, StatCard } from '../../components/management/ManagementUI';
import { BoneyardSkeleton } from '../../components/common/BoneyardSkeleton';
import { useManagementData } from '../../hooks/useManagementData';

export const AdminOverviewLivePage: React.FC = () => {
  const { classes, students, assignments, loading, error, reload } = useManagementData();
  const activeClasses = classes.filter((item) => item.isActive);
  const today = new Date().toISOString().slice(0, 10);
  const atRiskCount = students.filter((student) => (
    student.streakDays > 0 && student.lastStudyDate !== today
  )).length;
  const recipientTotal = assignments.reduce((total, assignment) => {
    const recipients = new Set(
      classes
        .filter((item) => assignment.classIds.includes(item.id))
        .flatMap((item) => item.studentIds),
    );
    return total + recipients.size;
  }, 0);
  const submittedTotal = assignments.reduce(
    (total, assignment) => total + assignment.submittedStudentIds.length,
    0,
  );
  const completionRate = recipientTotal
    ? Math.round((submittedTotal / recipientTotal) * 100)
    : 0;

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Thống kê toàn hệ thống"
        description="Các chỉ số được tổng hợp trực tiếp từ tài khoản, lớp học và bài tập đang lưu trên hệ thống."
      />

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Đang tải thống kê">
          {[0, 1, 2, 3].map((item) => (
            <BoneyardSkeleton key={item} name={`stat-card-${item}`} height={128} />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900 dark:bg-red-500/10">
          <p className="text-sm font-semibold text-red-700 dark:text-red-300">{error}</p>
          <button type="button" onClick={() => void reload()} className="btn-secondary mt-4 text-sm"><RefreshCw className="size-4" /> Thử lại</button>
        </div>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Tổng học sinh" value={students.length} helper="Tài khoản Học sinh thật" icon={UsersRound} />
            <StatCard label="Cần duy trì chuỗi" value={atRiskCount} helper="Chưa học trong hôm nay" icon={AlertTriangle} tone={atRiskCount ? 'negative' : 'positive'} />
            <StatCard label="Lớp đang hoạt động" value={activeClasses.length} helper={`${classes.length} lớp đã tạo`} icon={School} tone="warning" />
            <StatCard label="Hoàn thành bài tập" value={`${completionRate}%`} helper={`${submittedTotal}/${recipientTotal} lượt nộp`} icon={CheckCircle2} tone="positive" />
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_.75fr]">
            <article className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm dark:shadow-none">
              <div className="border-b border-line p-5">
                <h2 className="text-base font-extrabold text-content">Phân bổ lớp học</h2>
                <p className="mt-1 text-sm text-content-muted">Sĩ số và tiến độ tính từ thành viên thật trong từng lớp.</p>
              </div>
              {classes.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left">
                    <thead className="bg-surface-elevated text-xs font-extrabold text-content-muted">
                      <tr><th className="px-5 py-3">Lớp</th><th className="px-5 py-3">Trạng thái</th><th className="px-5 py-3">Sĩ số</th><th className="px-5 py-3">Tiến độ</th></tr>
                    </thead>
                    <tbody className="divide-y divide-line/70">
                      {classes.map((item) => (
                        <tr key={item.id} className="hover:bg-surface-hover/70">
                          <td className="px-5 py-3.5"><p className="text-sm font-bold text-content">{item.name}</p><p className="mt-0.5 text-xs text-content-muted">{item.code}, mục tiêu {item.targetScore}</p></td>
                          <td className="px-5 py-3.5 text-sm text-content-muted">{item.isActive ? 'Đang hoạt động' : 'Đã lưu trữ'}</td>
                          <td className="px-5 py-3.5 text-sm font-bold text-content">{item.studentCount}</td>
                          <td className="px-5 py-3.5"><div className="flex items-center gap-3"><div className="h-2 w-28 overflow-hidden rounded-full bg-surface-hover"><div className="h-full rounded-full bg-brand" style={{ width: `${item.averageProgress}%` }} /></div><span className="text-sm font-extrabold text-content">{item.averageProgress}%</span></div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="p-8 text-center text-sm text-content-muted">Chưa có lớp học thật để thống kê.</p>}
            </article>

            <article className="rounded-2xl border border-line bg-surface p-5 shadow-sm dark:shadow-none">
              <div className="flex items-center gap-2"><ClipboardList className="size-5 text-brand-700 dark:text-brand-300" /><h2 className="text-base font-extrabold text-content">Bài tập gần đây</h2></div>
              <div className="mt-4 space-y-2">
                {assignments.slice(0, 5).map((assignment) => (
                  <div key={assignment.id} className="rounded-xl bg-surface-elevated p-3">
                    <p className="truncate text-sm font-bold text-content">{assignment.title}</p>
                    <p className="mt-1 text-xs text-content-muted">Hạn {new Intl.DateTimeFormat('vi-VN').format(new Date(`${assignment.deadline}T00:00:00`))}, {assignment.submittedStudentIds.length} lượt đã nộp</p>
                  </div>
                ))}
                {assignments.length === 0 && <p className="rounded-xl bg-surface-elevated p-4 text-sm text-content-muted">Chưa có bài tập nào được giao.</p>}
              </div>
            </article>
          </section>
        </>
      )}
    </div>
  );
};
