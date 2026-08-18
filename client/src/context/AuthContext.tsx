import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { User, UserRole } from '../types';
import { ApiError, authApi, sessionService } from '../services/backend';
import { storage } from '../utils/storage';

interface AuthResult {
  requiresEmailConfirmation?: boolean;
  role: UserRole;
  approvalStatus: User['approvalStatus'];
}

interface ProfileUpdateInput {
  name: string;
  email: string;
  avatar: string;
  targetScore: number;
  examDate: string;
  familyMiddleName?: string;
}

interface ProfileUpdateResult {
  emailConfirmationRequired: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<AuthResult>;
  loginWithGoogle: (remember?: boolean) => Promise<void>;
  refreshSession: () => Promise<boolean>;
  register: (
    name: string,
    email: string,
    password: string,
    targetScore: number,
  ) => Promise<AuthResult>;
  logout: () => Promise<void>;
  updateProfile: (input: ProfileUpdateInput) => Promise<ProfileUpdateResult>;
  updateRankingIdentity: (name: string, familyMiddleName: string) => Promise<void>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  recordStudyActivity: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const withSyncedStudyStreak = (apiUser: User): User => {
  const streak = storage.syncStudyStreak(
    apiUser.id,
    apiUser.streakDays,
    apiUser.lastStudyDate ?? null,
    apiUser.longestStreak ?? apiUser.streakDays,
  );
  return {
    ...apiUser,
    streakDays: streak.currentStreak,
    longestStreak: streak.longestStreak,
    lastStudyDate: streak.lastStudyDate,
  };
};

const hasSameUserSnapshot = (current: User | null, next: User) => {
  if (!current || current.id !== next.id) return false;
  const keys = new Set<keyof User>([
    ...(Object.keys(current) as Array<keyof User>),
    ...(Object.keys(next) as Array<keyof User>),
  ]);
  return Array.from(keys).every((key) => Object.is(current[key], next[key]));
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    sessionService.consumeOAuthCallback();
    if (!sessionService.getToken()) {
      setUser(null);
      setIsLoading(false);
      return false;
    }
    try {
      const response = await authApi.me();
      const nextUser = withSyncedStudyStreak(response.user);
      // Returning to a browser tab revalidates access, but an unchanged
      // session must retain the same object reference. Otherwise every auth
      // consumer treats the background check as a fresh login and reloads.
      setUser((current) => hasSameUserSnapshot(current, nextUser) ? current : nextUser);
      return true;
    } catch (error) {
      const status = error instanceof ApiError ? error.status : (error as { status?: number })?.status;
      if (status === 401) {
        sessionService.clear();
        setUser(null);
        console.warn('[!] Phiên đăng nhập đã hết hạn hoặc không hợp lệ.');
      } else {
        console.warn('[!] Tạm thời không thể kết nối server để cập nhật phiên (máy chủ restart/lỗi mạng):', error);
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    if (!user?.accessExpiresAt || user.isFrozen) return undefined;
    const expiresAt = new Date(user.accessExpiresAt).getTime();
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) {
      sessionService.clear();
      setUser(null);
      return undefined;
    }
    const timer = window.setTimeout(() => {
      sessionService.clear();
      setUser(null);
    }, Math.min(remaining, 2_147_483_647));
    return () => window.clearTimeout(timer);
  }, [user?.accessExpiresAt, user?.isFrozen]);

  useEffect(() => {
    if (!user || user.role === 'admin') return undefined;

    const syncAccessState = () => {
      void refreshSession();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') syncAccessState();
    };
    const timer = window.setInterval(syncAccessState, 30_000);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshSession, user?.id, user?.role]);

  const login = async (
    email: string,
    password: string,
    remember = true,
  ): Promise<AuthResult> => {
    const response = await authApi.login(email.trim(), password, remember);
    sessionService.set(response.token, remember);
    setUser(withSyncedStudyStreak(response.user));
    setIsLoading(false);
    return { role: response.user.role || 'student', approvalStatus: response.user.approvalStatus };
  };

  const loginWithGoogle = async (remember = true) => {
    window.location.assign(authApi.googleLoginUrl(remember));
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    targetScore: number,
  ): Promise<AuthResult> => {
    const response = await authApi.register(name.trim(), email.trim(), password, targetScore);
    sessionService.set(response.token, true);
    setUser(withSyncedStudyStreak(response.user));
    setIsLoading(false);
    return { role: response.user.role || 'student', approvalStatus: response.user.approvalStatus };
  };

  const logout = async () => {
    try {
      if (sessionService.getToken()) await authApi.logout();
    } finally {
      sessionService.clear();
      setUser(null);
    }
  };

  const updateProfile = async (input: ProfileUpdateInput): Promise<ProfileUpdateResult> => {
    const response = await authApi.updateProfile(input);
    setUser(withSyncedStudyStreak(response.user));
    return { emailConfirmationRequired: response.email_confirmation_required };
  };

  const updatePassword = async (currentPassword: string, newPassword: string) => {
    await authApi.updatePassword(currentPassword, newPassword);
  };

  const recordStudyActivity = async () => {
    if (!user) return;
    const activeUserId = user.id;
    const localStreak = storage.recordStudyActivity(activeUserId);
    setUser((current) => current ? {
      ...current,
      streakDays: localStreak.currentStreak,
      longestStreak: localStreak.longestStreak,
      lastStudyDate: localStreak.lastStudyDate,
    } : current);
    try {
      const response = await authApi.recordActivity();
      setUser((current) => (
        current?.id === activeUserId
          ? withSyncedStudyStreak(response.user)
          : current
      ));
    } catch (error) {
      console.warn('[!] Không thể đồng bộ streak lên MySQL:', error);
    }
  };

  const updateRankingIdentity = async (name: string, familyMiddleName: string) => {
    const response = await authApi.updateRankingIdentity(name, familyMiddleName);
    setUser(withSyncedStudyStreak(response.user));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isLoading,
        login,
        loginWithGoogle,
        refreshSession,
        register,
        logout,
        updateProfile,
        updateRankingIdentity,
        updatePassword,
        recordStudyActivity,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
