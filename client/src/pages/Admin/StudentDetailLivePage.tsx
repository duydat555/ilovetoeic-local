import React from 'react';
import { ArrowLeft, BookOpenCheck, RefreshCw, School, Target } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '../../components/management/ManagementUI';
import { useManagementData } from '../../hooks/useManagementData';

import { BoneyardSkeleton } from '../../components/common/BoneyardSkeleton';

export const StudentDetailLivePage: React.FC = () => {
  const { studentId } = useParams();
  const { classes, students, loading, error, reload } = useManagementData();
  const student = students.find((item) => item.id === studentId);
  const studentClasses = classes.filter((item) => item.studentIds.includes(studentId || ''));

  if (loading) return <BoneyardSkeleton name="student-detail-skeleton" height={288} />;
  if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900 dark:bg-red-500/10"><p className="text-sm text-red-700 dark:text-red-300">{error}</p><button type="button" onClick={() => void reload()} className="btn-secondary mt-4 text-sm"><RefreshCw className="size-4" /> Thử lại</button></div>;
  if (!student) return <div className="rounded-2xl border border-line bg-surface p-8 text-center"><h1 className="text-lg font-extrabold text-content">Không tìm thấy Học sinh</h1><p className="mt-2 text-sm text-content-muted">Tài khoản không tồn tại hoặc không còn thuộc phạm vi quản lý.</p><Link to="/admin/classes" className="btn-primary mt-5">Quay lại quản lý lớp</Link></div>;

  return (
    <div className="space-y-6 pb-10">
      <Link to={studentClasses[0] ? `/admin/classes/${studentClasses[0].id}` : '/admin/classes'} className="inline-flex items-center gap-2 text-sm font-bold text-content-muted hover:text-content"><ArrowLeft className="size-4" /> Quay lại danh sách lớp</Link>
      <PageHeader title={student.name} description="Thông tin dưới đây được lấy trực tiếp từ tài khoản và lớp học của Học sinh." />
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[320px_1fr]">
        <article className="rounded-2xl border border-line bg-surface p-5 shadow-sm dark:shadow-none">
          <div className="grid size-14 place-items-center rounded-2xl bg-brand-100 text-lg font-black text-brand-800 dark:bg-brand-500/15 dark:text-brand-300">{student.name.trim().split(/\s+/).slice(-2).map((part) => part[0]).join('').toUpperCase()}</div>
          <h2 className="mt-4 text-lg font-extrabold text-content">{student.name}</h2><p className="mt-1 text-sm text-content-muted">{student.email}</p><p className="mt-3 text-xs text-content-muted">Đăng ký {new Intl.DateTimeFormat('vi-VN').format(new Date(student.createdAt))}</p>
          <div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-surface-elevated p-3"><Target className="size-4 text-brand-700 dark:text-brand-300" /><p className="mt-2 text-xs text-content-muted">Điểm hiện tại</p><p className="mt-1 text-xl font-black text-content">{student.currentScore || '0'}</p></div><div className="rounded-xl bg-surface-elevated p-3"><BookOpenCheck className="size-4 text-emerald-600" /><p className="mt-2 text-xs text-content-muted">Mục tiêu</p><p className="mt-1 text-xl font-black text-content">{student.targetScore}</p></div></div>
          <div className="mt-3 rounded-xl border border-line p-3"><p className="text-sm font-bold text-content">Chuỗi học {student.streakDays} ngày</p><p className="mt-1 text-xs text-content-muted">Hoạt động gần nhất: {student.lastStudyDate ? new Intl.DateTimeFormat('vi-VN').format(new Date(`${student.lastStudyDate}T00:00:00`)) : 'Chưa có dữ liệu'}</p></div>
        </article>
        <article className="rounded-2xl border border-line bg-surface p-5 shadow-sm dark:shadow-none"><div className="flex items-center gap-2"><School className="size-5 text-brand-700 dark:text-brand-300" /><h2 className="text-base font-extrabold text-content">Lớp đang tham gia</h2></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{studentClasses.map((item) => <Link key={item.id} to={`/admin/classes/${item.id}`} className="rounded-xl border border-line bg-surface-elevated p-4 transition hover:border-accent/35"><p className="text-sm font-bold text-content">{item.name}</p><p className="mt-1 text-xs text-content-muted">{item.code}, mục tiêu {item.targetScore}</p></Link>)}{studentClasses.length === 0 && <p className="text-sm text-content-muted">Học sinh chưa thuộc lớp nào.</p>}</div></article>
      </section>
    </div>
  );
};
