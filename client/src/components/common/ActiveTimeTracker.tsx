import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Clock, Timer, Zap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const ActiveTimeTracker: React.FC = () => {
  const { user } = useAuth();
  const [seconds, setSeconds] = useState<number>(0);
  const [showTooltip, setShowTooltip] = useState<boolean>(false);

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

  return (
    <div className="relative inline-block">
      <motion.button
        type="button"
        onClick={() => setShowTooltip((prev) => !prev)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
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
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute left-1/2 top-full z-50 mt-2 w-64 -translate-x-1/2 rounded-2xl border border-line bg-surface p-4 shadow-xl backdrop-blur-xl dark:shadow-none"
          >
            <div className="flex items-center justify-between border-b border-line pb-2.5">
              <div className="flex items-center gap-2 text-xs font-extrabold text-content">
                <Timer className="size-4 text-emerald-500" />
                <span>Thời gian học hôm nay</span>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                <Zap className="size-3" /> Tự động
              </span>
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
