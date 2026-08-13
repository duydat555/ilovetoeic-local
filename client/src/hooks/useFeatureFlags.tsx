import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  DEFAULT_FEATURE_FLAGS,
  FeatureKey,
} from '../config/features';
import { useAuth } from '../context/AuthContext';
import { backendService } from '../services/backend';

interface FeatureFlagsContextValue {
  flags: Record<FeatureKey, boolean>;
  isLoading: boolean;
  error: string;
  isFeatureEnabled: (featureKey: FeatureKey) => boolean;
  reload: () => Promise<void>;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextValue | undefined>(undefined);

export const FeatureFlagsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [flags, setFlags] = useState<Record<FeatureKey, boolean>>(DEFAULT_FEATURE_FLAGS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    if (!isAuthenticated) {
      setFlags(DEFAULT_FEATURE_FLAGS);
      setError('');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const configuration = await backendService.getEffectiveFeatureFlags();
      setFlags({ ...DEFAULT_FEATURE_FLAGS, ...configuration.flags });
    } catch (loadError) {
      setFlags(DEFAULT_FEATURE_FLAGS);
      setError(loadError instanceof Error ? loadError.message : 'Không thể tải cấu hình tính năng.');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (authLoading) return;
    void reload();
  }, [authLoading, reload, user?.id]);

  const value = useMemo<FeatureFlagsContextValue>(() => ({
    flags,
    isLoading: authLoading || isLoading,
    error,
    isFeatureEnabled: (featureKey) => flags[featureKey] !== false,
    reload,
  }), [authLoading, error, flags, isLoading, reload]);

  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  );
};

export const useFeatureFlags = () => {
  const context = useContext(FeatureFlagsContext);
  if (!context) throw new Error('useFeatureFlags must be used within FeatureFlagsProvider');
  return context;
};
