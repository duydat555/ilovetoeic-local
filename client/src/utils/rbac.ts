import { User, UserRole } from '../types';

export const ROLE_LABELS: Record<UserRole, string> = {
  student: 'Học sinh',
  admin: 'Giáo viên (admin)',
};

export const ROLE_HOME: Record<UserRole, string> = {
  student: '/dashboard',
  // Admins start in the same learning workspace as students. The admin
  // workspace is entered explicitly from the account menu.
  admin: '/dashboard',
};

const ROLE_LEVEL: Record<UserRole, number> = {
  student: 0,
  admin: 1,
};

export const getUserRole = (user: User | null | undefined): UserRole => {
  if (user?.role === 'admin') return 'admin';
  return 'student';
};

export const canAccessRole = (
  currentRole: UserRole,
  minimumRole: UserRole,
) => ROLE_LEVEL[currentRole] >= ROLE_LEVEL[minimumRole];

export const getRoleHome = (role: UserRole) => ROLE_HOME[role];
