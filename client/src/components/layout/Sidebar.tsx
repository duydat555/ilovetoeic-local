import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink } from 'react-router-dom';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import {
  ChevronRight,
  ShieldCheck,
  Target,
} from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';
import { BrandName } from '../common/BrandName';
import { useAuth } from '../../context/AuthContext';
import { NavigationItem, studentNavItems } from '../../config/navigation';
import { useAdminFeatureStatus } from '../../context/AdminFeatureStatusContext';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import { getUserRole } from '../../utils/rbac';

export interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  items?: NavigationItem[];
  homePath?: string;
  contextLabel?: string;
  showGoalCard?: boolean;
}

interface RippleState {
  id: number;
  path: string;
  x: number;
  y: number;
}

interface TooltipState {
  label: string;
  left: number;
  top: number;
}

export const navItems = studentNavItems;

const sidebarTransition = {
  type: 'spring' as const,
  stiffness: 360,
  damping: 34,
  mass: 0.8,
};

const useCountUp = (target: number, duration = 750) => {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target);
      return undefined;
    }

    const startedAt = performance.now();
    let frame = 0;

    const update = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(update);
    };

    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [duration, target]);

  return value;
};

const GoalCard: React.FC<{ collapsed: boolean }> = ({ collapsed }) => {
  const { user } = useAuth();
  const targetScore = Number(user?.targetScore) > 0 ? Number(user?.targetScore) : 750;
  const currentScore = Math.max(0, Number(user?.currentScore) || 0);
  const hasScore = currentScore > 0;
  const animatedScore = useCountUp(currentScore);
  const progress = Math.min(100, Math.max(0, (currentScore / targetScore) * 100));

  return (
    <div className="border-t border-line p-3">
      <AnimatePresence initial={false} mode="wait">
        {collapsed ? (
          <motion.div
            key="collapsed-goal"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.16 }}
            className="group/goal relative mx-auto flex size-12 items-center justify-center"
          >
            <div
              className="grid size-11 place-items-center rounded-full p-[3px] shadow-sm"
              style={{
                background: `conic-gradient(#ffc72c ${progress * 3.6}deg, #e2e8f0 0deg)`,
              }}
              aria-label={hasScore
                ? `Mục tiêu TOEIC: đã đạt ${currentScore} trên ${targetScore} điểm`
                : `Mục tiêu TOEIC: chưa có kết quả, mục tiêu ${targetScore} điểm`}
            >
                <span className="grid size-full place-items-center rounded-full bg-sidebar text-accent-strong">
                <Target className="size-4" aria-hidden="true" />
              </span>
            </div>
            <span className="pointer-events-none absolute left-[calc(100%+12px)] top-1/2 z-50 w-max -translate-y-1/2 rounded-lg bg-slate-950 px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-xl transition duration-150 group-hover/goal:translate-x-1 group-hover/goal:opacity-100 dark:bg-white dark:text-slate-950">
              {hasScore ? `Mục tiêu: ${currentScore}/${targetScore}` : `Chưa có điểm · Mục tiêu ${targetScore}`}
            </span>
          </motion.div>
        ) : (
          <motion.div
            key="expanded-goal"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden rounded-2xl border border-line bg-surface-elevated p-3.5 shadow-[0_14px_30px_-22px_rgba(138,94,21,0.75)] transition-colors duration-300 dark:shadow-none"
          >
            <div className="flex min-w-0 items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-xs font-extrabold text-content">
                  Mục tiêu TOEIC
                </p>
                <p className="mt-1 whitespace-nowrap text-[11px] font-semibold text-content-muted">
                {hasScore ? (
                  <>Đã đạt: <span className="text-accent-strong">{animatedScore}</span>/{targetScore}</>
                ) : (
                  <>Chưa có điểm thi thử · Mục tiêu {targetScore}</>
                )}
                </p>
              </div>
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface text-xs font-black text-accent-strong shadow-sm ring-1 ring-line dark:shadow-none">
                {targetScore}
              </span>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-hover">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="h-full rounded-full bg-gradient-to-r from-brand to-brand-400"
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[10px] font-bold text-content-muted">
              <span>{Math.round(progress)}% hoàn thành</span>
              <span>{hasScore ? `Còn ${Math.max(0, targetScore - currentScore)} điểm` : 'Chưa có kết quả thi'}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggleCollapse,
  items = studentNavItems,
  homePath = '/dashboard',
  contextLabel,
  showGoalCard = true,
}) => {
  const { user } = useAuth();
  const role = getUserRole(user);
  const { getStatus } = useAdminFeatureStatus();
  const { isFeatureEnabled } = useFeatureFlags();
  const [ripple, setRipple] = useState<RippleState | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const sidebarWidth = collapsed ? 80 : 280;
  const visibleItems = items;
  const accessibleLabels = useMemo(
    () => visibleItems.map((item) => item.label).join(', '),
    [visibleItems],
  );

  const startRipple = (
    event: React.PointerEvent<HTMLAnchorElement>,
    path: string,
  ) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    setRipple({
      id: Date.now(),
      path,
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });
  };

  const showTooltip = (
    element: HTMLAnchorElement,
    label: string,
  ) => {
    if (!collapsed) return;
    const bounds = element.getBoundingClientRect();
    setTooltip({
      label,
      left: bounds.right + 12,
      top: bounds.top + bounds.height / 2,
    });
  };

  useEffect(() => {
    if (!collapsed) setTooltip(null);
  }, [collapsed]);

  return (
    <>
      <motion.aside
      initial={{ opacity: 0, x: -16, width: sidebarWidth }}
      animate={{ opacity: 1, x: 0, width: sidebarWidth }}
      transition={{
        opacity: { duration: 0.24 },
        x: { duration: 0.28, ease: 'easeOut' },
        width: sidebarTransition,
      }}
      style={{ willChange: 'width' }}
      className="relative top-0 z-40 hidden h-screen shrink-0 flex-col border-r border-line bg-sidebar/95 shadow-[10px_0_34px_-28px_rgba(15,23,42,0.45)] backdrop-blur-xl transition-colors duration-300 dark:shadow-none md:sticky md:flex"
      aria-label={`Điều hướng chính: ${accessibleLabels}`}
    >
      <div
        className={`flex h-[76px] shrink-0 items-center border-b border-line ${
          collapsed ? 'justify-center px-3' : 'px-4'
        }`}
      >
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.28, ease: 'easeOut' }}
          whileHover={{ y: -1 }}
          className={`min-w-0 ${collapsed ? '' : 'flex-1'}`}
        >
          <NavLink
            to={homePath}
            aria-label="ilovetoeic - Tổng quan"
            className={`group/brand flex min-w-0 items-center ${
              collapsed ? 'justify-center' : 'gap-3'
            }`}
          >
            <BrandLogo className="size-12 shrink-0 rounded-2xl shadow-md ring-1 ring-slate-200/70 transition duration-200 group-hover/brand:scale-105 group-hover/brand:shadow-lg dark:ring-white/10" />
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.span
                  key="brand-copy"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.17 }}
                  className="min-w-0 overflow-hidden"
                >
                  <BrandName className="rounded-md bg-white px-1.5 text-lg font-extrabold leading-tight tracking-tight shadow-sm" />
                  <span className="block truncate text-[10px] font-bold uppercase tracking-[0.16em] text-content-muted">
                    Learning Hub
                  </span>
                </motion.span>
              )}
            </AnimatePresence>
          </NavLink>
        </motion.div>
      </div>

      <motion.button
        type="button"
        onClick={onToggleCollapse}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.92 }}
        aria-label={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
        aria-expanded={!collapsed}
        className="absolute -right-3 top-[27px] z-50 grid size-7 place-items-center rounded-full border border-line bg-surface text-content-muted shadow-md transition-colors duration-300 hover:border-accent/40 hover:bg-surface-hover hover:text-accent-strong dark:shadow-none"
      >
        <motion.span
          animate={{ rotate: collapsed ? 0 : 180 }}
          transition={sidebarTransition}
        >
          <ChevronRight className="size-4" />
        </motion.span>
      </motion.button>

      <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-visible px-3 py-4">
        <LayoutGroup id="sidebar-active-navigation">
          <ul className="space-y-1.5">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.path} className="group/item relative">
                  <NavLink
                    to={item.path}
                    end={item.end}
                    onPointerDown={(event) => startRipple(event, item.path)}
                    onMouseEnter={(event) => showTooltip(event.currentTarget, item.label)}
                    onMouseLeave={() => setTooltip(null)}
                    onFocus={(event) => showTooltip(event.currentTarget, item.label)}
                    onBlur={() => setTooltip(null)}
                    aria-label={collapsed ? item.label : undefined}
                    className={({ isActive }) => (
                      `relative flex h-11 min-w-0 items-center rounded-xl text-[13px] font-bold outline-none transition-colors duration-200 ${
                        collapsed ? 'justify-center px-0' : 'gap-3 px-3'
                      } ${
                        isActive
                          ? 'text-brand-700 dark:text-content'
                          : 'text-content-muted hover:bg-surface-hover hover:text-content'
                      }`
                    )}
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <motion.span
                            layoutId="sidebar-active-indicator"
                            className="absolute inset-0 rounded-xl border border-accent/25 bg-gradient-to-r from-brand-100 via-brand-50 to-brand-50 shadow-[0_8px_20px_-14px_rgba(138,94,21,0.9)] dark:from-brand-700/45 dark:via-brand-600/25 dark:to-brand-hover/20 dark:shadow-none"
                            transition={sidebarTransition}
                          />
                        )}

                        <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
                          <AnimatePresence>
                            {ripple?.path === item.path && (
                              <motion.span
                                key={ripple.id}
                                initial={{ opacity: 0.28, scale: 0 }}
                                animate={{ opacity: 0, scale: 8 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.45, ease: 'easeOut' }}
                                onAnimationComplete={() => {
                                  setRipple((current) => (
                                    current?.id === ripple.id ? null : current
                                  ));
                                }}
                                className={`absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full ${
                                  isActive ? 'bg-brand-500/35' : 'bg-slate-400/30'
                                }`}
                                style={{ left: ripple.x, top: ripple.y }}
                              />
                            )}
                          </AnimatePresence>
                        </span>

                        <motion.span
                          animate={{
                            scale: isActive ? 1.1 : 1,
                            x: isActive ? 1 : 0,
                          }}
                          transition={sidebarTransition}
                          className={`relative z-10 grid size-5 shrink-0 place-items-center transition-transform duration-200 ${
                            isActive
                    ? 'text-accent-strong'
                              : 'group-hover/item:translate-x-1'
                          }`}
                        >
                          <Icon className="size-5" aria-hidden="true" />
                        </motion.span>

                        <AnimatePresence initial={false}>
                          {!collapsed && (
                            <motion.span
                              key={`${item.path}-label`}
                              initial={{ opacity: 0, x: -7 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -7 }}
                              transition={{ duration: 0.16 }}
                              className="relative z-10 flex min-w-0 flex-1 items-center gap-2 whitespace-nowrap"
                            >
                              <span className="min-w-0 flex-1 truncate">{item.label}</span>
                              {(role === 'admin'
                                ? getStatus(item.path)?.status === 'coming_soon'
                                : Boolean(item.featureKey && !isFeatureEnabled(item.featureKey))) && (
                                <span className="shrink-0 rounded-full border border-accent/25 bg-accent/10 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-accent-strong dark:text-brand-300">
                                  Sắp có
                                </span>
                              )}
                            </motion.span>
                          )}
                        </AnimatePresence>

                      </>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </LayoutGroup>
      </nav>

      {showGoalCard ? (
        <GoalCard collapsed={collapsed} />
      ) : (
        <div className="border-t border-line p-3">
          <div className={`rounded-2xl border border-accent/20 bg-accent/10 text-accent-strong ${collapsed ? 'grid size-12 place-items-center p-0' : 'p-3'}`}>
            {collapsed ? (
              <ShieldCheck className="size-5" aria-label={contextLabel} />
            ) : (
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-xl bg-accent/15">
                  <ShieldCheck className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-extrabold text-content">{contextLabel}</p>
                  <p className="mt-0.5 text-[10px] font-semibold text-content-muted">Quản lý theo phân quyền</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      </motion.aside>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {tooltip && (
            <motion.span
              key={tooltip.label}
              initial={{ opacity: 0, x: -5, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -3, scale: 0.98 }}
              transition={{ duration: 0.14, ease: 'easeOut' }}
              className="pointer-events-none fixed z-[100] w-max -translate-y-1/2 rounded-lg bg-slate-950 px-2.5 py-1.5 text-xs font-semibold text-white shadow-xl dark:bg-white dark:text-slate-950"
              style={{ left: tooltip.left, top: tooltip.top }}
              role="tooltip"
            >
              {tooltip.label}
            </motion.span>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
};
