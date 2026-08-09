import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { LucideIcon, X } from 'lucide-react';
import { UserRole } from '../../types';
import { ROLE_LABELS } from '../../utils/rbac';
import { getModalMotion } from '../common/modalMotion';

export const managementInputClass = 'min-h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-sm text-content outline-none transition placeholder:text-content-muted focus:border-accent focus:ring-4 focus:ring-accent/10';

interface PageHeaderProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, action }) => (
  <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      <h1 className="text-2xl font-extrabold tracking-tight text-content sm:text-3xl">{title}</h1>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-content-muted">{description}</p>
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </header>
);

interface StatCardProps {
  label: string;
  value: string | number;
  helper: string;
  icon: LucideIcon;
  tone?: 'brand' | 'positive' | 'warning' | 'negative';
}

const toneStyles = {
  brand: 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300',
  positive: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  negative: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300',
};

export const StatCard: React.FC<StatCardProps> = ({ label, value, helper, icon: Icon, tone = 'brand' }) => (
  <article className="rounded-2xl border border-line bg-surface p-4 shadow-sm transition-colors dark:shadow-none sm:p-5">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-bold text-content-muted">{label}</p>
        <p className="mt-2 text-2xl font-black tracking-tight text-content">{value}</p>
        <p className="mt-1 truncate text-[11px] font-medium text-content-muted">{helper}</p>
      </div>
      <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${toneStyles[tone]}`}>
        <Icon className="size-5" aria-hidden="true" />
      </span>
    </div>
  </article>
);

const roleStyles: Record<UserRole, string> = {
  student: 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-500/10 dark:text-slate-300',
  admin: 'border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-800 dark:bg-brand-500/10 dark:text-brand-300',
};

export const RoleBadge: React.FC<{ role: UserRole }> = ({ role }) => (
  <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${roleStyles[role]}`}>
    {ROLE_LABELS[role]}
  </span>
);

interface DialogShellProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

export const DialogShell: React.FC<DialogShellProps> = ({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  maxWidth = 'max-w-2xl',
}) => {
  const reduceMotion = useReducedMotion();
  const modalMotion = getModalMotion(reduceMotion);
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      ));
      if (focusable.length === 0) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const focusFrame = window.requestAnimationFrame(() => {
      const firstControl = panelRef.current?.querySelector<HTMLElement>(
        'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])',
      );
      (firstControl || panelRef.current)?.focus();
    });
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
      previousFocus?.focus();
    };
  }, [open]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="management-dialog-overlay"
          {...modalMotion.backdrop}
          className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"
          onMouseDown={onClose}
        >
          <motion.section
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            {...modalMotion.panel}
            onMouseDown={(event) => event.stopPropagation()}
            className={`my-auto w-full ${maxWidth} overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl dark:shadow-none`}
          >
            <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
              <div>
                <h2 id={titleId} className="text-lg font-extrabold tracking-tight text-content">{title}</h2>
                {description && <p className="mt-1 text-sm leading-relaxed text-content-muted">{description}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Đóng hộp thoại"
                className="grid size-9 shrink-0 place-items-center rounded-xl text-content-muted transition hover:bg-surface-hover hover:text-content active:scale-[.98]"
              >
                <X className="size-4" />
              </button>
            </header>
            <div className="max-h-[70vh] overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">{children}</div>
            {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-4 sm:px-6">{footer}</footer>}
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};
