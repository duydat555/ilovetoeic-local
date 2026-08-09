import React, { useState } from 'react';
import { Archive, CalendarClock, LogOut, RefreshCw, ShieldCheck } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { BrandLogo } from '../../components/common/BrandLogo';
import { useAuth } from '../../context/AuthContext';

export const FrozenAccountPage: React.FC = () => {
  const { user, isLoading, refreshSession, logout } = useAuth();
  const [checking, setChecking] = useState(false);
  const navigate = useNavigate();

  if (!isLoading && !user) return <Navigate to="/login" replace />;
  if (!isLoading && user && !user.isFrozen) return <Navigate to="/dashboard" replace />;

  const checkStatus = async () => {
    setChecking(true);
    await refreshSession();
    setChecking(false);
  };

  const signOut = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const expiry = user?.accessExpiresAt
    ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'long' }).format(new Date(user.accessExpiresAt))
    : 'Không giới hạn';

  return (
    <main className="relative grid min-h-[100dvh] place-items-center overflow-hidden bg-slate-50 px-4 py-10 text-slate-950 dark:bg-gray-950 dark:text-gray-50">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_top,rgba(255,199,44,0.16),transparent_70%)]" aria-hidden="true" />
      <section className="relative w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.45)] dark:border-white/10 dark:bg-gray-900 sm:p-10">
        <div className="flex items-center justify-between gap-4"><div className="flex items-center gap-3"><BrandLogo className="size-11 rounded-xl ring-1 ring-slate-200 dark:ring-white/10" /><span className="text-lg font-extrabold tracking-[-0.03em]">ilove<span className="text-[#e5ad00] dark:text-[#ffc72c]">toeic</span></span></div><span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-extrabold text-slate-700 dark:bg-white/10 dark:text-gray-200"><Archive className="size-4" />Đang bảo lưu</span></div>
        <div className="mt-10"><span className="grid size-14 place-items-center rounded-2xl bg-[#ffc72c] text-[#1b2a4a]"><ShieldCheck className="size-7" /></span><h1 className="mt-6 text-3xl font-extrabold tracking-[-0.035em] sm:text-4xl">Tài khoản đang được bảo lưu</h1><p className="mt-4 max-w-xl text-sm leading-7 text-slate-600 dark:text-gray-300 sm:text-base">Quyền học tập của {user?.name || 'bạn'} đang tạm đóng băng. Thời gian bảo lưu sẽ được cộng bù khi Giảng viên mở lại tài khoản.</p></div>
        <div className="mt-8 flex items-center gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-white/5"><span className="grid size-10 place-items-center rounded-xl bg-white text-slate-600 shadow-sm dark:bg-white/10 dark:text-gray-200"><CalendarClock className="size-5" /></span><div><p className="text-xs font-bold text-slate-500 dark:text-gray-400">Thời hạn hiện tại</p><p className="mt-1 text-sm font-extrabold">{expiry}</p></div></div>
        <div className="mt-8 flex flex-col gap-3 border-t border-slate-200 pt-6 dark:border-white/10 sm:flex-row"><button type="button" onClick={() => void checkStatus()} disabled={checking} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#ffc72c] px-5 text-sm font-extrabold text-[#1b2a4a] transition hover:bg-[#ffdc66] active:scale-[.98] disabled:opacity-60"><RefreshCw className={`size-4 ${checking ? 'animate-spin motion-reduce:animate-none' : ''}`} />{checking ? 'Đang kiểm tra...' : 'Kiểm tra trạng thái'}</button><button type="button" onClick={() => void signOut()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-100 active:scale-[.98] dark:border-white/15 dark:text-gray-200 dark:hover:bg-white/5"><LogOut className="size-4" />Đăng xuất</button></div>
      </section>
    </main>
  );
};
