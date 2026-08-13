import {
  ApprovalStatus,
  NotificationItem,
  StudyActivityResponse,
  StudyAttempt,
  StudyAttemptReviewQuestion,
  User,
  VocabularyWord,
} from '../types';
import type { AdminFeatureStatus } from '../config/adminFeatureStatus';
import type { FeatureKey } from '../config/features';

const getDynamicHost = () => (
  typeof window !== 'undefined' && window.location.hostname
    ? window.location.hostname
    : '127.0.0.1'
);

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || `http://${getDynamicHost()}:8000/api/v1`
).replace(/\/$/, '');

const TOKEN_KEY = 'toeic_master_auth_token';
const REMEMBER_KEY = 'toeic_master_remember_login';
let memoryToken = '';

const readStorageValue = (storage: Storage, key: string) => {
  try {
    return storage.getItem(key) || '';
  } catch {
    return '';
  }
};

const writeStorageValue = (storage: Storage, key: string, value: string) => {
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};

const removeStorageValue = (storage: Storage, key: string) => {
  try {
    storage.removeItem(key);
  } catch {
    // The storage can already be unavailable or empty.
  }
};

const parseResponse = async <T>(response: Response): Promise<T> => {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = body?.detail;
    throw new Error(
      (typeof detail === 'object' ? detail?.message : detail)
      || body?.message
      || 'Không thể kết nối máy chủ MySQL.',
    );
  }
  return body as T;
};

const getToken = () => memoryToken
  || readStorageValue(localStorage, TOKEN_KEY)
  || readStorageValue(sessionStorage, TOKEN_KEY);

const authFetch = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  return parseResponse<T>(response);
};

export const sessionService = {
  getToken,

  set(token: string, _remember = true) {
    memoryToken = token;
    // Đảm bảo token luôn được lưu vào localStorage để giữ phiên khi tắt/mở lại trình duyệt
    writeStorageValue(localStorage, TOKEN_KEY, token);
    writeStorageValue(localStorage, REMEMBER_KEY, 'true');
    removeStorageValue(sessionStorage, TOKEN_KEY);
  },

  clear() {
    memoryToken = '';
    removeStorageValue(localStorage, TOKEN_KEY);
    removeStorageValue(sessionStorage, TOKEN_KEY);
    removeStorageValue(localStorage, REMEMBER_KEY);
  },

  consumeOAuthCallback() {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const token = params.get('token');
    if (!token) return false;
    this.set(token, true);
    window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
    return true;
  },
};

interface AuthResponse {
  token: string;
  user: User;
}

export interface LeaderboardMember {
  id: string;
  name: string;
  familyMiddleName: string;
  cohortCode: string;
  avatar: string;
  streakDays: number;
  totalQuestions: number;
  accuracyRate: number;
  correctQuestions: number;
}

export interface LeaderboardCohort {
  cohortCode: string;
  memberCount: number;
  streakDays: number;
  totalQuestions: number;
  accuracyRate: number;
  correctQuestions: number;
}

export interface LeaderboardResponse {
  currentMemberId: string;
  currentCohort: string | null;
  scope: 'course' | 'cohort' | 'cohorts';
  members: LeaderboardMember[];
  cohorts: LeaderboardCohort[];
  updatedAt: string;
}

export interface NotificationsResponse {
  data: NotificationItem[];
  unreadCount: number;
}

export interface WrongQuestionItem {
  questionId: string;
  testId: string | null;
  sourceType: 'test' | 'level';
  part: number;
  level: number | null;
  wrongCount: number;
  firstWrongAt: string;
  lastWrongAt: string;
  testName?: string | null;
  testYear?: number | null;
}

export interface ManagedClassStudent {
  id: string;
  name: string;
  email: string;
  avatar: string;
  currentScore: number;
  targetScore: number;
  streakDays: number;
  lastStudyDate: string;
  createdAt: string;
}

