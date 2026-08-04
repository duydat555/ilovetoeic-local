import React from 'react';
import { Link } from 'react-router-dom';
import {
  AlarmClock,
  BellRing,
  ClipboardCheck,
  Trash2,
  Trophy,
} from 'lucide-react';
import { NotificationItem, NotificationType } from '../../types';
import { formatNotificationTime } from '../../utils/notifications';

const notificationVisual: Record<NotificationType, {
  icon: React.ElementType;
  container: string;
  label: string;
}> = {
  homework: {
    icon: ClipboardCheck,
    container: 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300',
    label: 'Bài tập',
  },
  achievement: {
    icon: Trophy,
    container: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
    label: 'Thành tích',
  },
  reminder: {
    icon: AlarmClock,
    container: 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300',
    label: 'Nhắc nhở',
  },
  system: {
    icon: BellRing,
    container: 'bg-slate-100 text-slate-600 dark:bg-surface-elevated dark:text-content-muted',
    label: 'Hệ thống',
  },
};

interface NotificationListItemProps {
  notification: NotificationItem;
  compact?: boolean;
  onRead: (notificationId: string) => void;
  onDelete?: (notificationId: string) => void;
  onNavigate?: () => void;
}

export const NotificationListItem: React.FC<NotificationListItemProps> = ({
  notification,
  compact = false,
  onRead,
  onDelete,
  onNavigate,
}) => {
  const visual = notificationVisual[notification.type] || notificationVisual.system;
  const Icon = visual.icon;
  const destination = notification.actionUrl || '/notifications';

  return (
    <article
      className={`group relative overflow-hidden transition-colors duration-200 ${
        notification.read
          ? 'bg-transparent hover:bg-slate-50 dark:hover:bg-surface-hover/60'
          : 'bg-brand-50/55 hover:bg-brand-50 dark:bg-brand-500/[0.07] dark:hover:bg-brand-500/10'
      } ${compact ? '' : 'rounded-2xl border border-slate-200 dark:border-line'}`}
    >
      <Link
        to={destination}
        onClick={() => {
          onRead(notification.id);
          onNavigate?.();
        }}
        className={`flex min-w-0 items-start gap-3 outline-none transition focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500 ${
          compact ? 'px-4 py-3.5' : 'p-4 pr-14 sm:p-5 sm:pr-16'
        }`}
      >
        <span className={`grid shrink-0 place-items-center rounded-xl ${visual.container} ${compact ? 'size-9' : 'size-10'}`}>
          <Icon className="size-[18px]" aria-hidden="true" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-2">
            <span className={`min-w-0 flex-1 truncate text-sm text-slate-950 dark:text-content ${notification.read ? 'font-semibold' : 'font-extrabold'}`}>
              {notification.title}
            </span>
            {!notification.read && (
              <span className="size-2 shrink-0 rounded-full bg-brand" aria-label="Chưa đọc" />
            )}
          </span>
          <span className={`mt-1 block text-xs leading-relaxed text-slate-500 dark:text-content-muted ${compact ? 'line-clamp-2' : 'line-clamp-3'}`}>
            {notification.message}
          </span>
          <span className="mt-2 flex items-center gap-2 text-[11px] font-medium text-slate-400 dark:text-content-muted">
            <span>{visual.label}</span>
            <span aria-hidden="true">·</span>
            <time dateTime={notification.createdAt}>{formatNotificationTime(notification.createdAt)}</time>
          </span>
        </span>
      </Link>

      {onDelete && (
        <button
          type="button"
          onClick={() => onDelete(notification.id)}
          className="absolute right-3 top-3 grid size-8 place-items-center rounded-lg text-slate-400 opacity-100 transition hover:bg-rose-50 hover:text-rose-600 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-rose-500/20 dark:hover:bg-rose-500/10 sm:right-4 sm:top-4 sm:opacity-0 sm:group-hover:opacity-100"
          aria-label={`Xóa thông báo: ${notification.title}`}
          title="Xóa thông báo"
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
      )}
    </article>
  );
};
