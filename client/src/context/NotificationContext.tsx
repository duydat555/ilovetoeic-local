import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { NotificationItem } from '../types';
import { backendService } from '../services/backend';
import { useAuth } from './AuthContext';

interface NotificationContextValue {
  notifications: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  refreshNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  removeNotification: (notificationId: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

const messageFromError = (error: unknown) => (
  error instanceof Error
    ? error.message
    : 'Không thể đồng bộ thông báo. Vui lòng thử lại.'
);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async (showLoading: boolean) => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setError(null);
      setIsLoading(false);
      return;
    }
    if (showLoading) setIsLoading(true);
    try {
      const response = await backendService.getNotifications();
      setNotifications(response.data);
      setUnreadCount(response.unreadCount);
      setError(null);
    } catch (requestError) {
      setError(messageFromError(requestError));
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [user]);

  const refreshNotifications = useCallback(
    () => fetchNotifications(true),
    [fetchNotifications],
  );

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setError(null);
      return undefined;
    }

    void fetchNotifications(true);
    const intervalId = window.setInterval(() => {
      void fetchNotifications(false);
    }, 60_000);
    const refreshOnFocus = () => void fetchNotifications(false);
    window.addEventListener('focus', refreshOnFocus);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshOnFocus);
    };
  }, [fetchNotifications, user]);

  const markAsRead = useCallback(async (notificationId: string) => {
    const target = notifications.find((item) => item.id === notificationId);
    if (!target || target.read) return;
    const readAt = new Date().toISOString();
    setNotifications((items) => items.map((item) => (
      item.id === notificationId ? { ...item, read: true, readAt } : item
    )));
    setUnreadCount((count) => Math.max(0, count - 1));
    try {
      await backendService.markNotificationRead(notificationId);
      setError(null);
    } catch (requestError) {
      setError(messageFromError(requestError));
      await fetchNotifications(false);
    }
  }, [fetchNotifications, notifications]);

  const markAllAsRead = useCallback(async () => {
    if (unreadCount === 0) return;
    const readAt = new Date().toISOString();
    setNotifications((items) => items.map((item) => ({ ...item, read: true, readAt })));
    setUnreadCount(0);
    try {
      await backendService.markAllNotificationsRead();
      setError(null);
    } catch (requestError) {
      setError(messageFromError(requestError));
      await fetchNotifications(false);
    }
  }, [fetchNotifications, unreadCount]);

  const removeNotification = useCallback(async (notificationId: string) => {
    const target = notifications.find((item) => item.id === notificationId);
    if (!target) return;
    setNotifications((items) => items.filter((item) => item.id !== notificationId));
    if (!target.read) setUnreadCount((count) => Math.max(0, count - 1));
    try {
      await backendService.deleteNotification(notificationId);
      setError(null);
    } catch (requestError) {
      setError(messageFromError(requestError));
      await fetchNotifications(false);
    }
  }, [fetchNotifications, notifications]);

  const value = useMemo<NotificationContextValue>(() => ({
    notifications,
    unreadCount,
    isLoading,
    error,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    removeNotification,
  }), [
    error,
    isLoading,
    markAllAsRead,
    markAsRead,
    notifications,
    refreshNotifications,
    removeNotification,
    unreadCount,
  ]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
