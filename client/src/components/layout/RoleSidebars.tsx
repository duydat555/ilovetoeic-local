import React from 'react';
import { Sidebar, SidebarProps } from './Sidebar';
import { adminNavItems } from '../../config/navigation';

export const AdminSidebar: React.FC<SidebarProps> = (props) => (
  <Sidebar
    {...props}
    items={adminNavItems}
    homePath="/admin/overview"
    contextLabel="Không gian Giáo viên"
    showGoalCard={false}
  />
);
