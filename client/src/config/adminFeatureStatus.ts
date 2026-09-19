export type AdminFeatureState = 'ready' | 'coming_soon';

export interface AdminFeatureStatus {
  route: string;
  status: AdminFeatureState;
  title: string;
  description: string;
  iconKey: 'chart' | 'school' | 'clipboard' | 'users' | 'wrench' | 'user' | 'settings' | 'message-square' | 'megaphone';
  actionLabel?: string | null;
  actionPath?: string | null;
}

export const ADMIN_FEATURE_STATUS: Record<string, AdminFeatureStatus> = {
  '/admin/accounts': { route: '/admin/accounts', status: 'ready', title: 'Quản lý tài khoản', iconKey: 'users', description: 'Quản lý tài khoản học viên.' },
  '/admin/feedback': { route: '/admin/feedback', status: 'ready', title: 'Quản lý Góp ý', iconKey: 'message-square', description: 'Xem và phản hồi ý kiến, đóng góp từ học viên.' },
  '/admin/announcements': {
    route: '/admin/announcements',
    status: 'ready',
    title: 'Quản lý thông báo',
    iconKey: 'megaphone',
    description: 'Soạn và quản lý thông báo hệ thống hiển thị cho học viên.',
  },
  '/admin/features': {
    route: '/admin/features', status: 'ready', title: 'Quản lý tính năng', iconKey: 'wrench',
    description: 'Trang Quản lý tính năng đang được hoàn thiện và sẽ sớm được đưa vào sử dụng.',
    actionLabel: 'Quay về Quản lý tài khoản', actionPath: '/admin/accounts',
  },
  '/profile': { route: '/profile', status: 'ready', title: 'Hồ sơ cá nhân', iconKey: 'user', description: 'Quản lý hồ sơ Giáo viên.' },
  '/settings': { route: '/settings', status: 'ready', title: 'Cài đặt', iconKey: 'settings', description: 'Tuỳ chỉnh trải nghiệm ứng dụng.' },
};
