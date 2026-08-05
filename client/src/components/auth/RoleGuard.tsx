import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { getRoleHome, getUserRole } from '../../utils/rbac';

interface RoleGuardProps {
  allowedRoles: UserRole[];
}

import { BoneyardSkeleton } from '../common/BoneyardSkeleton';

export const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="grid min-h-[45vh] place-items-center" role="status">
        <BoneyardSkeleton name="role-guard-skeleton" height={80} width={384} />
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
