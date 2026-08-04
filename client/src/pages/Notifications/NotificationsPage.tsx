import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Bell,
  BellOff,
  CheckCheck,
  RefreshCw,
} from 'lucide-react';
import { NotificationListItem } from '../../components/notifications/NotificationListItem';
import { useNotifications } from '../../context/NotificationContext';

type NotificationFilter = 'all' | 'unread';

export const NotificationsPage: React.FC = () => {
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    removeNotification,
  } = useNotifications();
  const [filter, setFilter] = useState<NotificationFilter>('all');

  const visibleNotifications = useMemo(
    () => filter === 'unread'
      ? notifications.filter((notification) => !notification.read)
      : notifications,
    [filter, notifications],
  );

  return (
    <div className="mx-auto min-w-0 max-w-4xl space-y-5 pb-12">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 inline-flex items-center gap-2 text-sm font-bold text-brand-600 dark:text-brand-300">
            <span className="grid size-8 place-items-center rounded-xl bg-brand-50 dark:bg-brand-500/10">
              <Bell className="size-4" aria-hidden="true" />
            </span>
            Trung tâm cập nhật
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 dark:text-content sm:text-3xl">
            Thông báo
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-content-muted">
            Theo dõi bài tập, kết quả học và những cập nhật quan trọng của tài khoản.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => void refreshNotifications()}
            disabled={isLoading}
            className="grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-brand-300 hover:text-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-500/10 disabled:cursor-wait disabled:opacity-60 dark:border-line dark:bg-surface dark:text-content-muted"
            aria-label="Làm mới thông báo"
            title="Làm mới"
          >
            <RefreshCw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => void markAllAsRead()}
            disabled={unreadCount === 0}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-bold text-brand-ink transition hover:bg-brand-hover focus:outline-none focus:ring-4 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-surface-elevated"
          >
            <CheckCheck className="size-4" aria-hidden="true" />
            Đọc tất cả
          </button>
        </div>
      </header>

      <section className="flex flex-col gap-3 rounded-2xl bg-slate-100/80 p-3 dark:bg-surface-elevated/70 sm:flex-row sm:items-center sm:justify-between" aria-label="Bộ lọc thông báo">
        <div className="inline-flex self-start rounded-xl bg-white p-1 shadow-sm dark:bg-surface">
          {([
            { id: 'all', label: `Tất cả (${notifications.length})` },
            { id: 'unread', label: `Chưa đọc (${unreadCount})` },
          ] as { id: NotificationFilter; label: string }[]).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              aria-pressed={filter === item.id}
              className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                filter === item.id
                  ? 'bg-brand text-brand-ink shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:text-content-muted dark:hover:text-content'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="px-1 text-xs font-medium text-slate-500 dark:text-content-muted">
          {unreadCount > 0 ? `Bạn còn ${unreadCount} thông báo chưa đọc.` : 'Bạn đã xem tất cả thông báo.'}
        </p>
      </section>

      {error && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200" role="alert">
          <span className="flex min-w-0 items-start gap-2">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span className="leading-relaxed">{error}</span>
          </span>
          <button type="button" onClick={() => void refreshNotifications()} className="shrink-0 font-bold underline underline-offset-2">
            Thử lại
          </button>
        </div>
      )}

      {isLoading && notifications.length === 0 ? (
        <div className="space-y-3" aria-label="Đang tải thông báo" aria-busy="true">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-[112px] animate-pulse rounded-2xl border border-slate-200 bg-white dark:border-line dark:bg-surface" />
          ))}
        </div>
      ) : visibleNotifications.length > 0 ? (
        <section className="space-y-3" aria-live="polite">
          {visibleNotifications.map((notification) => (
            <NotificationListItem
              key={notification.id}
              notification={notification}
              onRead={(notificationId) => void markAsRead(notificationId)}
              onDelete={(notificationId) => void removeNotification(notificationId)}
            />
          ))}
        </section>
      ) : (
        <section className="grid min-h-[320px] place-items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 text-center dark:border-line dark:bg-surface">
          <div className="max-w-sm">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
              {filter === 'unread'
                ? <CheckCheck className="size-6" aria-hidden="true" />
                : <BellOff className="size-6" aria-hidden="true" />}
            </span>
            <h2 className="mt-4 text-lg font-extrabold text-slate-950 dark:text-content">
              {filter === 'unread' ? 'Không còn thông báo chưa đọc' : 'Chưa có thông báo'}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-content-muted">
              {filter === 'unread'
                ? 'Các cập nhật mới sẽ được đánh dấu rõ ràng khi xuất hiện.'
                : 'Thông báo về bài tập và tiến độ học sẽ xuất hiện tại đây.'}
            </p>
          </div>
        </section>
      )}
    </div>
  );
};
