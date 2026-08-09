import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, Check, Clock3, Pause, Play, RefreshCw, Search, ShieldCheck, UsersRound, X } from 'lucide-react';
import { PageHeader, RoleBadge, managementInputClass } from '../../components/management/ManagementUI';
import { BoneyardSkeleton } from '../../components/common/BoneyardSkeleton';
import { useAuth } from '../../context/AuthContext';
import { useManagementData } from '../../hooks/useManagementData';
import { ApprovalStatus, UserRole, User } from '../../types';
import { authApi } from '../../services/backend';

type RoleFilter = 'all' | UserRole;

export const AccountManagementLivePage: React.FC = () => {
  const { user } = useAuth();
  const { classes, students, loading, error, reload } = useManagementData();
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [requests, setRequests] = useState<Array<User & { createdAt: string }>>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestsError, setRequestsError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [notice, setNotice] = useState('');
  const [durationById, setDurationById] = useState<Record<string, number>>({});
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<'freeze' | 'unfreeze' | 'set_duration'>('freeze');
  const [bulkDuration, setBulkDuration] = useState(5);
  const [bulkBusy, setBulkBusy] = useState(false);
  const loadRequests = useCallback(async () => {
    setRequestsLoading(true);
    setRequestsError('');
    try { setRequests(await authApi.getApprovalRequests()); }
    catch (loadError) { setRequestsError(loadError instanceof Error ? loadError.message : 'Không thể tải yêu cầu phê duyệt.'); }
    finally { setRequestsLoading(false); }
  }, []);
  useEffect(() => { void loadRequests(); }, [loadRequests]);
  const pendingRequests = useMemo(() => requests.filter((item) => item.approvalStatus === 'pending'), [requests]);
  const activeAccounts = useMemo(() => requests.filter((item) => item.approvalStatus === 'approved'), [requests]);
  const allActiveSelected = activeAccounts.length > 0 && activeAccounts.every((account) => selectedAccountIds.includes(account.id));
  const toggleAccountSelection = (accountId: string) => {
    setSelectedAccountIds((current) => current.includes(accountId)
      ? current.filter((id) => id !== accountId)
      : [...current, accountId]);
  };
  const toggleAllActiveAccounts = () => {
    setSelectedAccountIds(allActiveSelected ? [] : activeAccounts.map((account) => account.id));
  };
  const updateApproval = async (account: User, status: Extract<ApprovalStatus, 'approved' | 'rejected'>) => {
    setBusyId(account.id);
    setNotice('');
    try {
      if (status === 'rejected') {
        await authApi.rejectApprovalRequest(account.id);
        setRequests((current) => current.filter((item) => item.id !== account.id));
        setNotice(`Đã từ chối và xóa tài khoản của ${account.name}.`);
      } else {
        const response = await authApi.updateApproval(account.id, status);
        setRequests((current) => current.map((item) => item.id === account.id ? { ...item, ...response.user } : item));
        setNotice(`Đã phê duyệt ${account.name}.`);
      }
    } catch (updateError) { setRequestsError(updateError instanceof Error ? updateError.message : 'Không thể cập nhật tài khoản.'); }
    finally { setBusyId(''); }
  };
  const updateAccess = async (account: User, action: 'freeze' | 'unfreeze' | 'set_duration') => {
    setBusyId(account.id);
    setNotice('');
    setRequestsError('');
    try {
      const response = await authApi.updateAccountAccess(
        account.id,
        action,
        action === 'set_duration' ? (durationById[account.id] ?? 5) : undefined,
      );
      setRequests((current) => current.map((item) => item.id === account.id ? { ...item, ...response.user } : item));
      setNotice(action === 'freeze' ? `Đã bảo lưu tài khoản của ${account.name}.` : action === 'unfreeze' ? `Đã mở lại tài khoản của ${account.name}.` : `Đã cập nhật thời hạn cho ${account.name}.`);
    } catch (updateError) { setRequestsError(updateError instanceof Error ? updateError.message : 'Không thể cập nhật quyền sử dụng tài khoản.'); }
    finally { setBusyId(''); }
  };
  const updateSelectedAccess = async () => {
    const selectedAccounts = activeAccounts.filter((account) => selectedAccountIds.includes(account.id));
    if (selectedAccounts.length === 0) return;
    setBulkBusy(true);
    setNotice('');
    setRequestsError('');
    const eligibleAccounts = bulkAction === 'freeze'
      ? selectedAccounts.filter((account) => !account.accessExpiresAt || new Date(account.accessExpiresAt).getTime() > Date.now() || account.isFrozen)
      : selectedAccounts;
    try {
      const results = await Promise.allSettled(eligibleAccounts.map(async (account) => ({
        id: account.id,
        response: await authApi.updateAccountAccess(
          account.id,
          bulkAction,
          bulkAction === 'set_duration' ? bulkDuration : undefined,
        ),
      })));
      const updates = new Map<string, User>();
      results.forEach((result) => {
        if (result.status === 'fulfilled') updates.set(result.value.id, result.value.response.user);
      });
      setRequests((current) => current.map((account) => {
        const updated = updates.get(account.id);
        return updated ? { ...account, ...updated } : account;
      }));
      const failedCount = results.filter((result) => result.status === 'rejected').length;
      const skippedCount = selectedAccounts.length - eligibleAccounts.length;
      if (failedCount > 0) {
        setRequestsError(`Đã cập nhật ${updates.size}/${selectedAccounts.length} tài khoản. ${failedCount} tài khoản gặp lỗi${skippedCount ? `, ${skippedCount} tài khoản hết hạn được bỏ qua` : ''}.`);
      } else {
        const actionLabel = bulkAction === 'freeze' ? 'bảo lưu' : bulkAction === 'unfreeze' ? 'mở lại' : `đặt thời hạn ${bulkDuration === 0 ? 'không giới hạn' : `${bulkDuration} tháng`}`;
        setNotice(`Đã ${actionLabel} cho ${updates.size} tài khoản${skippedCount ? `; bỏ qua ${skippedCount} tài khoản đã hết hạn` : ''}.`);
        setSelectedAccountIds([]);
      }
    } finally {
      setBulkBusy(false);
    }
  };
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

  if (requestsLoading || loading) {
    return (
      <div className="space-y-6 pb-10" aria-busy="true" aria-label="Đang tải giao diện quản lý tài khoản">
        <PageHeader title="Phê duyệt tài khoản" description="Xác minh học sinh mới trước khi cấp quyền truy cập vào hệ thống học tập." />
        <BoneyardSkeleton name="admin-account-approval-summary" height={112} />
        <BoneyardSkeleton name="admin-account-approval-list" variant="row" count={4} height={76} />
        <BoneyardSkeleton name="admin-account-directory" height={288} />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <PageHeader title="Phê duyệt tài khoản" description="Xác minh học sinh mới trước khi cấp quyền truy cập vào hệ thống học tập." />
      {notice && <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-400/10 dark:text-emerald-300"><Check className="size-4" />{notice}</div>}
      <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm dark:shadow-none" aria-labelledby="approval-queue-title">
        <header className="flex items-center justify-between gap-4 border-b border-line p-4 sm:p-5"><div><div className="flex items-center gap-2"><span className="grid size-9 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300"><Clock3 className="size-4" /></span><h2 id="approval-queue-title" className="text-base font-extrabold text-content">Đang chờ phê duyệt</h2></div><p className="mt-2 text-xs leading-5 text-content-muted">{pendingRequests.length} tài khoản cần Giảng viên xác minh.</p></div><button type="button" onClick={() => void loadRequests()} className="btn-secondary text-xs"><RefreshCw className={`size-4 ${requestsLoading ? 'animate-spin motion-reduce:animate-none' : ''}`} />Làm mới</button></header>
        {requestsLoading ? <div className="p-4"><BoneyardSkeleton name="approval-requests-skeleton" variant="row" count={3} height={76} /></div> : requestsError ? <div className="p-6 text-center"><p className="text-sm text-red-700 dark:text-red-300">{requestsError}</p><button type="button" onClick={() => void loadRequests()} className="btn-secondary mt-4 text-xs">Thử lại</button></div> : pendingRequests.length === 0 ? <div className="p-8 text-center"><ShieldCheck className="mx-auto size-9 text-emerald-500" /><p className="mt-3 text-sm font-extrabold text-content">Không còn tài khoản chờ duyệt</p><p className="mt-1 text-xs text-content-muted">Tất cả yêu cầu mới đã được xử lý.</p></div> : <div className="divide-y divide-line/70">{pendingRequests.map((account) => <article key={account.id} className="grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:items-center"><div className="flex min-w-0 items-center gap-3"><img src={account.avatar} alt="" className="size-11 rounded-xl bg-surface-elevated object-cover" /><div className="min-w-0"><p className="truncate text-sm font-extrabold text-content">{account.name}</p><p className="truncate text-xs text-content-muted">{account.email}</p><p className="mt-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">Đăng ký {account.createdAt ? new Intl.DateTimeFormat('vi-VN').format(new Date(account.createdAt)) : 'gần đây'}</p></div></div><div className="flex gap-2"><button type="button" onClick={() => void updateApproval(account, 'approved')} disabled={busyId === account.id} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-extrabold text-white transition hover:bg-emerald-700 active:scale-[.98] disabled:opacity-60"><Check className="size-4" />Phê duyệt</button><button type="button" onClick={() => void updateApproval(account, 'rejected')} disabled={busyId === account.id} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line px-4 text-xs font-extrabold text-content-muted transition hover:bg-rose-50 hover:text-rose-700 active:scale-[.98] disabled:opacity-60 dark:hover:bg-rose-400/10 dark:hover:text-rose-300"><X className="size-4" />Từ chối</button></div></article>)}</div>}
      </section>
      <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm dark:shadow-none" aria-labelledby="account-access-title">
        <header className="border-b border-line p-4 sm:p-5"><div className="flex items-center gap-2"><span className="grid size-9 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"><CalendarClock className="size-4" /></span><h2 id="account-access-title" className="text-base font-extrabold text-content">Quyền sử dụng tài khoản</h2></div><p className="mt-2 text-xs leading-5 text-content-muted">Chọn nhiều học sinh để áp dụng cùng trạng thái bảo lưu hoặc thời hạn sử dụng.</p></header>
        {activeAccounts.length > 0 && <div className="flex flex-col gap-3 border-b border-line bg-surface-elevated/60 p-4 xl:flex-row xl:items-center"><label className="inline-flex min-h-10 shrink-0 cursor-pointer items-center gap-2 text-xs font-extrabold text-content"><input type="checkbox" checked={allActiveSelected} onChange={toggleAllActiveAccounts} className="size-4 rounded border-line accent-brand" /><span>Chọn tất cả</span><span className="font-semibold text-content-muted">({selectedAccountIds.length}/{activeAccounts.length})</span></label><div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"><select value={bulkAction} onChange={(event) => setBulkAction(event.target.value as typeof bulkAction)} className={managementInputClass} aria-label="Thao tác bảo lưu hàng loạt"><option value="freeze">Bảo lưu tài khoản</option><option value="unfreeze">Mở lại tài khoản</option><option value="set_duration">Đặt thời hạn sử dụng</option></select><select value={bulkDuration} onChange={(event) => setBulkDuration(Number(event.target.value))} disabled={bulkAction !== 'set_duration'} className={`${managementInputClass} disabled:cursor-not-allowed disabled:opacity-50`} aria-label="Thời hạn dùng chung"><option value={1}>1 tháng</option><option value={3}>3 tháng</option><option value={5}>5 tháng</option><option value={6}>6 tháng</option><option value={12}>12 tháng</option><option value={0}>Không giới hạn</option></select><button type="button" onClick={() => void updateSelectedAccess()} disabled={selectedAccountIds.length === 0 || bulkBusy} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-xs font-extrabold text-brand-ink transition hover:bg-brand-hover active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50">{bulkBusy ? <RefreshCw className="size-4 animate-spin motion-reduce:animate-none" /> : <Check className="size-4" />}{bulkBusy ? 'Đang áp dụng...' : `Áp dụng cho ${selectedAccountIds.length}`}</button></div></div>}
        {activeAccounts.length === 0 ? <div className="p-8 text-center"><UsersRound className="mx-auto size-8 text-content-muted" /><p className="mt-3 text-sm font-bold text-content">Chưa có học sinh đã phê duyệt</p></div> : <div className="divide-y divide-line/70">{activeAccounts.map((account) => { const expired = Boolean(!account.isFrozen && account.accessExpiresAt && new Date(account.accessExpiresAt).getTime() <= Date.now()); const expiryLabel = account.accessExpiresAt ? new Intl.DateTimeFormat('vi-VN').format(new Date(account.accessExpiresAt)) : 'Không giới hạn'; const selected = selectedAccountIds.includes(account.id); return <article key={account.id} className={`grid gap-4 p-4 transition-colors xl:grid-cols-[minmax(0,1fr)_auto_auto] xl:items-center ${selected ? 'bg-brand-50/70 dark:bg-brand-500/5' : ''}`}><div className="flex min-w-0 items-center gap-3"><input type="checkbox" checked={selected} onChange={() => toggleAccountSelection(account.id)} aria-label={`Chọn ${account.name}`} className="size-4 shrink-0 cursor-pointer rounded border-line accent-brand" /><img src={account.avatar} alt="" className="size-11 rounded-xl bg-surface-elevated object-cover" /><div className="min-w-0"><p className="truncate text-sm font-extrabold text-content">{account.name}</p><p className="truncate text-xs text-content-muted">{account.email}</p><div className="mt-1.5 flex flex-wrap gap-2"><span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${account.isFrozen ? 'bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-gray-200' : expired ? 'bg-rose-100 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300'}`}>{account.isFrozen ? 'Đang bảo lưu' : expired ? 'Đã hết hạn' : 'Đang hoạt động'}</span><span className="rounded-full bg-surface-elevated px-2.5 py-1 text-[10px] font-bold text-content-muted">Hết hạn: {expiryLabel}</span></div></div></div><button type="button" onClick={() => void updateAccess(account, account.isFrozen ? 'unfreeze' : 'freeze')} disabled={bulkBusy || busyId === account.id || expired} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-line px-4 text-xs font-extrabold text-content transition hover:bg-surface-hover active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50">{account.isFrozen ? <Play className="size-4" /> : <Pause className="size-4" />}{account.isFrozen ? 'Mở lại' : 'Bảo lưu'}</button><div className="flex min-w-0 gap-2"><select value={durationById[account.id] ?? 5} onChange={(event) => setDurationById((current) => ({ ...current, [account.id]: Number(event.target.value) }))} disabled={bulkBusy} className={`${managementInputClass} min-w-0 sm:min-w-40`} aria-label={`Thời hạn của ${account.name}`}><option value={1}>1 tháng</option><option value={3}>3 tháng</option><option value={5}>5 tháng</option><option value={6}>6 tháng</option><option value={12}>12 tháng</option><option value={0}>Không giới hạn</option></select><button type="button" onClick={() => void updateAccess(account, 'set_duration')} disabled={bulkBusy || busyId === account.id} className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl bg-brand px-4 text-xs font-extrabold text-brand-ink transition hover:bg-brand-hover active:scale-[.98] disabled:opacity-60">Áp dụng</button></div></article>; })}</div>}
      </section>
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
