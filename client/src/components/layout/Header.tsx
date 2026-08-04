import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  AlertCircle,
  ArrowRight,
  Bell,
  CheckCheck,
  Flame,
  LogOut,
  Menu,
  Moon,
  RefreshCw,
  Search,
  Sun,
  UserRound,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { getUserRole, ROLE_LABELS } from '../../utils/rbac';
import { useNotifications } from '../../context/NotificationContext';
import { NotificationListItem } from '../notifications/NotificationListItem';
import { getDiceBearAvatar } from '../../utils/avatar';

interface HeaderProps {
  onOpenMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu }) => {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const {
    notifications,
    unreadCount,
    isLoading: notificationsLoading,
    error: notificationsError,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const notificationsMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const role = getUserRole(user);
  const searchPlaceholder = role === 'student'
    ? 'Tìm kiếm bài tập, từ vựng, ngữ pháp...'
    : 'Tìm lớp, học sinh hoặc bài tập...';

  useEffect(() => {
    const closeMenus = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowNotifications(false);
        setShowUserMenu(false);
      }
    };
    window.addEventListener('keydown', closeMenus);
    return () => window.removeEventListener('keydown', closeMenus);
  }, []);

  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!notificationsMenuRef.current?.contains(target)) setShowNotifications(false);
      if (!userMenuRef.current?.contains(target)) setShowUserMenu(false);
    };
    window.addEventListener('pointerdown', closeOnOutsideClick);
    return () => window.removeEventListener('pointerdown', closeOnOutsideClick);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between gap-4 border-b border-line bg-surface/80 px-4 backdrop-blur-2xl transition-colors duration-300 md:px-7">
      {/* Mobile Menu Trigger & Search */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <button
          onClick={onOpenMobileMenu}
          aria-label="Mở menu di động"
          className="rounded-lg p-2 text-content-muted transition-colors duration-300 hover:bg-surface-hover hover:text-content md:hidden"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div className="relative w-full hidden sm:block group">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-content-muted" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            className="w-full rounded-2xl border border-line bg-surface-elevated/70 py-2.5 pl-10 pr-4 text-sm text-content shadow-sm transition-all duration-300 placeholder:text-content-muted hover:bg-surface-hover focus:border-accent focus:ring-4 focus:ring-accent/10 dark:shadow-none"
          />
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Streak Counter */}
        {user && role === 'student' && (
          <div
            className="flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-600 shadow-sm dark:text-amber-400 sm:text-sm"
            role="status"
            aria-live="polite"
            title={`Chuỗi học hiện tại: ${user.streakDays} ngày`}
          >
            <Flame className="w-4 h-4 fill-amber-500 text-amber-500" />
            <span className="inline-flex items-center gap-1">
              <AnimatePresence initial={false} mode="popLayout">
                <motion.span
                  key={user.streakDays}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                  {user.streakDays}
                </motion.span>
              </AnimatePresence>
              <span>ngày</span>
            </span>
          </div>
        )}

        {/* Theme Toggle Button */}
        <motion.button
          onClick={toggleTheme}
          whileTap={{ scale: 0.9 }}
          aria-label={isDarkMode ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
          aria-pressed={isDarkMode}
          className="grid size-10 place-items-center rounded-xl text-content-muted transition-colors duration-300 hover:bg-surface-hover hover:text-content"
        >
          <AnimatePresence initial={false} mode="wait">
            <motion.span
              key={isDarkMode ? 'sun' : 'moon'}
              initial={{ opacity: 0, rotate: -45, scale: 0.65 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: 45, scale: 0.65 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
            >
              {isDarkMode
                ? <Sun className="size-5 text-amber-400" />
                : <Moon className="size-5 text-slate-600" />}
            </motion.span>
          </AnimatePresence>
        </motion.button>

        {/* Notification Dropdown */}
        <div className="relative" ref={notificationsMenuRef}>
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
            }}
            aria-label={unreadCount > 0 ? `Thông báo, ${unreadCount} chưa đọc` : 'Thông báo'}
            aria-expanded={showNotifications}
            aria-controls="header-notification-panel"
            className={`relative rounded-xl p-2.5 transition-colors duration-200 hover:bg-surface-hover hover:text-content ${showNotifications ? 'bg-surface-hover text-content' : 'text-content-muted'}`}
          >
            <Bell className="w-5 h-5" />
            <AnimatePresence initial={false}>
              {unreadCount > 0 && (
                <motion.span
                  key="notification-count"
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="absolute -right-0.5 -top-0.5 grid min-h-4 min-w-4 place-items-center rounded-full border-2 border-surface bg-brand px-0.5 text-[9px] font-black leading-none text-brand-ink"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          <AnimatePresence initial={false}>
            {showNotifications && (
              <motion.section
                id="header-notification-panel"
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.985 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="fixed inset-x-3 top-[66px] z-50 overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_24px_70px_-28px_rgba(15,23,42,0.55)] dark:shadow-none sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-[25rem]"
                aria-label="Danh sách thông báo gần đây"
              >
                <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3.5">
                  <div className="min-w-0">
                    <h2 className="text-sm font-extrabold text-content">Thông báo</h2>
                    <p className="mt-0.5 text-[11px] font-medium text-content-muted">
                      {unreadCount > 0 ? `${unreadCount} cập nhật chưa đọc` : 'Bạn đã xem tất cả cập nhật'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void markAllAsRead()}
                    disabled={unreadCount === 0}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-bold text-accent-strong transition hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:text-content-muted disabled:opacity-60 dark:hover:bg-brand-500/10"
                  >
                    <CheckCheck className="size-3.5" aria-hidden="true" />
                    Đọc tất cả
                  </button>
                </header>

                {notificationsError && (
                  <div className="flex items-start justify-between gap-3 border-b border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200" role="alert">
                    <span className="flex min-w-0 items-start gap-2">
                      <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                      <span className="line-clamp-2 leading-relaxed">{notificationsError}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => void refreshNotifications()}
                      className="grid size-7 shrink-0 place-items-center rounded-lg hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-500/20 dark:hover:bg-rose-500/10"
                      aria-label="Thử tải lại thông báo"
                    >
                      <RefreshCw className="size-3.5" aria-hidden="true" />
                    </button>
                  </div>
                )}

                <div className="max-h-[min(25rem,calc(100dvh-10rem))] overflow-y-auto overscroll-contain divide-y divide-slate-100 dark:divide-line/70">
                  {notificationsLoading && notifications.length === 0 ? (
                    <div className="space-y-3 p-4" aria-label="Đang tải thông báo" aria-busy="true">
                      {[0, 1, 2].map((item) => (
                        <div key={item} className="h-[76px] animate-pulse rounded-xl bg-slate-100 dark:bg-surface-elevated" />
                      ))}
                    </div>
                  ) : notifications.length > 0 ? (
                    notifications.slice(0, 5).map((notification) => (
                      <NotificationListItem
                        key={notification.id}
                        notification={notification}
                        compact
                        onRead={(notificationId) => void markAsRead(notificationId)}
                        onNavigate={() => setShowNotifications(false)}
                      />
                    ))
                  ) : (
                    <div className="grid min-h-40 place-items-center px-6 py-8 text-center">
                      <div>
                        <span className="mx-auto grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-400 dark:bg-surface-elevated dark:text-content-muted">
                          <Bell className="size-5" aria-hidden="true" />
                        </span>
                        <p className="mt-3 text-sm font-bold text-content">Chưa có thông báo</p>
                        <p className="mt-1 text-xs leading-relaxed text-content-muted">Cập nhật học tập mới sẽ xuất hiện tại đây.</p>
                      </div>
                    </div>
                  )}
                </div>

                <Link
                  to="/notifications"
                  onClick={() => setShowNotifications(false)}
                  className="flex items-center justify-center gap-2 border-t border-line px-4 py-3 text-xs font-bold text-accent-strong transition hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500/20"
                >
                  Xem tất cả thông báo
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </motion.section>
            )}
          </AnimatePresence>
        </div>

        {/* User Account Menu */}
        {user ? (
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => {
                setShowUserMenu(!showUserMenu);
                setShowNotifications(false);
              }}
              aria-label="Menu tài khoản"
              className="flex items-center gap-2 rounded-xl p-1 transition-colors duration-300 hover:bg-surface-hover"
            >
              <img
                src={user.avatar || getDiceBearAvatar(user.name)}
                alt={user.name}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-brand/20"
              />
              <span className="hidden max-w-[120px] truncate text-sm font-semibold text-content lg:block">
                {user.name}
              </span>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 z-50 mt-2 w-56 rounded-2xl border border-line bg-surface py-2 shadow-xl dark:shadow-none">
                <div className="border-b border-line px-4 py-2">
                  <div className="truncate text-sm font-semibold text-content">{user.name}</div>
                  <div className="truncate text-xs text-content-muted">{user.email}</div>
                  <div className="mt-2 inline-flex rounded-full bg-brand-50 px-2.5 py-1 text-[10px] font-extrabold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                    {ROLE_LABELS[role]}
                  </div>
                </div>
                <Link
                  to="/profile"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-content transition-colors duration-300 hover:bg-surface-hover"
                >
                  <UserRound className="w-4 h-4" />
                  <span>Hồ sơ cá nhân</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-negative transition-colors duration-300 hover:bg-negative/10"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link
            to="/login"
            className="px-4 py-2 text-sm font-semibold text-brand-ink bg-brand hover:bg-brand-hover rounded-xl transition-colors shadow-sm"
          >
            Đăng nhập
          </Link>
        )}
      </div>
    </header>
  );
};
