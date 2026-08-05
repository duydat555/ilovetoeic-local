import React from 'react';
import { Outlet } from 'react-router-dom';
import { FeatureKey, featureDefinitionByKey } from '../../config/features';
import { useAuth } from '../../context/AuthContext';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import { getUserRole } from '../../utils/rbac';
import { ComingSoonPage } from '../common/ComingSoonPage';
import { BoneyardSkeleton } from '../common/BoneyardSkeleton';

export const FeatureRouteGuard: React.FC<{ feature: FeatureKey }> = ({ feature }) => {
  const { user } = useAuth();
  const { isFeatureEnabled, isLoading } = useFeatureFlags();
  const isAdmin = getUserRole(user) === 'admin';

  // Admin luôn có quyền truy cập tất cả trang
  if (isAdmin) return <Outlet />;

  // Nếu trạng thái tính năng chưa tải xong khi vừa mở Web (lần đầu)
  if (isLoading) {
    return (
      <div className="grid min-h-[45vh] place-items-center" role="status">
        <div className="w-full max-w-lg space-y-3" aria-hidden="true">
          <BoneyardSkeleton name="feature-guard-title" height={32} width="40%" />
          <BoneyardSkeleton name="feature-guard-body" height={128} />
        </div>
        <span className="sr-only">Đang kiểm tra quyền truy cập tính năng</span>
      </div>
    );
  }

  // Kiểm tra ngay lập tức trạng thái tính năng từ bộ nhớ toàn cục (0ms delay)
  if (!isFeatureEnabled(feature)) {
    const definition = featureDefinitionByKey.get(feature);
    if (!definition) return null;
    return (
      <ComingSoonPage
        title={definition.name}
        description={`Trang ${definition.name} hiện đang được Giảng viên tạm đóng / phát triển và sẽ sớm khả dụng trở lại.`}
        icon={definition.icon}
        actionLabel="Quay về Tổng quan"
        actionPath="/dashboard"
      />
    );
  }

  return <Outlet />;
};
