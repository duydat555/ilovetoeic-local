import React, { useMemo, useState } from 'react';
import { BoneyardSkeleton } from '../../components/common/BoneyardSkeleton';
import { AlertTriangle, ArrowLeft, RefreshCw, Search, UserCog, UsersRound } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader, managementInputClass } from '../../components/management/ManagementUI';
import { useManagementData } from '../../hooks/useManagementData';

type StudentFilter = 'all' | 'streak' | 'new';

export const ClassStudentsLivePage: React.FC = () => {
  const { classId } = useParams();
  const { classes, students, loading, error, reload } = useManagementData();
  const [filter, setFilter] = useState<StudentFilter>('all');
  const [query, setQuery] = useState('');
  const classItem = classes.find((item) => item.id === classId);

  const filteredStudents = useMemo(() => {
    if (!classItem) return [];
    const normalized = query.trim().toLocaleLowerCase('vi');
    const newThreshold = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return students.filter((student) => {
      if (!classItem.studentIds.includes(student.id)) return false;
      if (normalized && !`${student.name} ${student.email}`.toLocaleLowerCase('vi').includes(normalized)) return false;
      if (filter === 'streak') return student.streakDays > 0 && student.lastStudyDate !== new Date().toISOString().slice(0, 10);
      if (filter === 'new') return new Date(student.createdAt).getTime() >= newThreshold;
      return true;
    });
  }, [classItem, filter, query, students]);

  if (loading) return <BoneyardSkeleton name="class-students-skeleton" height={256} />;
  if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900 dark:bg-red-500/10"><p className="text-sm text-red-700 dark:text-red-300">{error}</p><button type="button" onClick={() => void reload()} className="btn-secondary mt-4 text-sm"><RefreshCw className="size-4" /> Thử lại</button></div>;
  if (!classItem) return <div className="rounded-2xl border border-line bg-surface p-8 text-center"><UsersRound className="mx-auto size-8 text-content-muted" /><h1 className="mt-3 text-lg font-extrabold text-content">Không tìm thấy lớp học</h1><Link to="/admin/classes" className="btn-primary mt-5">Quay lại quản lý lớp</Link></div>;

  return (
    <div className="space-y-6 pb-10">
      <Link to="/admin/classes" className="inline-flex items-center gap-2 text-sm font-bold text-content-muted hover:text-content"><ArrowLeft className="size-4" /> Quản lý lớp học</Link>
      <PageHeader title={classItem.name} description={`${classItem.code}, mục tiêu ${classItem.targetScore} TOEIC, ${classItem.studentCount} học sinh`} action={<Link to="/admin/classes" className="btn-secondary text-sm"><UserCog className="size-4" /> Quản lý thành viên</Link>} />

      <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm dark:shadow-none">
        <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-2 overflow-x-auto" role="tablist" aria-label="Lọc học sinh">
            {([['all', 'Tất cả'], ['streak', 'Cần duy trì chuỗi'], ['new', 'Mới tham gia']] as Array<[StudentFilter, string]>).map(([value, label]) => <button key={value} type="button" onClick={() => setFilter(value)} className={`min-h-9 shrink-0 rounded-xl px-3 text-xs font-extrabold ${filter === value ? 'bg-brand text-brand-ink' : 'bg-surface-elevated text-content-muted hover:bg-surface-hover'}`}>{label}</button>)}
          </div>
          <label className="relative block w-full lg:w-72"><span className="sr-only">Tìm học sinh</span><Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-content-muted" /><input value={query} onChange={(event) => setQuery(event.target.value)} className={`${managementInputClass} pl-10`} placeholder="Tìm tên hoặc email" /></label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead className="bg-surface-elevated text-xs font-extrabold text-content-muted"><tr><th className="px-4 py-3">Học sinh</th><th className="px-4 py-3">Chuỗi học</th><th className="px-4 py-3">Điểm hiện tại</th><th className="px-4 py-3">Mục tiêu</th><th className="px-4 py-3 text-right">Hồ sơ</th></tr></thead>
            <tbody className="divide-y divide-line/70">
              {filteredStudents.map((student) => {
                const atRisk = student.streakDays > 0 && student.lastStudyDate !== new Date().toISOString().slice(0, 10);
                return <tr key={student.id} className="hover:bg-surface-hover/70"><td className="px-4 py-3.5"><p className="text-sm font-bold text-content">{student.name}</p><p className="mt-0.5 text-xs text-content-muted">{student.email}</p></td><td className="px-4 py-3.5"><span className={`inline-flex items-center gap-1.5 text-sm font-bold ${atRisk ? 'text-red-600 dark:text-red-300' : 'text-content'}`}>{atRisk && <AlertTriangle className="size-4" />}{student.streakDays} ngày</span></td><td className="px-4 py-3.5 text-sm font-extrabold text-content">{student.currentScore || 'Chưa có'}</td><td className="px-4 py-3.5 text-sm text-content-muted">{student.targetScore}</td><td className="px-4 py-3.5 text-right"><Link to={`/admin/students/${student.id}`} className="btn-secondary min-h-9 px-3 text-xs">Xem hồ sơ</Link></td></tr>;
              })}
            </tbody>
          </table>
        </div>
        {filteredStudents.length === 0 && <div className="p-10 text-center"><Search className="mx-auto size-8 text-content-muted" /><p className="mt-3 text-sm font-bold text-content">Không có học sinh phù hợp</p></div>}
      </section>
    </div>
  );
};
