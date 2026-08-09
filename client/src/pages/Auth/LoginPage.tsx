import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getRoleHome, getUserRole } from '../../utils/rbac';

const fieldClassName =
  'h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition-[border-color,box-shadow,background-color] duration-200 hover:border-slate-400 focus:border-[#e5ad00] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#ffc72c]/15 dark:border-white/10 dark:bg-gray-900/90 dark:text-gray-100 dark:placeholder:text-gray-500 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] dark:hover:border-white/15 dark:focus:border-[#ffc72c]/70 dark:focus:bg-gray-900 dark:focus:ring-[#ffc72c]/10';

const labelClassName = 'mb-2 block text-sm font-semibold text-slate-700 dark:text-gray-200';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const { user, isAuthenticated, isLoading, login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      navigate(user.approvalStatus === 'approved' || getUserRole(user) === 'admin' ? getRoleHome(getUserRole(user)) : '/pending-approval', { replace: true });
    }
  }, [isAuthenticated, isLoading, user, navigate]);

  const getErrorMessage = (err: unknown) => {
    const message = err instanceof Error ? err.message : '';
    if (message.toLowerCase().includes('invalid login credentials')) {
      return 'Email hoặc mật khẩu không chính xác.';
    }
    if (message.toLowerCase().includes('email not confirmed')) {
      return 'Email chưa được xác nhận. Vui lòng kiểm tra hộp thư của bạn.';
    }
    return message || 'Không thể đăng nhập. Vui lòng thử lại.';
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email || !password) {
      setError('Vui lòng nhập đầy đủ Email và Mật khẩu.');
      return;
    }

    setError('');
    setIsSubmitting(true);
    try {
      const result = await login(email, password, remember);
      navigate(result.approvalStatus === 'approved' || result.role === 'admin' ? getRoleHome(result.role) : '/pending-approval', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle(remember);
    } catch (err) {
      setError(getErrorMessage(err));
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="w-full">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-[-0.035em] text-slate-950 dark:text-gray-50 sm:text-4xl">
          Đăng nhập tài khoản
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-gray-400">
          Nhập thông tin tài khoản để tiếp tục lộ trình của bạn.
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div>
          <label htmlFor="login-email" className={labelClassName}>
            Email
          </label>
          <div className="relative">
            <Mail
              className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-slate-400 dark:text-gray-500"
              aria-hidden="true"
            />
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              className={fieldClassName}
            />
          </div>
        </div>

        <div>
          <label htmlFor="login-password" className={labelClassName}>
            Mật khẩu
          </label>
          <div className="relative">
            <LockKeyhole
              className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-slate-400 dark:text-gray-500"
              aria-hidden="true"
            />
            <input
              id="login-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              className={`${fieldClassName} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              aria-pressed={showPassword}
              className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-100"
            >
              {showPassword ? (
                <EyeOff className="size-5" aria-hidden="true" />
              ) : (
                <Eye className="size-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 text-sm">
          <label className="flex cursor-pointer items-center gap-2.5 text-slate-600 dark:text-gray-400">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
              className="size-4 rounded border-slate-300 bg-white accent-[#ffc72c] dark:border-white/15 dark:bg-gray-900"
            />
            <span>Ghi nhớ đăng nhập</span>
          </label>
          <a
            href="#"
            className="shrink-0 font-semibold text-[#ffc72c] transition-colors hover:text-[#ffdc66]"
          >
            Quên mật khẩu?
          </a>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || isGoogleLoading}
          aria-busy={isSubmitting}
          className="mt-1 inline-flex h-12 w-full items-center justify-center rounded-xl border border-[#ffe799]/50 bg-gradient-to-r from-[#ffdc66] via-[#ffc72c] to-[#e5ad00] px-5 text-sm font-extrabold text-[#1b2a4a] shadow-[0_14px_36px_-18px_rgba(255,199,44,0.65)] transition-[transform,filter,box-shadow] duration-200 hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[0_18px_42px_-18px_rgba(255,199,44,0.78)] active:translate-y-0 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
        >
          {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
      </form>

      <div className="my-6 flex items-center gap-4" aria-hidden="true">
        <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
        <span className="text-xs text-slate-500 dark:text-gray-500">hoặc</span>
        <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
      </div>

      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={isSubmitting || isGoogleLoading}
        aria-busy={isGoogleLoading}
        className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition-[background-color,border-color,transform] duration-200 hover:border-slate-400 hover:bg-slate-100 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60 dark:border-white/10 dark:bg-gray-900/70 dark:text-gray-200 dark:shadow-none dark:hover:border-white/20 dark:hover:bg-gray-900"
      >
        <svg className="size-5" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.55h3.24c1.9-1.75 2.98-4.33 2.98-7.42Z" />
          <path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.63-2.35l-3.25-2.55c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.63A10 10 0 0 0 12 22Z" />
          <path fill="#FBBC05" d="M6.39 13.93A6.02 6.02 0 0 1 6.07 12c0-.67.11-1.32.32-1.93V7.44H3.04A10 10 0 0 0 2 12c0 1.64.39 3.19 1.04 4.56l3.35-2.63Z" />
          <path fill="#EA4335" d="M12 5.94c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.96 5.44l3.35 2.63C7.18 7.7 9.39 5.94 12 5.94Z" />
        </svg>
        {isGoogleLoading ? 'Đang chuyển hướng...' : 'Đăng nhập bằng Google'}
      </button>

      <p className="mt-7 text-center text-sm text-slate-600 dark:text-gray-400">
        Chưa có tài khoản?{' '}
        <Link
          to="/register"
          className="font-bold text-[#ffc72c] transition-colors hover:text-[#ffdc66]"
        >
          Đăng ký miễn phí
        </Link>
      </p>
    </div>
  );
};
