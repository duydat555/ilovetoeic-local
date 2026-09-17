import React from 'react';
import { Outlet } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
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

  // Admin luôn có quyền truy cập tất cả trang để quản lý và kiểm tra
  if (isAdmin) {
    if (!isFeatureEnabled(feature)) {
      const definition = featureDefinitionByKey.get(feature);
      return (
        <div className="flex-1 flex flex-col min-w-0">
          <div className="mx-auto my-3 w-full max-w-[1400px] px-3 sm:px-4">
            <div className="flex items-center gap-3 rounded-2xl border border-amber-300/80 bg-amber-50/90 p-3.5 text-amber-900 shadow-sm dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200">
              <AlertTriangle className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
              <p className="text-xs leading-relaxed font-semibold">
                <span className="font-extrabold uppercase tracking-wide">Chế độ Giáo viên:</span> Tính năng <span className="underline font-bold">{definition?.name || feature}</span> hiện đang <span className="font-extrabold text-red-600 dark:text-red-400">ĐÃ TẮT</span> trên toàn hệ thống (học sinh không thể truy cập). Bạn vẫn có thể xem nội dung vì là Giáo viên.
              </p>
            </div>
          </div>
          <Outlet />
        </div>
      );
    }
    return <Outlet />;
  }

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
