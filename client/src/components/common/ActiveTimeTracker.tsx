import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Clock, Timer, Zap, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ModalPortal } from './ModalPortal';

// Hook kiểm tra viewport mobile (<768px)
export const useIsMobile = (breakpoint = 768) => {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < breakpoint;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint]);

  return isMobile;
};

export const ActiveTimeTracker: React.FC = () => {
  const { user } = useAuth();
  const [seconds, setSeconds] = useState<number>(0);
  const [showTooltip, setShowTooltip] = useState<boolean>(false);
  const isMobile = useIsMobile(768);
  const containerRef = useRef<HTMLDivElement>(null);

  const getStorageKey = () => {
    const today = new Date().toISOString().slice(0, 10);
    const uid = user?.id || 'guest';
    return `toeic_active_time_${uid}_${today}`;
  };

  useEffect(() => {
    const key = getStorageKey();
    const saved = localStorage.getItem(key);
    const initialSeconds = saved ? parseInt(saved, 10) || 0 : 0;
    setSeconds(initialSeconds);
  }, [user?.id]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        setSeconds((prev) => {
          const next = prev + 1;
          const key = getStorageKey();
          localStorage.setItem(key, next.toString());
          return next;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [user?.id]);

  // Click outside listener cho Desktop
  useEffect(() => {
    if (isMobile || !showTooltip) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowTooltip(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile, showTooltip]);

  const formatShortTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;

    if (hours > 0) {
      return `${hours}g ${remainingMins}p`;
    }
    if (mins > 0) {
      return `${mins}p`;
    }
    return `${totalSeconds}s`;
  };

  const formatFullTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    const parts = [];
    if (hours > 0) parts.push(`${hours} giờ`);
    if (mins > 0 || hours > 0) parts.push(`${mins} phút`);
    parts.push(`${secs} giây`);
    return parts.join(' ');
  };

  const percentGoal = Math.min(100, Math.round((seconds / 1800) * 100));

  const popupContent = (
    <>
      <div className="flex items-center justify-between gap-2 border-b border-line pb-2.5">
        <div className="flex shrink-0 items-center gap-1.5 text-xs font-extrabold text-content whitespace-nowrap">
          <Timer className="size-4 text-emerald-500 shrink-0" />
          <span className="whitespace-nowrap">Thời gian học hôm nay</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
            <Zap className="size-3 shrink-0" />
            <span className="whitespace-nowrap">Tự động</span>
          </span>
          {isMobile && (
            <button
              type="button"
              onClick={() => setShowTooltip(false)}
              className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-surface-hover"
              aria-label="Đóng"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <div className="py-1 text-center">
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
            {formatFullTime(seconds)}
          </div>
          <p className="mt-1 text-[11px] font-medium leading-relaxed text-content-muted">
            Tự động ghi nhận thời gian thực khi bạn truy cập và học tập trên hệ thống.
          </p>
        </div>

        <div className="rounded-xl bg-surface-elevated/80 p-2.5 text-xs text-content-muted">
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span>Mục tiêu ngày (30p)</span>
            <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{percentGoal}%</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-surface-hover">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${percentGoal}%` }}
            />
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div ref={containerRef} className="relative inline-block">
      <motion.button
        type="button"
        onClick={() => setShowTooltip((prev) => !prev)}
        onMouseEnter={() => {
          if (!isMobile) setShowTooltip(true);
        }}
        onMouseLeave={() => {
          if (!isMobile) setShowTooltip(false);
        }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className="flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-xs font-extrabold text-emerald-700 shadow-xs transition-colors duration-200 hover:bg-emerald-500/20 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-300 sm:text-sm"
        aria-label={`Thời gian hoạt động hôm nay: ${formatShortTime(seconds)}`}
      >
        <span className="relative flex size-2.5 items-center justify-center">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
        </span>
        <Clock className="size-3.5 text-emerald-600 dark:text-emerald-400" />
        <span className="inline-flex items-center gap-0.5">
          <span>{formatShortTime(seconds)}</span>
        </span>
      </motion.button>

      <AnimatePresence>
        {showTooltip && (
          isMobile ? (
            // Mobile: ModalPortal + Bottom Sheet với Backdrop mờ & Lock Scroll
            <ModalPortal>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowTooltip(false)}
                className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-xs"
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 280 }}
                className="fixed inset-x-0 bottom-0 z-[9999] rounded-t-3xl border-t border-line bg-surface p-5 pb-8 shadow-2xl dark:bg-surface-elevated"
              >
                {/* Thanh kéo nhỏ ở trên */}
                <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-700" />
                {popupContent}
              </motion.div>
            </ModalPortal>
          ) : (
            // Desktop: Dropdown nổi thông thường
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.95 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute right-0 sm:left-1/2 top-full z-40 mt-2 w-72 -translate-x-1/2 rounded-2xl border border-line bg-surface p-4 shadow-xl backdrop-blur-xl dark:shadow-none"
            >
              {popupContent}
            </motion.div>
          )
        )}
      </AnimatePresence>
    </div>
  );
};
