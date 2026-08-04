export type AdminFeatureState = 'ready' | 'coming_soon';

export interface AdminFeatureStatus {
  route: string;
  status: AdminFeatureState;
  title: string;
  description: string;
  iconKey: 'chart' | 'school' | 'clipboard' | 'users' | 'wrench' | 'user' | 'settings';
  actionLabel?: string | null;
  actionPath?: string | null;
}

export const ADMIN_FEATURE_STATUS: Record<string, AdminFeatureStatus> = {
  '/admin/overview': {
    route: '/admin/overview', status: 'coming_soon', title: 'Thống kê hệ thống', iconKey: 'chart',
    description: 'Trang Thống kê hệ thống sẽ sớm ra mắt với các báo cáo chi tiết về hiệu suất học tập toàn hệ thống.',
  },
  '/admin/classes': { route: '/admin/classes', status: 'ready', title: 'Quản lý lớp học', iconKey: 'school', description: 'Quản lý lớp học và học viên.' },
  '/admin/homework': { route: '/admin/homework', status: 'ready', title: 'Bài tập về nhà', iconKey: 'clipboard', description: 'Tạo và theo dõi bài tập về nhà.' },
  '/admin/accounts': { route: '/admin/accounts', status: 'ready', title: 'Quản lý tài khoản', iconKey: 'users', description: 'Quản lý tài khoản học viên.' },
  '/admin/features': {
    route: '/admin/features', status: 'ready', title: 'Quản lý tính năng', iconKey: 'wrench',
    description: 'Trang Quản lý tính năng đang được hoàn thiện và sẽ sớm được đưa vào sử dụng.',
    actionLabel: 'Quay về Quản lý lớp học', actionPath: '/admin/classes',
  },
  '/profile': { route: '/profile', status: 'ready', title: 'Hồ sơ cá nhân', iconKey: 'user', description: 'Quản lý hồ sơ Giáo viên.' },
  '/settings': { route: '/settings', status: 'ready', title: 'Cài đặt', iconKey: 'settings', description: 'Tuỳ chỉnh trải nghiệm ứng dụng.' },
};
