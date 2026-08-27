import {
  ClipboardCheck,
  Languages,
  LayoutDashboard,
  LibraryBig,
  MessageSquarePlus,
  Settings,
  Trophy,
  UserRound,
} from 'lucide-react';

export type FeatureKey =
  | 'dashboard'
  | 'mock_test'
  | 'vocabulary'
  | 'grammar'
  | 'ranking'
  | 'feedback'
  | 'profile'
  | 'settings';

export type FeatureCategory = 'core' | 'learning' | 'tracking' | 'community';

export interface FeatureDefinition {
  key: FeatureKey;
  name: string;
  description: string;
  category: FeatureCategory;
  core: boolean;
  icon: typeof LayoutDashboard;
}

export const FEATURE_CATEGORIES: Array<{
  key: FeatureCategory;
  name: string;
  description: string;
}> = [
  {
    key: 'core',
    name: 'Tính năng cốt lõi',
    description: 'Luôn hiển thị để bảo đảm học sinh có thể sử dụng tài khoản bình thường.',
  },
  {
    key: 'learning',
    name: 'Học tập',
    description: 'Nội dung luyện tập và tài nguyên học TOEIC.',
  },
  {
    key: 'tracking',
    name: 'Đánh giá & Theo dõi',
    description: 'Kết quả, lỗi sai và bài tập được giao.',
  },
  {
    key: 'community',
    name: 'Cộng đồng',
    description: 'Tính năng thi đua và tương tác giữa học sinh.',
  },
];

export const FEATURE_DEFINITIONS: FeatureDefinition[] = [
  {
    key: 'dashboard',
    name: 'Tổng quan',
    description: 'Trang bắt đầu và tóm tắt hoạt động học tập.',
    category: 'core',
    core: true,
    icon: LayoutDashboard,
  },
  {
    key: 'profile',
    name: 'Hồ sơ cá nhân',
    description: 'Thông tin tài khoản và mục tiêu cá nhân.',
    category: 'core',
    core: true,
    icon: UserRound,
  },
  {
    key: 'settings',
    name: 'Cài đặt',
    description: 'Tuỳ chọn giao diện, thông báo và bảo mật.',
    category: 'core',
    core: true,
    icon: Settings,
  },
  {
    key: 'mock_test',
    name: 'Đề thi',
    description: 'Kho đề thi thử và các bài luyện Part.',
    category: 'learning',
    core: false,
    icon: ClipboardCheck,
  },
  {
    key: 'vocabulary',
    name: 'Từ vựng Flashcard',
    description: 'Ôn tập và lưu từ vựng bằng flashcard.',
    category: 'learning',
    core: false,
    icon: Languages,
  },
  {
    key: 'grammar',
    name: 'Ngữ pháp TOEIC',
    description: 'Bài học ngữ pháp trọng tâm cho kỳ thi TOEIC.',
    category: 'learning',
    core: false,
    icon: LibraryBig,
  },
  {
    key: 'ranking',
    name: 'Bảng xếp hạng',
    description: 'Hiển thị xếp hạng thi đua giữa học sinh.',
    category: 'community',
    core: false,
    icon: Trophy,
  },
  {
    key: 'feedback',
    name: 'Góp ý & Phản hồi',
    description: 'Gửi ý kiến đóng góp và yêu cầu tính năng mới.',
    category: 'community',
    core: false,
    icon: MessageSquarePlus,
  },
];

export const DEFAULT_FEATURE_FLAGS = Object.fromEntries(
  FEATURE_DEFINITIONS.map((feature) => [feature.key, true]),
) as Record<FeatureKey, boolean>;

const ROUTE_FEATURE_RULES: Array<[string, FeatureKey]> = [
  ['/practice/runner', 'mock_test'],
  ['/mock-test/exam', 'mock_test'],
  ['/vocabulary', 'vocabulary'],
  ['/mock-test', 'mock_test'],
  ['/grammar', 'grammar'],
  ['/ranking', 'ranking'],
  ['/feedback', 'feedback'],
  ['/results', 'mock_test'],
  ['/dashboard', 'dashboard'],
  ['/profile', 'profile'],
  ['/settings', 'settings'],
];

export const getFeatureForPath = (pathname: string) => (
  ROUTE_FEATURE_RULES.find(([path]) => pathname === path || pathname.startsWith(`${path}/`))?.[1]
);

export const featureDefinitionByKey = new Map(
  FEATURE_DEFINITIONS.map((feature) => [feature.key, feature]),
);
