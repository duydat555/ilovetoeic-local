import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AlertCircle, BarChart3, CalendarClock, Check, CheckCircle2, Clock3, Pause, Play, RefreshCw, Search, ShieldCheck, UsersRound, X } from 'lucide-react';
import { PageHeader, managementInputClass } from '../../components/management/ManagementUI';
import { BoneyardSkeleton } from '../../components/common/BoneyardSkeleton';
import { useAuth } from '../../context/AuthContext';
import { ApprovalStatus, User } from '../../types';
import { authApi } from '../../services/backend';

type ToastState = { message: string; tone: 'success' | 'error' } | null;

export const AccountManagementLivePage: React.FC = () => {
  const { user } = useAuth();
  const reduceMotion = useReducedMotion();
  const [query, setQuery] = useState('');
  const [requests, setRequests] = useState<Array<User & { createdAt: string }>>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [requestsError, setRequestsError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [toast, setToast] = useState<ToastState>(null);
  const [durationById, setDurationById] = useState<Record<string, number>>({});
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<'freeze' | 'unfreeze' | 'set_duration'>('freeze');
  const [bulkDuration, setBulkDuration] = useState(5);
  const [bulkBusy, setBulkBusy] = useState(false);
  const showToast = useCallback((message: string, tone: 'success' | 'error') => {
    setToast({ message, tone });
  }, []);
  const loadRequests = useCallback(async (isInitialLoad = false) => {
    setRequestsLoading(true);
    if (isInitialLoad) setRequestsError('');
    try {
      setRequests(await authApi.getApprovalRequests());
      if (!isInitialLoad) showToast('Đã cập nhật dữ liệu tài khoản.', 'success');
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Không thể tải yêu cầu phê duyệt.';
      if (isInitialLoad) setRequestsError(message);
      else showToast(message, 'error');
    } finally {
      setRequestsLoading(false);
      if (isInitialLoad) setInitialLoading(false);
    }
  }, [showToast]);
  useEffect(() => { void loadRequests(true); }, [loadRequests]);
  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);
  const pendingRequests = useMemo(() => requests.filter((item) => item.approvalStatus === 'pending'), [requests]);
  const activeAccounts = useMemo(() => requests.filter((item) => item.approvalStatus === 'approved'), [requests]);
  const normalizedQuery = query.trim().toLocaleLowerCase('vi');
  const filteredActiveAccounts = useMemo(() => activeAccounts.filter((account) =>
    `${account.name} ${account.email}`.toLocaleLowerCase('vi').includes(normalizedQuery)
  ), [activeAccounts, normalizedQuery]);
  const allActiveSelected = filteredActiveAccounts.length > 0 && filteredActiveAccounts.every((account) => selectedAccountIds.includes(account.id));
  const toggleAccountSelection = (accountId: string) => {
    setSelectedAccountIds((current) => current.includes(accountId)
      ? current.filter((id) => id !== accountId)
      : [...current, accountId]);
  };
  const toggleAllActiveAccounts = () => {
    setSelectedAccountIds(allActiveSelected ? [] : filteredActiveAccounts.map((account) => account.id));
  };
  const updateApproval = async (account: User, status: Extract<ApprovalStatus, 'approved' | 'rejected'>) => {
    setBusyId(account.id);
    try {
      if (status === 'rejected') {
        await authApi.rejectApprovalRequest(account.id);
        setRequests((current) => current.filter((item) => item.id !== account.id));
        showToast(`Đã từ chối và xóa tài khoản của ${account.name}.`, 'success');
      } else {
        const response = await authApi.updateApproval(account.id, status);
        setRequests((current) => current.map((item) => item.id === account.id ? { ...item, ...response.user } : item));
        showToast(`Đã phê duyệt ${account.name}.`, 'success');
      }
    } catch (updateError) { showToast(updateError instanceof Error ? updateError.message : 'Không thể cập nhật tài khoản.', 'error'); }
    finally { setBusyId(''); }
  };
  const updateAccess = async (account: User, action: 'freeze' | 'unfreeze' | 'set_duration') => {
    setBusyId(account.id);
    try {
      const response = await authApi.updateAccountAccess(
        account.id,
        action,
        action === 'set_duration' ? (durationById[account.id] ?? 5) : undefined,
      );
      setRequests((current) => current.map((item) => item.id === account.id ? { ...item, ...response.user } : item));
      showToast(action === 'freeze' ? `Đã bảo lưu tài khoản của ${account.name}.` : action === 'unfreeze' ? `Đã mở lại tài khoản của ${account.name}.` : `Đã cập nhật thời hạn cho ${account.name}.`, 'success');
    } catch (updateError) { showToast(updateError instanceof Error ? updateError.message : 'Không thể cập nhật quyền sử dụng tài khoản.', 'error'); }
    finally { setBusyId(''); }
  };
  const updateSelectedAccess = async () => {
    const selectedAccounts = filteredActiveAccounts.filter((account) => selectedAccountIds.includes(account.id));
    if (selectedAccounts.length === 0) return;
    setBulkBusy(true);
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
        showToast(`Đã cập nhật ${updates.size}/${selectedAccounts.length} tài khoản. ${failedCount} tài khoản gặp lỗi${skippedCount ? `, ${skippedCount} tài khoản hết hạn được bỏ qua` : ''}.`, 'error');
      } else {
        const actionLabel = bulkAction === 'freeze' ? 'bảo lưu' : bulkAction === 'unfreeze' ? 'mở lại' : `đặt thời hạn ${bulkDuration === 0 ? 'không giới hạn' : `${bulkDuration} tháng`}`;
        showToast(`Đã ${actionLabel} cho ${updates.size} tài khoản${skippedCount ? `; bỏ qua ${skippedCount} tài khoản đã hết hạn` : ''}.`, 'success');
        setSelectedAccountIds([]);
      }
    } finally {
      setBulkBusy(false);
    }
  };
  return (
    <BoneyardSkeleton
      name="admin-account-management-page"
      loading={initialLoading}
      variant="card"
      count={4}
      height={168}
      containerClassName="grid grid-cols-1 gap-4 lg:grid-cols-2"
    >
    <div className="space-y-6 pb-10">
      <PageHeader title="Phê duyệt tài khoản" description="Xác minh học sinh mới trước khi cấp quyền truy cập vào hệ thống học tập." />
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <article className="rounded-2xl border border-brand-200 bg-brand-50 p-4 dark:border-brand-800 dark:bg-brand-500/10"><div className="flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand text-brand-ink"><ShieldCheck className="size-5" /></span><div><p className="text-sm font-extrabold text-content">Giáo viên quản trị</p><p className="mt-1 text-sm leading-relaxed text-content-muted">{user?.name || 'Tài khoản đang đăng nhập'}</p></div></div></article>
        <article className="rounded-2xl border border-line bg-surface p-4"><div className="flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-elevated text-content-muted"><UsersRound className="size-5" /></span><div><p className="text-sm font-extrabold text-content">{activeAccounts.length} tài khoản Học sinh</p><p className="mt-1 text-sm leading-relaxed text-content-muted">Các tài khoản đã được phê duyệt sử dụng hệ thống.</p></div></div></article>
      </section>
      <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm dark:shadow-none" aria-labelledby="approval-queue-title">
        <header className="flex items-center justify-between gap-4 border-b border-line p-4 sm:p-5"><div><div className="flex items-center gap-2"><span className="grid size-9 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300"><Clock3 className="size-4" /></span><h2 id="approval-queue-title" className="text-base font-extrabold text-content">Đang chờ phê duyệt</h2></div><p className="mt-2 text-xs leading-5 text-content-muted">{pendingRequests.length} tài khoản cần Giảng viên xác minh.</p></div><button type="button" onClick={() => void loadRequests()} disabled={requestsLoading} className="btn-secondary text-xs disabled:cursor-wait disabled:opacity-70"><RefreshCw className={`size-4 ${requestsLoading ? 'animate-spin motion-reduce:animate-none' : ''}`} />Làm mới</button></header>
        {requestsError ? <div className="p-6 text-center"><p className="text-sm text-red-700 dark:text-red-300">{requestsError}</p><button type="button" onClick={() => void loadRequests(true)} className="btn-secondary mt-4 text-xs">Thử lại</button></div> : pendingRequests.length === 0 ? <div className="p-8 text-center"><ShieldCheck className="mx-auto size-9 text-emerald-500" /><p className="mt-3 text-sm font-extrabold text-content">Không còn tài khoản chờ duyệt</p><p className="mt-1 text-xs text-content-muted">Tất cả yêu cầu mới đã được xử lý.</p></div> : <div className="divide-y divide-line/70">{pendingRequests.map((account) => <article key={account.id} className="grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:items-center"><div className="flex min-w-0 items-center gap-3"><img src={account.avatar} alt="" className="size-11 rounded-xl bg-surface-elevated object-cover" /><div className="min-w-0"><p className="truncate text-sm font-extrabold text-content">{account.name}</p><p className="truncate text-xs text-content-muted">{account.email}</p><p className="mt-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">Đăng ký {account.createdAt ? new Intl.DateTimeFormat('vi-VN').format(new Date(account.createdAt)) : 'gần đây'}</p></div></div><div className="flex gap-2"><button type="button" onClick={() => void updateApproval(account, 'approved')} disabled={busyId === account.id} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-extrabold text-white transition hover:bg-emerald-700 active:scale-[.98] disabled:opacity-60"><Check className="size-4" />Phê duyệt</button><button type="button" onClick={() => void updateApproval(account, 'rejected')} disabled={busyId === account.id} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line px-4 text-xs font-extrabold text-content-muted transition hover:bg-rose-50 hover:text-rose-700 active:scale-[.98] disabled:opacity-60 dark:hover:bg-rose-400/10 dark:hover:text-rose-300"><X className="size-4" />Từ chối</button></div></article>)}</div>}
      </section>
      <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm dark:shadow-none" aria-labelledby="account-access-title">
        <header className="border-b border-line p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2"><span className="grid size-9 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"><CalendarClock className="size-4" /></span><h2 id="account-access-title" className="text-base font-extrabold text-content">Quyền sử dụng tài khoản</h2></div>
              <p className="mt-2 text-xs leading-5 text-content-muted">Chọn nhiều học sinh để áp dụng cùng trạng thái bảo lưu hoặc thời hạn sử dụng.</p>
            </div>
            <label className="relative block w-full lg:max-w-sm">
              <span className="sr-only">Tìm tài khoản trong danh sách quyền sử dụng</span>
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-content-muted" />
              <input value={query} onChange={(event) => { setQuery(event.target.value); setSelectedAccountIds([]); }} className={`${managementInputClass} pl-10`} placeholder="Tìm học sinh theo tên hoặc email" type="search" />
            </label>
          </div>
        </header>
        {filteredActiveAccounts.length > 0 && <div className="flex flex-col gap-3 border-b border-line bg-surface-elevated/60 p-4 xl:flex-row xl:items-center"><label className="inline-flex min-h-10 shrink-0 cursor-pointer items-center gap-2 text-xs font-extrabold text-content"><input type="checkbox" checked={allActiveSelected} onChange={toggleAllActiveAccounts} className="size-4 rounded border-line accent-brand" /><span>Chọn tất cả</span><span className="font-semibold text-content-muted">({selectedAccountIds.length}/{filteredActiveAccounts.length})</span></label><div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"><select value={bulkAction} onChange={(event) => setBulkAction(event.target.value as typeof bulkAction)} className={managementInputClass} aria-label="Thao tác bảo lưu hàng loạt"><option value="freeze">Bảo lưu tài khoản</option><option value="unfreeze">Mở lại tài khoản</option><option value="set_duration">Đặt thời hạn sử dụng</option></select><select value={bulkDuration} onChange={(event) => setBulkDuration(Number(event.target.value))} disabled={bulkAction !== 'set_duration'} className={`${managementInputClass} disabled:cursor-not-allowed disabled:opacity-50`} aria-label="Thời hạn dùng chung"><option value={1}>1 tháng</option><option value={3}>3 tháng</option><option value={5}>5 tháng</option><option value={6}>6 tháng</option><option value={12}>12 tháng</option><option value={0}>Không giới hạn</option></select><button type="button" onClick={() => void updateSelectedAccess()} disabled={selectedAccountIds.length === 0 || bulkBusy} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-xs font-extrabold text-brand-ink transition hover:bg-brand-hover active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50">{bulkBusy ? <RefreshCw className="size-4 animate-spin motion-reduce:animate-none" /> : <Check className="size-4" />}{bulkBusy ? 'Đang áp dụng...' : `Áp dụng cho ${selectedAccountIds.length}`}</button></div></div>}
        {activeAccounts.length === 0 ? <div className="p-8 text-center"><UsersRound className="mx-auto size-8 text-content-muted" /><p className="mt-3 text-sm font-bold text-content">Chưa có học sinh đã phê duyệt</p></div> : filteredActiveAccounts.length === 0 ? <div className="p-8 text-center"><Search className="mx-auto size-8 text-content-muted" /><p className="mt-3 text-sm font-bold text-content">Không tìm thấy tài khoản phù hợp</p><p className="mt-1 text-xs text-content-muted">Thử tìm bằng tên hoặc email khác.</p></div> : <div className="divide-y divide-line/70">{filteredActiveAccounts.map((account) => { const expired = Boolean(!account.isFrozen && account.accessExpiresAt && new Date(account.accessExpiresAt).getTime() <= Date.now()); const expiryLabel = account.accessExpiresAt ? new Intl.DateTimeFormat('vi-VN').format(new Date(account.accessExpiresAt)) : 'Không giới hạn'; const selected = selectedAccountIds.includes(account.id); return <article key={account.id} className={`grid gap-4 p-4 transition-colors xl:grid-cols-[minmax(0,1fr)_auto_auto] xl:items-center ${selected ? 'bg-brand-50/70 dark:bg-brand-500/5' : ''}`}><div className="flex min-w-0 items-center gap-3"><input type="checkbox" checked={selected} onChange={() => toggleAccountSelection(account.id)} aria-label={`Chọn ${account.name}`} className="size-4 shrink-0 cursor-pointer rounded border-line accent-brand" /><img src={account.avatar} alt="" className="size-11 rounded-xl bg-surface-elevated object-cover" /><div className="min-w-0"><p className="truncate text-sm font-extrabold text-content">{account.name}</p><p className="truncate text-xs text-content-muted">{account.email}</p><div className="mt-1.5 flex flex-wrap gap-2"><span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${account.isFrozen ? 'bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-gray-200' : expired ? 'bg-rose-100 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300'}`}>{account.isFrozen ? 'Đang bảo lưu' : expired ? 'Đã hết hạn' : 'Đang hoạt động'}</span><span className="rounded-full bg-surface-elevated px-2.5 py-1 text-[10px] font-bold text-content-muted">Hết hạn: {expiryLabel}</span><Link to={`/admin/accounts/${encodeURIComponent(account.id)}/practice`} className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-[10px] font-extrabold text-brand-700 transition hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-300 dark:hover:bg-brand-500/20"><BarChart3 className="size-3" aria-hidden="true" />Chi tiết luyện tập</Link></div></div></div><button type="button" onClick={() => void updateAccess(account, account.isFrozen ? 'unfreeze' : 'freeze')} disabled={bulkBusy || busyId === account.id || expired} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-line px-4 text-xs font-extrabold text-content transition hover:bg-surface-hover active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50">{account.isFrozen ? <Play className="size-4" /> : <Pause className="size-4" />}{account.isFrozen ? 'Mở lại' : 'Bảo lưu'}</button><div className="flex min-w-0 gap-2"><select value={durationById[account.id] ?? 5} onChange={(event) => setDurationById((current) => ({ ...current, [account.id]: Number(event.target.value) }))} disabled={bulkBusy} className={`${managementInputClass} min-w-0 sm:min-w-40`} aria-label={`Thời hạn của ${account.name}`}><option value={1}>1 tháng</option><option value={3}>3 tháng</option><option value={5}>5 tháng</option><option value={6}>6 tháng</option><option value={12}>12 tháng</option><option value={0}>Không giới hạn</option></select><button type="button" onClick={() => void updateAccess(account, 'set_duration')} disabled={bulkBusy || busyId === account.id} className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl bg-brand px-4 text-xs font-extrabold text-brand-ink transition hover:bg-brand-hover active:scale-[.98] disabled:opacity-60">Áp dụng</button></div></article>; })}</div>}
      </section>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {toast && (
            <div className="pointer-events-none fixed inset-0 z-[120] flex items-start justify-center px-4 pt-5 sm:pt-6">
              <motion.div
            key={`${toast.tone}-${toast.message}`}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: reduceMotion ? 0.1 : 0.2, ease: 'easeOut' }}
            role={toast.tone === 'error' ? 'alert' : 'status'}
            aria-live={toast.tone === 'error' ? 'assertive' : 'polite'}
            className={`pointer-events-auto flex max-w-[min(32rem,calc(100vw-2rem))] items-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold shadow-xl ${
              toast.tone === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-slate-900 dark:text-emerald-300'
                : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-slate-900 dark:text-red-300'
            }`}
          >
            {toast.tone === 'success'
              ? <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
              : <AlertCircle className="size-4 shrink-0" aria-hidden="true" />}
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="ml-1 grid size-6 shrink-0 place-items-center rounded-md opacity-70 transition hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
              aria-label="Đóng thông báo"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
    </BoneyardSkeleton>
  );
};
