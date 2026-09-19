import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, Clock, Flame, Info, Target, Zap } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export interface XpExplanationTooltipProps {
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
  side?: 'top' | 'bottom';
}

export const XpExplanationTooltip: React.FC<XpExplanationTooltipProps> = ({
  children,
  className = '',
  align = 'center',
  side = 'bottom',
}) => {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleMouseEnter = useCallback(() => {
    clearTimer();
    setIsOpen(true);
  }, [clearTimer]);

  const handleMouseLeave = useCallback(() => {
    clearTimer();
    timerRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 180);
  }, [clearTimer]);

  const handleToggleClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    setIsOpen((prev) => !prev);
  }, []);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimer();
      document.removeEventListener('click', handleDocumentClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [clearTimer]);

  // Position alignment classes
  const alignmentClass =
    align === 'left'
      ? 'left-0 sm:left-0'
      : align === 'right'
      ? 'right-0 sm:right-0'
      : 'left-1/2 -translate-x-1/2';

  const sideClass =
    side === 'top'
      ? 'bottom-full mb-2.5'
      : 'top-full mt-2.5';

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      <div
        onClick={handleToggleClick}
        className="inline-flex w-full"
        role="button"
        tabIndex={0}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        {children}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: side === 'top' ? -4 : 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: side === 'top' ? -4 : 4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className={`absolute z-50 w-80 max-w-[calc(100vw-32px)] rounded-2xl border border-line bg-surface p-4 shadow-xl text-left select-none dark:bg-surface-elevated ${alignmentClass} ${sideClass}`}
            role="tooltip"
            onClick={(event) => event.stopPropagation()}
            onMouseEnter={clearTimer}
            onMouseLeave={handleMouseLeave}
          >
            {/* Header */}
            <div className="flex items-center gap-2.5 border-b border-line pb-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400">
                <Zap className="size-4 fill-current" />
              </span>
              <div>
                <h4 className="text-xs font-black text-content">
                  {language === 'en' ? 'How XP is Calculated' : 'Cách tính Điểm XP'}
                </h4>
                <p className="text-[10px] text-content-muted">
                  {language === 'en' ? 'Accumulate XP to climb levels' : 'Tích luỹ kinh nghiệm để thăng hạng'}
                </p>
              </div>
            </div>

            {/* Methods List */}
            <div className="mt-3 space-y-2">
              {/* 1. Luyện tập câu hỏi */}
              <div className="rounded-xl border border-line/70 bg-canvas/80 p-2.5">
                <div className="flex items-center justify-between gap-1 text-[11px] font-extrabold text-content">
                  <span className="flex items-center gap-1.5">
                    <Target className="size-3.5 text-blue-500 shrink-0" />
                    <span>{language === 'en' ? 'Question Practice' : 'Luyện tập câu hỏi'}</span>
                  </span>
                  <span className="font-black text-amber-600 dark:text-amber-400 tabular-nums">
                    +5 XP
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-content-muted">
                  <span>{language === 'en' ? 'Correct answer' : 'Trả lời đúng mỗi câu'}</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">+5 XP</span>
                </div>
                <div className="mt-0.5 flex items-center justify-between text-[10px] text-content-muted">
                  <span>{language === 'en' ? 'Incorrect answer (effort)' : 'Chưa đúng (khuyến khích)'}</span>
                  <span className="font-bold text-slate-500 dark:text-slate-400">+1 XP</span>
                </div>
              </div>

              {/* 2. Làm đề thi */}
              <div className="rounded-xl border border-line/70 bg-canvas/80 p-2.5">
                <div className="flex items-center justify-between gap-1 text-[11px] font-extrabold text-content">
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="size-3.5 text-purple-500 shrink-0" />
                    <span>{language === 'en' ? 'Test Practice' : 'Làm đề thi TOEIC'}</span>
                  </span>
                  <span className="font-black text-amber-600 dark:text-amber-400 tabular-nums">
                    +30 ~ 199 XP
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-content-muted">
                  <span>{language === 'en' ? 'Mini / Part practice' : 'Đề luyện ngắn / từng Part'}</span>
                  <span className="font-bold text-content">+30 XP</span>
                </div>
                <div className="mt-0.5 flex items-center justify-between text-[10px] text-content-muted">
                  <span>{language === 'en' ? 'Full Test 200 questions' : 'Đề thi Full Test 200 câu'}</span>
                  <span className="font-bold text-content">+100 XP + Điểm÷10</span>
                </div>
              </div>

              {/* 3. Mục tiêu ngày & Chuỗi Streak */}
              <div className="grid grid-cols-2 gap-1.5">
                <div className="rounded-xl border border-line/70 bg-canvas/80 p-2">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-content-muted">
                    <Clock className="size-3 text-emerald-500 shrink-0" />
                    <span>{language === 'en' ? 'Daily Goal' : 'Mục tiêu ngày'}</span>
                  </div>
                  <div className="mt-1 text-xs font-black text-amber-600 dark:text-amber-400 tabular-nums">
                    +25 XP
                  </div>
                  <p className="mt-0.5 text-[9px] text-content-subtle">
                    {language === 'en' ? 'Reach study time' : 'Đủ giờ học trong ngày'}
                  </p>
                </div>

                <div className="rounded-xl border border-line/70 bg-canvas/80 p-2">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-content-muted">
                    <Flame className="size-3 text-amber-500 shrink-0" />
                    <span>{language === 'en' ? 'Streak Bonus' : 'Mốc Streak'}</span>
                  </div>
                  <div className="mt-1 text-xs font-black text-amber-600 dark:text-amber-400 tabular-nums">
                    +50 ~ 500 XP
                  </div>
                  <p className="mt-0.5 text-[9px] text-content-subtle">
                    {language === 'en' ? '3, 7, 14, 30 days' : 'Mốc 3, 7, 14, 30 ngày'}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer notice */}
            <div className="mt-3 flex items-start gap-1.5 rounded-lg bg-surface border border-line/60 px-2.5 py-1.5 text-[10px] text-content-muted">
              <Info className="size-3.5 shrink-0 text-amber-500 mt-0.5" />
              <span>
                {language === 'en'
                  ? 'Accumulate XP to climb levels (Lv.1, Lv.2, ...) and rank higher on the leaderboard.'
                  : 'Cấp độ (Level) sẽ tự động thăng cấp khi bạn tích luỹ đủ tổng điểm XP.'}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
