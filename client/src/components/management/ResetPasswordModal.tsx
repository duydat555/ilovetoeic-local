import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Copy, Eye, EyeOff, KeyRound, Loader2, RefreshCw, X } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { getModalMotion } from '../common/modalMotion';

export interface ResetPasswordModalProps {
  accountName: string;
  accountEmail: string;
  submitting: boolean;
  error?: string;
  onConfirm: (newPassword: string) => void;
  onClose: () => void;
}

const generateRandomPassword = (length = 10) => {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$%';
  let password = '';
  for (let i = 0; i < length; i += 1) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  accountName,
  accountEmail,
  submitting,
  error,
  onConfirm,
  onClose,
}) => {
  const reduceMotion = useReducedMotion();
  const modalMotion = getModalMotion(reduceMotion);

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) onClose();
    };
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [submitting, onClose]);

  const handleGenerate = () => {
    const generated = generateRandomPassword(10);
    setPassword(generated);
    setValidationError('');
    setShowPassword(true);
  };

  const handleCopy = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API is restricted
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!password || password.length < 8) {
      setValidationError('Mật khẩu mới phải chứa ít nhất 8 ký tự.');
      return;
    }
    setValidationError('');
    onConfirm(password);
  };

  return createPortal(
    <motion.div
      {...modalMotion.backdrop}
      className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto bg-slate-950/65 p-4 backdrop-blur-md"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <motion.div
        {...modalMotion.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reset-password-modal-title"
        aria-describedby="reset-password-modal-description"
        className="relative my-auto w-full max-w-md rounded-3xl border border-line bg-surface p-6 text-content shadow-2xl dark:shadow-none"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          aria-label="Đóng bảng đặt lại mật khẩu"
          className="absolute right-4 top-4 rounded-full p-2 text-content-muted transition-colors duration-200 hover:bg-surface-hover hover:text-content disabled:cursor-not-allowed disabled:opacity-40"
        >
          <X className="size-5" />
        </button>

        <div className="grid size-11 place-items-center rounded-2xl bg-brand/10 text-brand">
          <KeyRound className="size-5" />
        </div>

        <h2 id="reset-password-modal-title" className="mt-4 pr-10 text-lg font-extrabold text-content">
          Đặt lại mật khẩu học sinh
        </h2>

        <div id="reset-password-modal-description" className="mt-2 space-y-2 text-xs leading-relaxed text-content-muted">
          <p>
            Đặt lại mật khẩu trực tiếp cho học sinh <strong className="text-content font-bold">{accountName}</strong>.
          </p>
          {accountEmail && (
            <div className="rounded-xl border border-line bg-surface-elevated/60 px-3 py-2 font-medium text-content-muted">
              Email tài khoản: <span className="text-content font-bold">{accountEmail}</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="new-password-input" className="block text-xs font-bold text-content">
                Mật khẩu mới <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-brand transition hover:underline disabled:opacity-50"
              >
                <RefreshCw className="size-3" />
                Tạo ngẫu nhiên
              </button>
            </div>

            <div className="relative mt-1.5 flex items-center">
              <input
                id="new-password-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (validationError) setValidationError('');
                }}
                disabled={submitting}
                placeholder="Nhập mật khẩu mới (tối thiểu 8 ký tự)"
                className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 pr-20 text-xs font-medium text-content placeholder:text-content-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:opacity-50"
              />
              <div className="absolute right-2.5 flex items-center gap-1">
                {password && (
                  <button
                    type="button"
                    onClick={() => void handleCopy()}
                    title="Sao chép mật khẩu"
                    aria-label="Sao chép mật khẩu"
                    className="grid size-7 place-items-center rounded-lg text-content-muted transition hover:bg-surface-elevated hover:text-content"
                  >
                    {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  className="grid size-7 place-items-center rounded-lg text-content-muted transition hover:bg-surface-elevated hover:text-content"
                >
                  {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
            </div>

            {validationError && (
              <p className="mt-1.5 text-[11px] font-semibold text-rose-500">
                {validationError}
              </p>
            )}
          </div>

          {(error || validationError) && (
            <p className="rounded-xl border border-negative/20 bg-negative/10 px-3 py-2 text-xs font-semibold text-negative" role="alert">
              {error || validationError}
            </p>
          )}

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="btn-secondary justify-center text-xs disabled:cursor-not-allowed disabled:opacity-40"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={submitting || !password}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-extrabold text-brand-ink transition hover:bg-brand-hover active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
              {submitting ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>,
    document.body,
  );
};