export interface ManagedClassRecord {
  id: string;
  name: string;
  code: string;
  description: string;
  targetScore: number;
  studentIds: string[];
  studentCount: number;
  averageProgress: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ManagedClassInput {
  name: string;
  code: string;
  description: string;
  targetScore: number;
  studentIds: string[];
  isActive: boolean;
}

export interface NotificationPreferencesResponse {
  studyReminders: boolean;
  reminderTime: string;
}

export interface FeatureAdminClass { id: string; name: string; code: string; isActive: boolean; }
export interface FeatureAuditLog {
  id: string; featureKey: FeatureKey; scopeType: 'global' | 'class';
  className?: string | null; previousEnabled: boolean;
  newEnabled: boolean; actorName: string; actorEmail: string; createdAt: string;
}
export interface FeatureAdminConfiguration {
  globalFlags: Record<FeatureKey, boolean>;
  classOverrides: Record<string, Partial<Record<FeatureKey, boolean>>>;
  classes: FeatureAdminClass[];
  history: FeatureAuditLog[];
  impactCounts: { global: Record<FeatureKey, number>; classes: Record<string, Record<FeatureKey, number>> };
}
export interface EffectiveFeatureConfiguration {
  flags: Record<FeatureKey, boolean>;
  sources: Record<FeatureKey, 'core' | 'global'>;
}

export const authApi = {
  async login(email: string, password: string, remember: boolean) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, remember }),
    });
    return parseResponse<AuthResponse>(response);
  },

  async register(
    name: string,
    email: string,
    password: string,
    targetScore: number,
  ) {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        email,
        password,
        target_score: targetScore,
        remember: true,
      }),
    });
    return parseResponse<AuthResponse>(response);
  },

  async me() {
    return authFetch<{ user: User }>('/auth/me');
  },

  async logout() {
    return authFetch<{ success: boolean }>('/auth/logout', { method: 'POST' });
  },

  async updateProfile(input: {
    name: string;
    email: string;
    avatar: string;
    targetScore: number;
    examDate: string;
    familyMiddleName?: string;
  }) {
    return authFetch<{ user: User; email_confirmation_required: boolean }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({
        name: input.name,
        email: input.email,
        avatar: input.avatar,
        target_score: input.targetScore,
        exam_date: input.examDate,
        family_middle_name: input.familyMiddleName || '',
      }),
    });
  },

  async updateRankingIdentity(name: string, familyMiddleName: string) {
    return authFetch<{ user: User }>('/auth/ranking-identity', {
      method: 'PUT',
      body: JSON.stringify({ name, family_middle_name: familyMiddleName }),
    });
  },

  async updatePassword(currentPassword: string, newPassword: string) {
    return authFetch<{ success: boolean }>('/auth/password', {
      method: 'PUT',
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });
  },

  async recordActivity() {
    return authFetch<{ user: User }>('/auth/activity', { method: 'POST' });
  },

  async getApprovalRequests() {
    const response = await authFetch<{ data: Array<User & { createdAt: string }> }>('/auth/approval-requests');
    return response.data;
  },

  async updateApproval(userId: string, status: Extract<ApprovalStatus, 'approved'>) {
    return authFetch<{ user: User }>(`/auth/approval-requests/${encodeURIComponent(userId)}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },

  async rejectApprovalRequest(userId: string) {
    return authFetch<{ success: boolean; deleted_user_id: string }>(
      `/auth/approval-requests/${encodeURIComponent(userId)}`,
      { method: 'DELETE' },
    );
  },

  async updateAccountAccess(
    userId: string,
    action: 'freeze' | 'unfreeze' | 'set_duration',
    durationMonths?: number,
  ) {
    return authFetch<{ user: User }>(`/auth/accounts/${encodeURIComponent(userId)}/access`, {
      method: 'PUT',
      body: JSON.stringify({ action, duration_months: durationMonths }),
    });
  },

  googleLoginUrl(remember: boolean) {
    const params = new URLSearchParams({
      remember: String(remember),
      frontend_origin: window.location.origin,
    });
    return `${API_BASE_URL}/auth/google/start?${params.toString()}`;
  },
};

export const backendService = {
  async getEffectiveFeatureFlags() {
    const response = await authFetch<{ data: EffectiveFeatureConfiguration }>('/features/effective');
    return response.data;
  },
  async getFeatureConfiguration(): Promise<FeatureAdminConfiguration> {
    const response = await authFetch<{ data: FeatureAdminConfiguration }>('/features/admin');
    return {
      ...response.data,
      classes: [] as FeatureAdminClass[],
      classOverrides: {},
      impactCounts: { ...response.data.impactCounts, classes: {} },
    };
  },
  async updateGlobalFeature(featureKey: FeatureKey, enabled: boolean, confirmed = false) {
    return authFetch<{ data: { enabled: boolean; changed: boolean } }>(`/features/global/${encodeURIComponent(featureKey)}`, {
      method: 'PUT', body: JSON.stringify({ enabled, confirmed }),
    });
  },
  async updateClassFeature(_classId: string, _featureKey: FeatureKey, _enabled: boolean, _confirmed = false) {
    throw new Error('Phạm vi lớp học đã được gỡ bỏ.');
  },
  async getAdminFeatureStatuses() {
    const response = await authFetch<{ data: Array<{
      route: string;
      status: AdminFeatureStatus['status'];
      title: string;
      description: string;
      icon_key: AdminFeatureStatus['iconKey'];
      action_label?: string | null;
      action_path?: string | null;
    }> }>('/admin/feature-status');
    return response.data.map((item): AdminFeatureStatus => ({
      route: item.route,
      status: item.status,
      title: item.title,
      description: item.description,
      iconKey: item.icon_key,
      actionLabel: item.action_label,
      actionPath: item.action_path,
    }));
  },

  async getManagedClasses() {
    const response = await authFetch<{ data: ManagedClassRecord[] }>('/classes');
    return response.data;
  },

  async getManagedClassStudents() {
    const response = await authFetch<{ data: ManagedClassStudent[] }>('/classes/students');
    return response.data;
  },

  async createManagedClass(input: ManagedClassInput) {
    const response = await authFetch<{ data: ManagedClassRecord }>('/classes', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return response.data;
  },

  async updateManagedClass(classId: string, input: ManagedClassInput) {
    const response = await authFetch<{ data: ManagedClassRecord }>(
      `/classes/${encodeURIComponent(classId)}`,
      {
        method: 'PUT',
        body: JSON.stringify(input),
      },
    );
    return response.data;
  },

  async deleteManagedClass(classId: string) {
    return authFetch<{ success: boolean }>(
      `/classes/${encodeURIComponent(classId)}`,
      { method: 'DELETE' },
    );
  },

  async getNotifications(limit = 50, unreadOnly = false) {
    const query = new URLSearchParams({
      limit: String(limit),
      unread_only: String(unreadOnly),
    });
    return authFetch<NotificationsResponse>(`/notifications?${query.toString()}`);
  },

  async getNotificationPreferences() {
    return authFetch<NotificationPreferencesResponse>('/notifications/preferences');
  },

  async updateNotificationPreferences(preferences: NotificationPreferencesResponse) {
    return authFetch<NotificationPreferencesResponse & { success: boolean }>(
      '/notifications/preferences',
      {
        method: 'PUT',
        body: JSON.stringify(preferences),
      },
    );
  },

  async markNotificationRead(notificationId: string) {
    return authFetch<{ success: boolean }>(
      `/notifications/${encodeURIComponent(notificationId)}/read`,
      { method: 'PATCH' },
    );
  },

  async markAllNotificationsRead() {
    return authFetch<{ success: boolean; readAt: string }>(
      '/notifications/read-all',
      { method: 'POST' },
    );
  },

  async deleteNotification(notificationId: string) {
    return authFetch<{ success: boolean }>(
      `/notifications/${encodeURIComponent(notificationId)}`,
      { method: 'DELETE' },
    );
  },

  async getLeaderboard(scope: 'course' | 'cohort' | 'cohorts' = 'course') {
    const query = new URLSearchParams({ scope });
    return authFetch<LeaderboardResponse>(`/leaderboard?${query.toString()}`);
  },

  async saveStudyAttempt(attempt: StudyAttempt) {
    try {
      await authFetch(`/study-attempts/${encodeURIComponent(attempt.id)}`, {
        method: 'PUT',
        body: JSON.stringify(attempt),
      });
      return true;
    } catch (error) {
      console.warn('[!] Không thể lưu lịch sử làm bài lên MySQL:', error);
      return false;
    }
  },

  async getStudyHistory(_userId: string, testId?: string): Promise<StudyAttempt[] | null> {
    try {
      const query = testId ? `?test_id=${encodeURIComponent(testId)}` : '';
      const response = await authFetch<{ data: StudyAttempt[] }>(`/study-attempts${query}`);
      return response.data;
    } catch (error) {
      console.warn('[!] Không thể tải lịch sử làm bài từ MySQL:', error);
      return null;
    }
  },

  async getStudySummary() {
    return authFetch<{
      totalQuestions: number;
      correctQuestions: number;
      accuracyRate: number;
    }>('/study-summary');
  },

  async deleteTestStudyHistory(testId: string) {
    return authFetch<{ success: boolean; deletedCount: number }>(
      `/study-attempts?source_type=test&test_id=${encodeURIComponent(testId)}`,
      { method: 'DELETE' },
    );
  },

  async deleteLevelStudyHistory(part: number, level: number) {
    const params = new URLSearchParams({
      source_type: 'level',
      part: String(part),
      level: String(level),
    });
    return authFetch<{ success: boolean; deletedCount: number }>(
      `/study-attempts?${params.toString()}`,
      { method: 'DELETE' },
    );
  },

  async getStudyAttemptReview(attemptId: string) {
    return authFetch<{ success: boolean; questions: StudyAttemptReviewQuestion[] }>(
      `/study-attempts/${encodeURIComponent(attemptId)}`,
    );
  },

  async getStudyActivity(year: number, studentId?: string) {
    const studentQuery = studentId ? `&student_id=${encodeURIComponent(studentId)}` : '';
    return authFetch<StudyActivityResponse>(
      `/study-activity?year=${encodeURIComponent(String(year))}${studentQuery}`,
    );
  },

  async saveQuestionActivity(payload: {
    attemptId: string;
    sourceType: 'test' | 'level' | 'grammar';
    testId?: string;
    level?: number;
    answers: Array<{ questionId: string; selectedAnswer: string; answeredAt?: string }>;
    answeredAt: string;
  }, options: { keepalive?: boolean } = {}) {
    try {
      await authFetch('/study-activity/questions', {
        method: 'PUT',
        body: JSON.stringify(payload),
        keepalive: options.keepalive,
      });
      if (payload.sourceType !== 'grammar') {
        window.dispatchEvent(new CustomEvent('wrong-questions-updated'));
      }
      return true;
    } catch (error) {
      console.warn('[!] Chưa thể đồng bộ hoạt động câu hỏi lên MySQL:', error);
      return false;
    }
  },

  async getWrongQuestions(
    sourceType: 'test' | 'level',
    filters: { testId?: string; part?: number; level?: number } = {},
  ): Promise<WrongQuestionItem[]> {
    const params = new URLSearchParams({ source_type: sourceType });
    if (filters.testId) params.set('test_id', filters.testId);
    if (filters.part !== undefined) params.set('part', String(filters.part));
    if (filters.level !== undefined) params.set('level', String(filters.level));
    const response = await authFetch<{ success: boolean; data: WrongQuestionItem[] }>(
      `/wrong-questions?${params.toString()}`,
    );
    return response.data;
  },

  async deleteWrongQuestions(
    sourceType: 'test' | 'level',
    filters: { testId?: string; part?: number; level?: number },
  ) {
    const params = new URLSearchParams({ source_type: sourceType });
    if (filters.testId) params.set('test_id', filters.testId);
    if (filters.part !== undefined) params.set('part', String(filters.part));
    if (filters.level !== undefined) params.set('level', String(filters.level));
    return authFetch<{ success: boolean; deletedCount: number }>(
      `/wrong-questions?${params.toString()}`,
      { method: 'DELETE' },
    );
  },

  async getVocabularyWords(_userId: string) {
    try {
      const response = await authFetch<{ data: any[] }>('/vocabulary');
      return response.data;
    } catch (error) {
      console.warn('[!] Không thể tải kho từ vựng từ MySQL:', error);
      return null;
    }
  },

  async addVocabularyWord(_userId: string, word: VocabularyWord) {
    try {
      await authFetch(`/vocabulary/${encodeURIComponent(word.id)}`, {
        method: 'PUT',
        body: JSON.stringify(word),
      });
      return true;
    } catch (error) {
      console.warn('[!] Từ đã lưu trên thiết bị nhưng chưa đồng bộ được lên MySQL:', error);
      return false;
    }
  },

  async getVocabularyTopicOverrides(_userId: string) {
    try {
      const response = await authFetch<{ data: any[] }>('/vocabulary/topic-overrides');
      return response.data;
    } catch (error) {
      console.warn('[!] Không thể tải nhóm từ vựng từ MySQL:', error);
      return null;
    }
  },

  async saveVocabularyTopicOverride(
    _userId: string,
    wordKey: string,
    topicId: string,
    topicName: string,
  ) {
    try {
      await authFetch(`/vocabulary/topic-overrides/${encodeURIComponent(wordKey)}`, {
        method: 'PUT',
        body: JSON.stringify({ wordKey, topicId, topicName }),
      });
      return true;
    } catch (error) {
      console.warn('[!] Nhóm từ đã đổi trên thiết bị nhưng chưa đồng bộ được lên MySQL:', error);
      return false;
    }
  },
};
