import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { FeatureKey, featureDefinitionByKey } from '../../config/features';
import { useAuth } from '../../context/AuthContext';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import { getUserRole } from '../../utils/rbac';
import { ComingSoonPage } from '../common/ComingSoonPage';

export const FeatureRouteGuard: React.FC<{ feature: FeatureKey }> = ({ feature }) => {
  const { user } = useAuth();
  const location = useLocation();
  const { isFeatureEnabled, isLoading, reload } = useFeatureFlags();
  const isAdmin = getUserRole(user) === 'admin';
  const [isCheckingRoute, setIsCheckingRoute] = useState(!isAdmin);

  useEffect(() => {
    if (isAdmin) {
      setIsCheckingRoute(false);
      return;
    }
    let active = true;
    setIsCheckingRoute(true);
    void reload().finally(() => {
      if (active) setIsCheckingRoute(false);
    });
    return () => { active = false; };
  }, [isAdmin, location.pathname, reload]);

  if (isAdmin) return <Outlet />;
  if (isLoading || isCheckingRoute) {
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
    const definition = featureDefinitionByKey.get(feature);
    if (!definition) return null;
    return <ComingSoonPage
      title={definition.name}
      description={`Trang ${definition.name} hiện đang được Giảng viên tạm đóng và sẽ sớm khả dụng trở lại.`}
      icon={definition.icon}
      actionLabel="Quay về Tổng quan"
      actionPath="/dashboard"
    />;
  }
  return <Outlet />;
};
