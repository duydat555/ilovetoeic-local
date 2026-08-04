import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ADMIN_FEATURE_STATUS, AdminFeatureStatus } from '../config/adminFeatureStatus';
import { useAuth } from './AuthContext';
import { backendService } from '../services/backend';
import { getUserRole } from '../utils/rbac';

const STORAGE_KEY = 'toeic_admin_feature_statuses_v1';

const getInitialStatuses = (): Record<string, AdminFeatureStatus> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, AdminFeatureStatus>;
      return { ...ADMIN_FEATURE_STATUS, ...parsed };
    }
  } catch {
    // Ignore storage parse errors
  }
  return ADMIN_FEATURE_STATUS;
};

interface AdminFeatureStatusContextValue {
  statuses: Record<string, AdminFeatureStatus>;
  isLoading: boolean;
  getStatus: (route: string) => AdminFeatureStatus | undefined;
  refreshStatuses: () => Promise<void>;
}

const AdminFeatureStatusContext = createContext<AdminFeatureStatusContextValue>({
  statuses: ADMIN_FEATURE_STATUS,
  isLoading: false,
  getStatus: (route) => ADMIN_FEATURE_STATUS[route],
  refreshStatuses: async () => {},
});

export const AdminFeatureStatusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [statuses, setStatuses] = useState<Record<string, AdminFeatureStatus>>(getInitialStatuses);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || getUserRole(user) !== 'admin') {
      setStatuses(ADMIN_FEATURE_STATUS);
      setIsLoading(false);
      return;
    }
    let active = true;
    // Stale-While-Revalidate: Cập nhật trạng thái ngầm từ backend mà không làm chặn UI
    void backendService.getAdminFeatureStatuses()
      .then((items) => {
        if (!active) return;
        const newStatuses = items.reduce((result, item) => ({ ...result, [item.route]: item }), { ...ADMIN_FEATURE_STATUS });
        setStatuses(newStatuses);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newStatuses));
        } catch {
          // Ignore storage write errors
        }
      })
      .catch((error) => console.warn('[Admin feature status] Sử dụng cấu hình dự phòng:', error));

    return () => { active = false; };
  }, [isAuthenticated, user]);

  const refreshStatuses = async () => {
    try {
      const items = await backendService.getAdminFeatureStatuses();
      const newStatuses = items.reduce((result, item) => ({ ...result, [item.route]: item }), { ...ADMIN_FEATURE_STATUS });
      setStatuses(newStatuses);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newStatuses));
    } catch (error) {
      console.warn('[Admin feature status] Lỗi khi làm mới:', error);
    }
  };

  const value = useMemo<AdminFeatureStatusContextValue>(() => ({
    statuses,
    isLoading,
    getStatus: (route) => statuses[route],
    refreshStatuses,
  }), [isLoading, statuses]);

  return <AdminFeatureStatusContext.Provider value={value}>{children}</AdminFeatureStatusContext.Provider>;
};

export const useAdminFeatureStatus = () => useContext(AdminFeatureStatusContext);

