import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock3, LogOut, RefreshCw, ShieldCheck } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { BrandLogo } from '../../components/common/BrandLogo';
import { useAuth } from '../../context/AuthContext';

export const PendingApprovalPage: React.FC = () => {
  const { user, isLoading, refreshSession, logout } = useAuth();
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const isRejected = user?.approvalStatus === 'rejected';

  useEffect(() => {
    if (user?.approvalStatus === 'approved') navigate('/dashboard', { replace: true });
  }, [navigate, user?.approvalStatus]);

  if (!isLoading && !user) return <Navigate to="/login" replace />;

  const checkStatus = async () => {
    setChecking(true);
    setMessage('');
    const active = await refreshSession();
    if (active && user?.approvalStatus !== 'approved') setMessage('Tài khoản vẫn đang chờ Giảng viên phê duyệt.');
    setChecking(false);
  };

  const signOut = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <main className="relative grid min-h-[100dvh] place-items-center overflow-hidden bg-slate-50 px-4 py-10 text-slate-950 dark:bg-gray-950 dark:text-gray-50">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,rgba(255,199,44,0.16),transparent_68%)]" aria-hidden="true" />
      <section className="relative w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.45)] dark:border-white/10 dark:bg-gray-900 sm:p-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BrandLogo className="size-11 rounded-xl ring-1 ring-slate-200 dark:ring-white/10" />
            <span className="text-lg font-extrabold tracking-[-0.03em]">ilove<span className="text-[#e5ad00] dark:text-[#ffc72c]">toeic</span></span>
          </div>
          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-extrabold ${isRejected ? 'bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300' : 'bg-amber-50 text-amber-800 dark:bg-amber-400/10 dark:text-amber-300'}`}>
            <Clock3 className="size-4" aria-hidden="true" /> {isRejected ? 'Chưa được phê duyệt' : 'Chờ phê duyệt'}
          </span>
        </div>

        <div className="mt-10 max-w-xl">
          <span className="grid size-14 place-items-center rounded-2xl bg-[#ffc72c] text-[#1b2a4a] shadow-[0_16px_34px_-18px_rgba(229,173,0,0.8)]">
            <ShieldCheck className="size-7" aria-hidden="true" />
          </span>
          <h1 className="mt-6 text-3xl font-extrabold tracking-[-0.035em] sm:text-4xl">{isRejected ? 'Tài khoản chưa được phê duyệt' : 'Tài khoản đang được xét duyệt'}</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-gray-300 sm:text-base">
            {isRejected ? 'Giảng viên chưa thể xác nhận tài khoản này. Vui lòng liên hệ Giảng viên để kiểm tra lại thông tin đăng ký.' : `Chào ${user?.name || 'bạn'}, Giảng viên cần xác nhận tài khoản trước khi bạn bắt đầu học. Bạn có thể quay lại trang này để kiểm tra trạng thái bất cứ lúc nào.`}
          </p>
        </div>

        <ol className="mt-8 grid gap-3 sm:grid-cols-3" aria-label="Quy trình phê duyệt">
          {[
            ['1', 'Đã nhận đăng ký'],
            ['2', 'Giảng viên xác minh'],
            ['3', 'Mở quyền học tập'],
          ].map(([step, label], index) => (
            <li key={step} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3.5 dark:bg-white/5">
              <span className={`grid size-8 shrink-0 place-items-center rounded-xl text-xs font-black ${index === 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300' : 'bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-gray-300'}`}>
                {index === 0 ? <CheckCircle2 className="size-4" aria-hidden="true" /> : step}
              </span>
              <span className="text-xs font-bold leading-5 text-slate-700 dark:text-gray-200">{label}</span>
            </li>
          ))}
        </ol>

        {message && <p className="mt-5 text-sm font-semibold text-amber-700 dark:text-amber-300" role="status">{message}</p>}
        <div className="mt-8 flex flex-col gap-3 border-t border-slate-200 pt-6 dark:border-white/10 sm:flex-row">
          <button type="button" onClick={() => void checkStatus()} disabled={checking} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#ffc72c] px-5 text-sm font-extrabold text-[#1b2a4a] transition hover:bg-[#ffdc66] active:scale-[.98] disabled:opacity-60">
            <RefreshCw className={`size-4 ${checking ? 'animate-spin motion-reduce:animate-none' : ''}`} aria-hidden="true" />
            {checking ? 'Đang kiểm tra...' : 'Kiểm tra trạng thái'}
          </button>
          <button type="button" onClick={() => void signOut()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-100 active:scale-[.98] dark:border-white/15 dark:text-gray-200 dark:hover:bg-white/5">
            <LogOut className="size-4" aria-hidden="true" /> Đăng xuất
          </button>
        </div>
      </section>
    </main>
  );
};
