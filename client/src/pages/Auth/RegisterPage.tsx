import React, { useEffect, useState } from 'react';
import {
  ChevronDown,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Target,
  UserRound,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getRoleHome, getUserRole } from '../../utils/rbac';

const fieldClassName =
  'h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition-[border-color,box-shadow,background-color] duration-200 hover:border-slate-400 focus:border-[#e5ad00] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#ffc72c]/15 dark:border-white/10 dark:bg-gray-900/90 dark:text-gray-100 dark:placeholder:text-gray-500 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] dark:hover:border-white/15 dark:focus:border-[#ffc72c]/70 dark:focus:bg-gray-900 dark:focus:ring-[#ffc72c]/10';

const labelClassName = 'mb-2 block text-sm font-semibold text-slate-700 dark:text-gray-200';

interface PasswordFieldProps {
  id: string;
  label: string;
  name: string;
  value: string;
  autoComplete: string;
  visible: boolean;
  onChange: (value: string) => void;
  onToggle: () => void;
}

const PasswordField = ({
  id,
  label,
  name,
  value,
  autoComplete,
  visible,
  onChange,
  onToggle,
}: PasswordFieldProps) => (
  <div>
    <label htmlFor={id} className={labelClassName}>
      {label}
    </label>
    <div className="relative">
      <LockKeyhole
        className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-slate-400 dark:text-gray-500"
        aria-hidden="true"
      />
      <input
        id={id}
        name={name}
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="••••••••"
        className={`${fieldClassName} pr-12`}
      />
      <button
        type="button"
        onClick={onToggle}
        aria-label={visible ? `Ẩn ${label.toLowerCase()}` : `Hiện ${label.toLowerCase()}`}
        aria-pressed={visible}
        className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-100"
      >
        {visible ? (
          <EyeOff className="size-5" aria-hidden="true" />
        ) : (
          <Eye className="size-5" aria-hidden="true" />
        )}
      </button>
    </div>
  </div>
);

export const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [targetScore, setTargetScore] = useState(750);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const { user, isAuthenticated, isLoading, register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      navigate(getRoleHome(getUserRole(user)), { replace: true });
    }
  }, [isAuthenticated, isLoading, user, navigate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name || !email || !password || !confirmPass) {
      setError('Vui lòng nhập đầy đủ tất cả thông tin.');
      return;
    }
    if (password !== confirmPass) {
      setError('Mật khẩu xác nhận không trùng khớp.');
      return;
    }
    if (password.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự.');
      return;
    }

    setError('');
    setSuccess('');
    setIsSubmitting(true);
    try {
      const result = await register(name, email, password, targetScore);
      if (result.requiresEmailConfirmation) {
        setSuccess('Đăng ký thành công! Vui lòng kiểm tra email để xác nhận tài khoản.');
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      setError(message || 'Không thể đăng ký. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      <header className="mb-7">
        <h1 className="text-3xl font-extrabold tracking-[-0.035em] text-slate-950 dark:text-gray-50 sm:text-4xl">
          Tạo tài khoản mới
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-gray-400">
          Chỉ mất 30 giây để thiết lập lộ trình học cá nhân.
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
      {success && (
        <div
          role="status"
          className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200"
        >
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="register-name" className={labelClassName}>
              Họ và tên
            </label>
            <div className="relative">
              <UserRound
                className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-slate-400 dark:text-gray-500"
                aria-hidden="true"
              />
              <input
                id="register-name"
                name="name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Nguyễn Văn A"
                className={fieldClassName}
              />
            </div>
          </div>

          <div>
            <label htmlFor="register-email" className={labelClassName}>
              Email
            </label>
            <div className="relative">
              <Mail
                className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-slate-400 dark:text-gray-500"
                aria-hidden="true"
              />
              <input
                id="register-email"
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
        </div>

        <div>
          <label htmlFor="target-score" className={labelClassName}>
            Mục tiêu TOEIC mong muốn
          </label>
          <div className="relative">
            <Target
              className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-slate-400 dark:text-gray-500"
              aria-hidden="true"
            />
            <select
              id="target-score"
              name="targetScore"
              value={targetScore}
              onChange={(event) => setTargetScore(Number(event.target.value))}
              className={`${fieldClassName} appearance-none pr-11`}
            >
              <option value={500}>500+ TOEIC (Nền tảng cơ bản)</option>
              <option value={650}>650+ TOEIC (Khá - Chuẩn tốt nghiệp)</option>
              <option value={750}>750+ TOEIC (Giỏi - Đi làm doanh nghiệp)</option>
              <option value={850}>850+ TOEIC (Xuất sắc)</option>
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3.5 top-1/2 size-5 -translate-y-1/2 text-slate-400 dark:text-gray-500"
              aria-hidden="true"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <PasswordField
            id="register-password"
            label="Mật khẩu"
            name="password"
            value={password}
            autoComplete="new-password"
            visible={showPassword}
            onChange={setPassword}
            onToggle={() => setShowPassword((visible) => !visible)}
          />
          <PasswordField
            id="register-password-confirmation"
            label="Xác nhận mật khẩu"
            name="passwordConfirmation"
            value={confirmPass}
            autoComplete="new-password"
            visible={showPassword}
            onChange={setConfirmPass}
            onToggle={() => setShowPassword((visible) => !visible)}
          />
        </div>

        <p className="text-xs leading-5 text-slate-500 dark:text-gray-500">
          Mật khẩu cần có ít nhất 8 ký tự.
        </p>

        <button
          type="submit"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          className="mt-1 inline-flex h-12 w-full items-center justify-center rounded-xl border border-[#ffe799]/50 bg-gradient-to-r from-[#ffdc66] via-[#ffc72c] to-[#e5ad00] px-5 text-sm font-extrabold text-[#1b2a4a] shadow-[0_14px_36px_-18px_rgba(255,199,44,0.65)] transition-[transform,filter,box-shadow] duration-200 hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[0_18px_42px_-18px_rgba(255,199,44,0.78)] active:translate-y-0 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
        >
          {isSubmitting ? 'Đang tạo tài khoản...' : 'Tạo tài khoản miễn phí'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600 dark:text-gray-400">
        Đã có tài khoản?{' '}
        <Link
          to="/login"
          className="font-bold text-[#ffc72c] transition-colors hover:text-[#ffdc66]"
        >
          Đăng nhập ngay
        </Link>
      </p>
    </div>
  );
};
