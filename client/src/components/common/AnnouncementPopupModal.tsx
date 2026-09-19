import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { AlertTriangle, Bell, CheckCircle2, ExternalLink, Info, Megaphone, X } from 'lucide-react';
import { getModalMotion } from './modalMotion';
import { announcementService, SystemAnnouncement } from '../../services/backend';
import { useAuth } from '../../context/AuthContext';

// ─── helpers ──────────────────────────────────────────────────────────────────

const LS_PREFIX = 'seen_announcement_';

const hasSeenLocally = (id: string): boolean => {
  try {
    return localStorage.getItem(LS_PREFIX + id) === '1';
  } catch {
    return false;
  }
};

const markSeenLocally = (id: string): void => {
  try {
    localStorage.setItem(LS_PREFIX + id, '1');
  } catch {
    /* silently ignore */
  }
};

// ─── type config ──────────────────────────────────────────────────────────────

const TYPE_CONFIG = {
  info: {
    Icon: Info,
    iconBg: 'bg-blue-50 dark:bg-blue-950/40',
    iconColor: 'text-blue-500',
    badgeText: 'Thông tin',
    badgeClass:
      'border-blue-200/80 bg-blue-50 text-blue-600 dark:border-blue-500/20 dark:bg-blue-950/40 dark:text-blue-400',
  },
  warning: {
    Icon: AlertTriangle,
    iconBg: 'bg-amber-50 dark:bg-amber-950/40',
    iconColor: 'text-amber-500',
    badgeText: 'Chú ý',
    badgeClass:
      'border-amber-200/80 bg-amber-50 text-amber-600 dark:border-amber-500/20 dark:bg-amber-950/40 dark:text-amber-400',
  },
  success: {
    Icon: CheckCircle2,
    iconBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    iconColor: 'text-emerald-500',
    badgeText: 'Tin vui',
    badgeClass:
      'border-emerald-200/80 bg-emerald-50 text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-950/40 dark:text-emerald-400',
  },
  event: {
    Icon: Megaphone,
    iconBg: 'bg-orange-50 dark:bg-orange-950/40',
    iconColor: 'text-orange-500',
    badgeText: 'Sự kiện',
    badgeClass:
      'border-orange-200/80 bg-orange-50 text-orange-600 dark:border-orange-500/20 dark:bg-orange-950/40 dark:text-orange-400',
  },
} as const;

// ─── component ────────────────────────────────────────────────────────────────

export const AnnouncementPopupModal: React.FC = () => {
  const reduceMotion = useReducedMotion();
  const modalMotion = useMemo(() => getModalMotion(reduceMotion), [reduceMotion]);
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAuth();
  const panelRef = useRef<HTMLDivElement>(null);

  const [announcement, setAnnouncement] = useState<SystemAnnouncement | null>(null);
  const [open, setOpen] = useState(false);
  const hasFetched = useRef(false);

  // Never open during live exam sessions
  const isExamPage =
    location.pathname.includes('/mock-test/exam') ||
    location.pathname.includes('/practice/runner');

  // Fetch once after authentication is ready
  useEffect(() => {
    if (isLoading || !isAuthenticated || isExamPage || hasFetched.current) return;
    hasFetched.current = true;

    announcementService
      .getUnreadPopup()
      .then(({ data }) => {
        if (!data) return;
        if (hasSeenLocally(data.id)) return;
        setAnnouncement(data);
        setOpen(true);
      })
      .catch(() => {/* silently ignore network failures */});
  }, [isLoading, isAuthenticated, isExamPage]);

  const dismiss = (shouldOpenLink = false) => {
    if (!announcement) return;
    const capturedAnnouncement = announcement;
    setOpen(false);
    markSeenLocally(capturedAnnouncement.id);
    announcementService.markAsRead(capturedAnnouncement.id).catch(() => {});
    if (shouldOpenLink && capturedAnnouncement.actionUrl) {
      setTimeout(() => {
        window.open(capturedAnnouncement.actionUrl!, '_blank', 'noopener,noreferrer');
      }, 280);
    }
  };

  // Keyboard: Escape to dismiss
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, announcement]);

  // Body scroll lock while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!announcement || typeof document === 'undefined') return null;

  const cfg = TYPE_CONFIG[announcement.type] ?? TYPE_CONFIG.info;
  const { Icon } = cfg;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* ── Backdrop ─────────────────────────────────────────────── */}
          <motion.div
            key="announcement-backdrop"
            className="fixed inset-0 z-[9998] bg-slate-950/50 backdrop-blur-sm"
            onClick={() => dismiss()}
            {...modalMotion.backdrop}
          />

          {/* ── Panel wrapper ────────────────────────────────────────── */}
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              ref={panelRef}
              key="announcement-panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby="announcement-modal-title"
              className="pointer-events-auto w-full max-w-md rounded-3xl border border-line bg-surface shadow-2xl outline-none"
              {...modalMotion.panel}
            >
              {/* ── Header ──────────────────────────────────────────── */}
              <div className="flex items-start gap-4 px-6 pt-6 pb-4">
                {/* Icon badge */}
                <div
                  className={`shrink-0 flex size-11 items-center justify-center rounded-2xl ${cfg.iconBg}`}
                >
                  <Icon className={`size-5 ${cfg.iconColor}`} />
                </div>

                {/* Title area */}
                <div className="min-w-0 flex-1 pt-0.5">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${cfg.badgeClass} mb-1.5`}
                  >
                    <Bell className="size-2.5" />
                    {cfg.badgeText}
                  </span>
                  <h2
                    id="announcement-modal-title"
                    className="text-[17px] font-black leading-snug text-content"
                  >
                    {announcement.title}
                  </h2>
                </div>

                {/* Close button */}
                <button
                  onClick={() => dismiss()}
                  className="shrink-0 -mt-1 -mr-1 rounded-xl p-2 text-content-muted transition-colors hover:bg-surface-elevated hover:text-content focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                  aria-label="Đóng thông báo"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* ── Divider ─────────────────────────────────────────── */}
              <div className="h-px bg-line mx-6" />

              {/* ── Content ─────────────────────────────────────────── */}
              <div className="px-6 py-5">
                <p className="text-sm leading-relaxed text-content-muted whitespace-pre-wrap">
                  {announcement.content}
                </p>
              </div>

              {/* ── Footer ──────────────────────────────────────────── */}
              <div className="flex items-center justify-end gap-2.5 border-t border-line px-6 pb-5 pt-4">
                {announcement.actionUrl && announcement.actionLabel && (
                  <button
                    onClick={() => dismiss(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-content transition-colors hover:bg-surface-elevated focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                  >
                    <ExternalLink className="size-3.5 text-content-muted" />
                    {announcement.actionLabel}
                  </button>
                )}
                <button
                  onClick={() => dismiss()}
                  className="rounded-xl bg-brand px-5 py-2.5 text-sm font-extrabold text-brand-ink shadow-sm transition-colors hover:bg-brand-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 active:scale-[.98]"
                >
                  Đã hiểu
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
};
