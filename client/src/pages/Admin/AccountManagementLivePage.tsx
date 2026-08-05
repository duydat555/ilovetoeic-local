import React, { useMemo, useState } from 'react';
import { RefreshCw, Search, ShieldCheck, UsersRound } from 'lucide-react';
import { PageHeader, RoleBadge, managementInputClass } from '../../components/management/ManagementUI';
import { BoneyardSkeleton } from '../../components/common/BoneyardSkeleton';
import { useAuth } from '../../context/AuthContext';
import { useManagementData } from '../../hooks/useManagementData';
import { UserRole } from '../../types';

type RoleFilter = 'all' | UserRole;

export const AccountManagementLivePage: React.FC = () => {
  const { user } = useAuth();
  const { classes, students, loading, error, reload } = useManagementData();
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const accounts = useMemo(() => [
    ...(user ? [{ id: user.id, name: user.name, email: user.email, role: 'admin' as const, createdAt: '', classIds: [] as string[] }] : []),
    ...students.map((student) => ({
      id: student.id,
      name: student.name,
      email: student.email,
      role: 'student' as const,
      createdAt: student.createdAt,
      classIds: classes.filter((item) => item.studentIds.includes(student.id)).map((item) => item.id),
    })),
  ], [classes, students, user]);
  const filtered = useMemo(() => accounts.filter((account) => {
    const matchesQuery = `${account.name} ${account.email}`.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi'));
    return matchesQuery && (roleFilter === 'all' || account.role === roleFilter);
  }), [accounts, query, roleFilter]);

  return (
    <div className="space-y-6 pb-10">
      <PageHeader title="Quản lý tài khoản" description="Danh sách được lấy trực tiếp từ các tài khoản đã đăng ký trong hệ thống." />
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <article className="rounded-2xl border border-brand-200 bg-brand-50 p-4 dark:border-brand-800 dark:bg-brand-500/10"><div className="flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand text-brand-ink"><ShieldCheck className="size-5" /></span><div><p className="text-sm font-extrabold text-content">Giáo viên quản trị</p><p className="mt-1 text-sm leading-relaxed text-content-muted">{user?.name || 'Tài khoản đang đăng nhập'}</p></div></div></article>
        <article className="rounded-2xl border border-line bg-surface p-4"><div className="flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-elevated text-content-muted"><UsersRound className="size-5" /></span><div><p className="text-sm font-extrabold text-content">{students.length} tài khoản Học sinh</p><p className="mt-1 text-sm leading-relaxed text-content-muted">{students.filter((student) => classes.some((item) => item.studentIds.includes(student.id))).length} học sinh đã vào lớp</p></div></div></article>
      </section>

      {loading ? <BoneyardSkeleton name="accounts-skeleton" height={288} /> : error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900 dark:bg-red-500/10"><p className="text-sm text-red-700 dark:text-red-300">{error}</p><button type="button" onClick={() => void reload()} className="btn-secondary mt-4 text-sm"><RefreshCw className="size-4" /> Thử lại</button></div> : (
        <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm dark:shadow-none">
          <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center lg:justify-between">
            <label className="relative block w-full lg:max-w-sm"><span className="sr-only">Tìm tài khoản</span><Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-content-muted" /><input value={query} onChange={(event) => setQuery(event.target.value)} className={`${managementInputClass} pl-10`} placeholder="Tìm tên hoặc email" /></label>
            <div className="flex gap-2" role="tablist" aria-label="Lọc vai trò">
              {([['all', 'Tất cả'], ['student', 'Học sinh'], ['admin', 'Giáo viên']] as Array<[RoleFilter, string]>).map(([value, label]) => <button key={value} type="button" onClick={() => setRoleFilter(value)} className={`min-h-9 rounded-xl px-3 text-xs font-extrabold ${roleFilter === value ? 'bg-brand text-brand-ink' : 'bg-surface-elevated text-content-muted hover:bg-surface-hover'}`}>{label}</button>)}
            </div>
          </div>
          <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="bg-surface-elevated text-xs font-extrabold text-content-muted"><tr><th className="px-4 py-3">Tài khoản</th><th className="px-4 py-3">Vai trò</th><th className="px-4 py-3">Ngày đăng ký</th><th className="px-4 py-3">Nhóm lớp</th></tr></thead><tbody className="divide-y divide-line/70">{filtered.map((account) => { const classNames = classes.filter((item) => account.classIds.includes(item.id)).map((item) => item.name).join(', '); return <tr key={account.id} className="hover:bg-surface-hover/70"><td className="px-4 py-3.5"><p className="text-sm font-bold text-content">{account.name}</p><p className="mt-0.5 text-xs text-content-muted">{account.email}</p></td><td className="px-4 py-3.5"><RoleBadge role={account.role} /></td><td className="px-4 py-3.5 text-sm text-content-muted">{account.createdAt ? new Intl.DateTimeFormat('vi-VN').format(new Date(account.createdAt)) : 'Tài khoản quản trị'}</td><td className="max-w-sm px-4 py-3.5 text-sm text-content-muted">{account.role === 'admin' ? 'Quản lý toàn bộ hệ thống' : classNames || 'Chưa thuộc lớp nào'}</td></tr>; })}</tbody></table></div>
          {filtered.length === 0 && <div className="p-10 text-center"><Search className="mx-auto size-8 text-content-muted" /><p className="mt-3 text-sm font-bold text-content">Không tìm thấy tài khoản</p></div>}
        </section>
      )}
    </div>
  );
};
