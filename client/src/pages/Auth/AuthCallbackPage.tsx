import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BrandLogo } from '../../components/common/BrandLogo';
import { useAuth } from '../../context/AuthContext';
import { getRoleHome, getUserRole } from '../../utils/rbac';
import { BoneyardSkeleton } from '../../components/common/BoneyardSkeleton';

const getOAuthError = () => {
  const params = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return (
    params.get('error_description') ||
    params.get('error') ||
    hashParams.get('error_description') ||
    hashParams.get('error') ||
    ''
  );
};

export const AuthCallbackPage: React.FC = () => {
  const { user, isAuthenticated, isLoading, refreshSession } = useAuth();
  const navigate = useNavigate();
  const [callbackError, setCallbackError] = useState(getOAuthError);
  const refreshAttempted = useRef(false);

  useEffect(() => {
    if (isLoading || callbackError) return;

    if (isAuthenticated) {
      navigate(user?.approvalStatus === 'approved' || getUserRole(user) === 'admin' ? getRoleHome(getUserRole(user)) : '/pending-approval', { replace: true });
      return;
    }

    if (refreshAttempted.current) return;
    refreshAttempted.current = true;
    let active = true;

    // Always hydrate AuthContext before navigating so protected routes observe
    // the session token returned by the backend OAuth callback.
    void refreshSession()
      .then((hasSession) => {
        if (active && !hasSession) {
          setCallbackError('Không thể hoàn tất đăng nhập Google. Vui lòng thử lại.');
        }
      })
      .catch((reason) => {
        if (active) {
          setCallbackError(reason instanceof Error ? reason.message : 'Không thể hoàn tất đăng nhập Google.');
        }
      });

    return () => {
      active = false;
    };
  }, [callbackError, isAuthenticated, isLoading, navigate, refreshSession, user]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl dark:border-line dark:bg-surface-elevated">
        <BrandLogo alt="ilovetoeic" className="mx-auto mb-5 size-16 rounded-[20px] shadow-sm ring-1 ring-slate-200/70 dark:ring-white/10" />

        {callbackError ? (
          <>
            <h1 className="text-xl font-bold text-slate-900 dark:text-content">
              Đăng nhập chưa hoàn tất
            </h1>
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">{callbackError}</p>
            <Link
              to="/login"
              replace
              className="mt-6 inline-flex rounded-xl bg-brand px-5 py-3 text-sm font-bold text-brand-ink hover:bg-brand-hover"
            >
              Quay lại đăng nhập
            </Link>
          </>
        ) : (
          <>
            <BoneyardSkeleton name="oauth-callback" height={72} width="100%" />
            <h1 className="mt-5 text-xl font-bold text-slate-900 dark:text-content">
              Đang hoàn tất đăng nhập
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-content-muted">
              Vui lòng chờ trong giây lát...
            </p>
          </>
        )}
      </div>
    </div>
  );
};
