import {
  BellRing,
  ClipboardCheck,
  GraduationCap,
  Headphones,
  Languages,
  LayoutDashboard,
  LibraryBig,
  MessageSquare,
  MessageSquarePlus,
  Mic,
  Settings,
  SlidersHorizontal,
  Trophy,
  Swords,
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

export const NAV_TRANSLATION_KEYS: Record<string, string> = {
  '/dashboard': 'nav.dashboard',
  '/practice-by-level': 'nav.practiceByLevel',
  '/mock-test': 'nav.mockTest',
  '/vocabulary': 'nav.vocabulary',
  '/grammar': 'nav.grammar',
  '/listening': 'nav.listening',
  '/ranking': 'nav.ranking',
  '/feedback': 'nav.feedback',
  '/profile': 'nav.profile',
  '/settings': 'nav.settings',
  '/admin/accounts': 'nav.adminAccounts',
  '/admin/classes': 'nav.adminClasses',
  '/admin/feedback': 'nav.adminFeedback',
  '/admin/announcements': 'nav.adminAnnouncements',
  '/admin/features': 'nav.adminFeatures',
};

export const studentNavItems: NavigationItem[] = [
  { path: '/dashboard', label: 'Tổng quan', icon: LayoutDashboard, end: true, featureKey: 'dashboard' },
  { path: '/practice-by-level', label: 'Luyện theo Level', icon: SlidersHorizontal, featureKey: 'mock_test' },
  { path: '/mock-test', label: 'Đề thi', icon: ClipboardCheck, featureKey: 'mock_test' },
  { path: '/vocabulary', label: 'Từ vựng Flashcard', icon: Languages, featureKey: 'vocabulary' },
  { path: '/grammar', label: 'Ngữ pháp TOEIC', icon: LibraryBig, featureKey: 'grammar' },
  { path: '/listening', label: 'Luyện nghe TOEIC', icon: Headphones, featureKey: 'listening' },
  { path: '/ranking', label: 'Bảng xếp hạng', icon: Trophy, featureKey: 'ranking' },
  { path: '/arena', label: 'Thách đấu', icon: Swords, featureKey: 'arena' },
  { path: '/voice', label: 'Trò chuyện với AI', icon: Mic, featureKey: 'ai_voice' },
  { path: '/feedback', label: 'Góp ý & Phản hồi', icon: MessageSquarePlus, featureKey: 'feedback' },
  { path: '/profile', label: 'Hồ sơ cá nhân', icon: UserRound, featureKey: 'profile' },
  { path: '/settings', label: 'Cài đặt', icon: Settings, featureKey: 'settings' },
];

export const adminNavItems: NavigationItem[] = [
  { path: '/admin/accounts', label: 'Quản lý tài khoản', icon: UserCog, end: true },
  { path: '/admin/classes', label: 'Quản lý lớp học', icon: GraduationCap },
  { path: '/admin/feedback', label: 'Quản lý Góp ý', icon: MessageSquare },
  { path: '/admin/announcements', label: 'Quản lý thông báo', icon: BellRing },
  { path: '/admin/features', label: 'Quản lý tính năng', icon: Wrench },
  { path: '/voice', label: 'Trò chuyện với AI', icon: Mic },
  { path: '/settings', label: 'Cài đặt', icon: Settings },
];

export const getNavigationForRole = (role: UserRole) => {
  if (role === 'admin') return adminNavItems;
  return studentNavItems;
};

export const getMobileNavigationForRole = (role: UserRole) => {
  if (role === 'admin') return adminNavItems.slice(0, 4);
  return studentNavItems.filter((item) => (
    item.path === '/dashboard' || item.path === '/mock-test' || item.path === '/vocabulary'
  ));
};
