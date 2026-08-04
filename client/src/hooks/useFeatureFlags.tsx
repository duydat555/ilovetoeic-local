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
  classIds: string[];
  isLoading: boolean;
  error: string;
  isFeatureEnabled: (featureKey: FeatureKey) => boolean;
  reload: () => Promise<void>;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextValue | undefined>(undefined);

export const FeatureFlagsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [flags, setFlags] = useState<Record<FeatureKey, boolean>>(DEFAULT_FEATURE_FLAGS);
  const [classIds, setClassIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    if (!isAuthenticated) {
      setFlags(DEFAULT_FEATURE_FLAGS);
      setClassIds([]);
      setError('');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const configuration = await backendService.getEffectiveFeatureFlags();
      setFlags({ ...DEFAULT_FEATURE_FLAGS, ...configuration.flags });
      setClassIds(configuration.classIds || []);
    } catch (loadError) {
      setFlags(DEFAULT_FEATURE_FLAGS);
      setClassIds([]);
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
    classIds,
    isLoading: authLoading || isLoading,
    error,
    isFeatureEnabled: (featureKey) => flags[featureKey] !== false,
    reload,
  }), [authLoading, classIds, error, flags, isLoading, reload]);

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
