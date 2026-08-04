import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { getRoleHome, getUserRole } from '../../utils/rbac';

interface RoleGuardProps {
  allowedRoles: UserRole[];
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="grid min-h-[45vh] place-items-center" role="status">
        <div className="h-20 w-full max-w-sm animate-pulse rounded-2xl border border-line bg-surface-elevated" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const role = getUserRole(user);
  if (!allowedRoles.includes(role)) {
    return <Navigate to={getRoleHome(role)} replace />;
  }

  return <Outlet />;
};
