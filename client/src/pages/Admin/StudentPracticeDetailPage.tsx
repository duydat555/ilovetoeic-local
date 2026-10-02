import React, { useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, Mail, Target } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { BoneyardSkeleton } from '../../components/common/BoneyardSkeleton';
import { PracticeActivityPanel } from '../../components/dashboard/PracticeActivityPanel';
import { PageHeader } from '../../components/management/ManagementUI';
import { authApi } from '../../services/backend';
import { User } from '../../types';
import { getDiceBearAvatar } from '../../utils/avatar';

type ManagedStudent = User & { createdAt: string };

export const StudentPracticeDetailPage: React.FC = () => {
  const { studentId = '' } = useParams();
  const [student, setStudent] = useState<ManagedStudent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const loadStudent = async () => {
      setLoading(true);
      setError('');
      try {
        const accounts = await authApi.getApprovalRequests();
        const selectedStudent = accounts.find((account) => account.id === studentId);
        if (!selectedStudent) throw new Error('Không tìm thấy tài khoản Học sinh.');
        if (active) setStudent(selectedStudent);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Không thể tải thông tin Học sinh.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadStudent();
    return () => { active = false; };
  }, [studentId]);

  if (loading) {
    return (
      <div className="space-y-5 pb-10" role="status" aria-label="Đang tải chi tiết luyện tập">
        <BoneyardSkeleton name="admin-student-practice-header" height={92} className="rounded-2xl" />
        <BoneyardSkeleton name="admin-student-practice-profile" height={104} className="rounded-2xl" />
        <BoneyardSkeleton name="admin-student-practice-panel" height={520} className="rounded-2xl" />
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="grid min-h-[55vh] place-items-center px-4">
        <div className="max-w-md rounded-2xl border border-line bg-surface p-7 text-center shadow-sm">
          <CalendarDays className="mx-auto size-9 text-content-muted" aria-hidden="true" />
          <h1 className="mt-3 text-lg font-extrabold text-content">Không thể mở chi tiết luyện tập</h1>
          <p className="mt-2 text-sm text-content-muted">{error || 'Không tìm thấy tài khoản Học sinh.'}</p>
          <Link to="/admin/accounts" className="btn-secondary mt-5 text-sm">
            <ArrowLeft className="size-4" aria-hidden="true" /> Quay lại tài khoản
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Chi tiết luyện tập"
        description={`Theo dõi số câu đã làm và nhịp độ học tập của ${student.name}.`}
        action={(
          <Link to="/admin/accounts" className="btn-secondary whitespace-nowrap text-sm">
            <ArrowLeft className="size-4" aria-hidden="true" /> Quay lại
          </Link>
        )}
      />

      <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 shadow-xs sm:flex-row sm:items-center sm:p-5">
        <img
          src={student.avatar || getDiceBearAvatar(student.name || student.id)}
          alt={student.name}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = getDiceBearAvatar(student.name || 'student');
          }}
          className="size-16 shrink-0 rounded-2xl bg-surface-elevated object-cover ring-2 ring-line"
        />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-extrabold text-content">{student.name}</h2>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-content-muted">
            <span className="inline-flex items-center gap-1.5"><Mail className="size-3.5" aria-hidden="true" />{student.email}</span>
            <span className="inline-flex items-center gap-1.5"><Target className="size-3.5" aria-hidden="true" />Mục tiêu {student.targetScore || 750} TOEIC</span>
            <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5" aria-hidden="true" />Chuỗi học {student.streakDays || 0} ngày</span>
          </div>
        </div>
      </section>

      <PracticeActivityPanel studentId={student.id} studentName={student.name} />
    </div>
  );
};
