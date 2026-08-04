import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { FeatureKey } from '../../config/features';
import { useAuth } from '../../context/AuthContext';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import { getUserRole } from '../../utils/rbac';

export const FeatureRouteGuard: React.FC<{ feature: FeatureKey }> = ({ feature }) => {
  const location = useLocation();
  const { user } = useAuth();
  const { isFeatureEnabled, isLoading } = useFeatureFlags();

  if (getUserRole(user) === 'admin') return <Outlet />;
  if (isLoading) {
    return (
      <div className="grid min-h-[45vh] place-items-center" role="status">
        <div className="w-full max-w-lg space-y-3" aria-hidden="true">
          <div className="h-8 w-2/5 animate-pulse rounded-xl bg-surface-hover motion-reduce:animate-none" />
          <div className="h-32 animate-pulse rounded-2xl bg-surface-hover motion-reduce:animate-none" />
        </div>
        <span className="sr-only">Đang kiểm tra quyền truy cập tính năng</span>
      </div>
    );
  }
  if (!isFeatureEnabled(feature)) {
    return (
      <Navigate
        to="/dashboard"
        replace
        state={{
          featureUnavailableMessage: 'Tính năng này hiện chưa khả dụng.',
          blockedPath: location.pathname,
        }}
      />
    );
  }
  return <Outlet />;
};
