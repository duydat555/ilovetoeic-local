import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    placement: 'top' | 'bottom';
  }>({
    top: 0,
    left: 0,
    placement: 'bottom',
  });

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const tooltipWidth = Math.min(320, window.innerWidth - 24);
    const tooltipEstimatedHeight = 290;

    // Check vertical space
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeTop =
      side === 'top' ||
      (spaceBelow < tooltipEstimatedHeight && rect.top > tooltipEstimatedHeight);

    let top: number;
    if (placeTop) {
      top = rect.top - 8;
    } else {
      top = rect.bottom + 8;
    }

    let left: number;
    if (align === 'right') {
      left = rect.right - tooltipWidth;
    } else if (align === 'left') {
      left = rect.left;
    } else {
      left = rect.left + rect.width / 2 - tooltipWidth / 2;
    }

    // Clamp within viewport
    left = Math.max(12, Math.min(window.innerWidth - tooltipWidth - 12, left));

    setCoords({
      top,
      left,
      placement: placeTop ? 'top' : 'bottom',
    });
  }, [align, side]);

  const handleMouseEnter = useCallback(() => {
    clearTimer();
    updatePosition();
    setIsOpen(true);
  }, [clearTimer, updatePosition]);

  const handleMouseLeave = useCallback(() => {
    clearTimer();
    timerRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 220);
  }, [clearTimer]);

  const handleToggleClick = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      if (!isOpen) {
        updatePosition();
      }
      setIsOpen((prev) => !prev);
    },
    [isOpen, updatePosition],
  );

  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    const handleScrollOrResize = () => {
      updatePosition();
    };

    const handleDocumentClick = (event: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node) &&
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      document.removeEventListener('click', handleDocumentClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, updatePosition]);

  return (
    <>
      <div
        ref={triggerRef}
        className={`relative inline-flex items-center ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleMouseEnter}
        onBlur={handleMouseLeave}
        onClick={handleToggleClick}
        role="button"
        tabIndex={0}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        {children}
      </div>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <motion.div
                ref={tooltipRef}
                key="xp-explanation-tooltip"
                initial={{
                  opacity: 0,
                  y: coords.placement === 'top' ? 6 : -6,
                  scale: 0.97,
                }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{
                  opacity: 0,
                  y: coords.placement === 'top' ? 6 : -6,
                  scale: 0.97,
                }}
                transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  position: 'fixed',
                  top: coords.top,
                  left: coords.left,
                  transform:
                    coords.placement === 'top'
                      ? 'translateY(-100%)'
                      : undefined,
                  zIndex: 99999,
                }}
                className="w-80 max-w-[calc(100vw-24px)] rounded-2xl border border-line bg-surface p-4 shadow-2xl text-left select-none dark:bg-surface-elevated"
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
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
};
