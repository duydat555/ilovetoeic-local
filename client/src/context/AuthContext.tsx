import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { User, UserRole } from '../types';
import { authApi, sessionService } from '../services/backend';
import { storage } from '../utils/storage';

interface AuthResult {
  requiresEmailConfirmation?: boolean;
  role: UserRole;
}

interface ProfileUpdateInput {
  name: string;
  email: string;
  avatar: string;
  targetScore: number;
  examDate: string;
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
      setUser(withSyncedStudyStreak(response.user));
      return true;
    } catch (error) {
      sessionService.clear();
      setUser(null);
      console.warn('[!] Không thể khôi phục phiên đăng nhập MySQL:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const login = async (
    email: string,
    password: string,
    remember = true,
  ): Promise<AuthResult> => {
    const response = await authApi.login(email.trim(), password, remember);
    sessionService.set(response.token, remember);
    setUser(withSyncedStudyStreak(response.user));
    setIsLoading(false);
    return { role: response.user.role || 'student' };
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
    return { role: response.user.role || 'student' };
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
