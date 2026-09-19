import React from 'react';
import { BarChart3, ClipboardList, Megaphone, MessageSquare, School, Settings, UserCog, UserRound, Wrench } from 'lucide-react';
import type { AdminFeatureStatus } from '../../config/adminFeatureStatus';
import { useAdminFeatureStatus } from '../../context/AdminFeatureStatusContext';
import { useAuth } from '../../context/AuthContext';
import { getUserRole } from '../../utils/rbac';
import { ComingSoonPage } from '../common/ComingSoonPage';

const ICONS = {
  chart: BarChart3,
  school: School,
  clipboard: ClipboardList,
  users: UserCog,
  wrench: Wrench,
  user: UserRound,
  settings: Settings,
  'message-square': MessageSquare,
  megaphone: Megaphone,
} satisfies Record<AdminFeatureStatus['iconKey'], typeof BarChart3>;

export const AdminFeatureRoute: React.FC<{ route: string; children?: React.ReactNode }> = ({ route, children }) => {
  const { user } = useAuth();
  const { getStatus } = useAdminFeatureStatus();
  const feature = getStatus(route);

  // Shared routes such as /profile also serve students. The admin feature
  // catalogue must never replace their page content.
  if (getUserRole(user) !== 'admin') return <>{children}</>;

  if (feature?.status === 'coming_soon') {
    return <ComingSoonPage title={feature.title} description={feature.description} icon={ICONS[feature.iconKey]} actionLabel={feature.actionLabel} actionPath={feature.actionPath} />;
  }
  return <>{children}</>;
};
