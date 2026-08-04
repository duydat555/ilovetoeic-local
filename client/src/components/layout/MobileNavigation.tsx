import React from 'react';
import { NavLink } from 'react-router-dom';
import { X, Menu } from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';
import { BrandName } from '../common/BrandName';
import { useAuth } from '../../context/AuthContext';
import { getMobileNavigationForRole, getNavigationForRole } from '../../config/navigation';
import { getUserRole } from '../../utils/rbac';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';

interface MobileNavigationProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({ isOpen, onOpen, onClose }) => {
  const { user } = useAuth();
  const { isFeatureEnabled } = useFeatureFlags();
  const role = getUserRole(user);
  const navigation = getNavigationForRole(role).filter(
    (item) => !item.featureKey || isFeatureEnabled(item.featureKey),
  );
  const quickNavigation = getMobileNavigationForRole(role).filter(
    (item) => !item.featureKey || isFeatureEnabled(item.featureKey),
  );

  return (
    <>
      {/* Drawer Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          aria-hidden="true"
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200"
        />
      )}

      {/* Slide-out Drawer Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Điều hướng chính"
        aria-hidden={!isOpen}
        className={`fixed bottom-0 left-0 top-0 z-50 flex w-[min(88vw,320px)] flex-col border-r border-line bg-sidebar/95 shadow-2xl backdrop-blur-2xl transition-[transform,background-color,border-color] duration-300 dark:shadow-none md:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-line px-4">
          <div className="flex items-center gap-3">
            <BrandLogo className="size-11 rounded-[14px] shadow-sm ring-1 ring-slate-200/70 dark:ring-white/10" />
            <BrandName className="rounded-md bg-white px-1.5 text-base font-bold shadow-sm" />
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng menu di động"
            className="rounded-lg p-2 text-content-muted transition-colors duration-300 hover:bg-surface-hover hover:text-content"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-3 rounded-xl font-medium text-sm transition-colors ${
                    isActive
                      ? 'bg-gradient-to-r from-brand to-brand-hover text-brand-ink shadow-md shadow-brand-500/20'
                      : 'text-content-muted hover:bg-surface-hover hover:text-content'
                  }`
                }
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* Bottom Fixed Navigation Bar for Mobile */}
      <nav className="fixed bottom-3 left-3 right-3 z-30 flex h-16 items-center justify-around rounded-2xl border border-line bg-surface/90 px-2 shadow-[0_16px_40px_-12px_rgba(15,23,42,.28)] backdrop-blur-2xl transition-colors duration-300 dark:shadow-none md:hidden">
        {quickNavigation.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex max-w-[88px] flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
                  isActive ? 'text-accent-strong font-bold' : 'text-content-muted'
                }`
              }
            >
              <Icon className="size-5" />
              <span className="max-w-full truncate">{item.label}</span>
            </NavLink>
          );
        })}

        <button
          onClick={isOpen ? onClose : onOpen}
          aria-label={isOpen ? 'Đóng menu thêm' : 'Mở menu thêm'}
          className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
                  isOpen ? 'text-accent-strong font-bold' : 'text-content-muted'
          }`}
        >
          <Menu className="w-5 h-5" />
          <span>Menu</span>
        </button>
      </nav>
    </>
  );
};
