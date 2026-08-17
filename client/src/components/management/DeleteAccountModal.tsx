import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Loader2, Trash2, X } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { getModalMotion } from '../common/modalMotion';

export interface DeleteAccountModalProps {
  title?: string;
  accountName?: string;
  accountEmail?: string;
  count?: number;
  deleting: boolean;
  error?: string;
  onConfirm: () => void;
  onClose: () => void;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  title = 'Xác nhận xoá tài khoản?',
  accountName,
  accountEmail,
  count = 1,
  deleting,
  error,
  onConfirm,
  onClose,
}) => {
  const reduceMotion = useReducedMotion();
  const modalMotion = getModalMotion(reduceMotion);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !deleting) onClose();
    };
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [deleting, onClose]);

  return createPortal(
    <motion.div
      {...modalMotion.backdrop}
      className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto bg-slate-950/65 p-4 backdrop-blur-md"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !deleting) onClose();
      }}
    >
      <motion.div
        {...modalMotion.panel}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
        aria-describedby="delete-account-description"
        className="relative my-auto w-full max-w-md rounded-3xl border border-line bg-surface p-6 text-content shadow-2xl dark:shadow-none"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={deleting}
          aria-label="Đóng xác nhận xoá tài khoản"
          className="absolute right-4 top-4 rounded-full p-2 text-content-muted transition-colors duration-200 hover:bg-surface-hover hover:text-content disabled:cursor-not-allowed disabled:opacity-40"
        >
          <X className="size-5" />
        </button>

        <div className="grid size-11 place-items-center rounded-2xl bg-negative/10 text-negative">
          <AlertTriangle className="size-5" />
        </div>
        <h2 id="delete-account-title" className="mt-4 pr-10 text-lg font-extrabold">
          {title}
        </h2>
        <div id="delete-account-description" className="mt-2 text-sm leading-relaxed text-content-muted">
          {count > 1 ? (
            <p>
              Bạn có chắc chắn muốn xoá vĩnh viễn <strong className="text-content font-bold">{count} tài khoản Học sinh</strong> đã chọn?
            </p>
          ) : (
            <div className="space-y-1.5">
              <p>
                Bạn có chắc chắn muốn xoá tài khoản của học sinh{' '}
                <strong className="text-content font-bold">{accountName || 'này'}</strong>?
              </p>
              {accountEmail && (
                <p className="rounded-xl border border-line bg-surface-elevated/60 px-3 py-2 text-xs font-semibold text-content-muted">
                  Email: <span className="text-content font-bold">{accountEmail}</span>
                </p>
              )}
            </div>
          )}
          <p className="mt-3 text-xs font-semibold text-rose-600 dark:text-rose-400">
            ⚠️ Thao tác này sẽ xoá hoàn toàn lịch sử làm bài, từ vựng và dữ liệu học tập liên quan. Thao tác không thể hoàn tác.
          </p>
        </div>

        {error && (
          <p className="mt-4 rounded-xl border border-negative/20 bg-negative/10 px-3 py-2.5 text-xs font-semibold text-negative" role="alert">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="btn-secondary justify-center text-xs disabled:cursor-not-allowed disabled:opacity-40"
          >
            Huỷ
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-negative px-4 py-2 text-xs font-bold text-white transition-colors duration-200 hover:brightness-95 disabled:cursor-wait disabled:opacity-70"
          >
            {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            {deleting ? 'Đang xoá...' : count > 1 ? `Xoá ${count} tài khoản` : 'Xoá vĩnh viễn'}
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
};
