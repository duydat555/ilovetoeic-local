import {
  BarChart3,
  BookMarked,
  ClipboardCheck,
  History,
  Languages,
  LayoutDashboard,
  LibraryBig,
  School,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Trophy,
  UserCog,
  UserRound,
  Wrench,
} from 'lucide-react';
import { UserRole } from '../types';
import type { FeatureKey } from './features';

export interface NavigationItem {
  path: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
  featureKey?: FeatureKey;
}

export const studentNavItems: NavigationItem[] = [
  { path: '/dashboard', label: 'Tổng quan', icon: LayoutDashboard, end: true, featureKey: 'dashboard' },
  { path: '/practice-by-level', label: 'Luyện theo Level', icon: SlidersHorizontal, featureKey: 'mock_test' },
  { path: '/mock-test', label: 'Đề thi', icon: ClipboardCheck, featureKey: 'mock_test' },
  { path: '/vocabulary', label: 'Từ vựng Flashcard', icon: Languages, featureKey: 'vocabulary' },
  { path: '/grammar', label: 'Ngữ pháp TOEIC', icon: LibraryBig, featureKey: 'grammar' },
  { path: '/mistake-notebook', label: 'Sổ lỗi sai', icon: BookMarked, featureKey: 'mistake_notebook' },
  { path: '/history', label: 'Lịch sử làm bài', icon: History, featureKey: 'history' },
  { path: '/ranking', label: 'Bảng xếp hạng', icon: Trophy, featureKey: 'ranking' },
  { path: '/profile', label: 'Hồ sơ cá nhân', icon: UserRound, featureKey: 'profile' },
  { path: '/settings', label: 'Cài đặt', icon: Settings, featureKey: 'settings' },
];

export const adminNavItems: NavigationItem[] = [
  { path: '/admin/overview', label: 'Thống kê hệ thống', icon: BarChart3, end: true },
  { path: '/admin/classes', label: 'Quản lý lớp học', icon: School },
  { path: '/admin/accounts', label: 'Quản lý tài khoản', icon: UserCog },
  { path: '/admin/features', label: 'Quản lý tính năng', icon: Wrench },
  { path: '/profile', label: 'Hồ sơ cá nhân', icon: ShieldCheck },
  { path: '/settings', label: 'Cài đặt', icon: Settings },
];

export const getNavigationForRole = (role: UserRole) => {
  if (role === 'admin') return adminNavItems;
  return studentNavItems;
};

export const getMobileNavigationForRole = (role: UserRole) => {
  if (role === 'admin') return adminNavItems.slice(0, 3);
  return studentNavItems.filter((item) => (
    item.path === '/dashboard' || item.path === '/mock-test' || item.path === '/vocabulary'
  ));
};
