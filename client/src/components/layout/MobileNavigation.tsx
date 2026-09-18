import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Globe, Moon, Sun, X } from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';
import { BrandName } from '../common/BrandName';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { getNavigationForRole, NAV_TRANSLATION_KEYS } from '../../config/navigation';
import { getUserRole } from '../../utils/rbac';
import { useAdminFeatureStatus } from '../../context/AdminFeatureStatusContext';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';

interface MobileNavigationProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();
  const { isDarkMode, toggleTheme } = useTheme();
  const role = getUserRole(user);
  const location = useLocation();
  const navigationRole = role === 'admin' && location.pathname.startsWith('/admin') ? 'admin' : 'student';
  const navigation = getNavigationForRole(navigationRole);
  const { getStatus } = useAdminFeatureStatus();
  const { isFeatureEnabled } = useFeatureFlags();

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
            const label = NAV_TRANSLATION_KEYS[item.path] ? t(NAV_TRANSLATION_KEYS[item.path]) : item.label;
            const isFeatureDisabledForAdmin = navigationRole === 'admin' && Boolean(item.featureKey && !isFeatureEnabled(item.featureKey));
            const isComingSoon = navigationRole === 'admin'
              ? getStatus(item.path)?.status === 'coming_soon'
              : Boolean(item.featureKey && !isFeatureEnabled(item.featureKey));
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
                <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                  <span className="truncate">{label}</span>
                  {isFeatureDisabledForAdmin ? (
                    <span className="shrink-0 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-700 dark:border-red-900/50 dark:bg-red-500/10 dark:text-red-300">
                      Đã tắt
                    </span>
                  ) : isComingSoon ? (
                    <span className="shrink-0 rounded-full border border-brand/25 bg-brand/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-strong">
                      Sắp có
                    </span>
                  ) : null}
                </span>
              </NavLink>
            );
          })}
        </div>

        {/* Drawer Footer: Language & Theme Controls */}
        <div className="border-t border-line p-3.5 space-y-2.5 bg-surface/50">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-content-muted flex items-center gap-1.5">
              <Globe className="size-3.5" />
              <span>{language === 'vi' ? 'Ngôn ngữ' : 'Language'}</span>
            </span>
            <div className="flex items-center rounded-xl border border-line bg-surface p-0.5">
              <button
                type="button"
                onClick={() => {
                  if (language !== 'vi') toggleLanguage();
                }}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                  language === 'vi'
                    ? 'bg-brand text-brand-ink shadow-xs'
                    : 'text-content-muted hover:text-content'
                }`}
              >
                Tiếng Việt
              </button>
              <button
                type="button"
                onClick={() => {
                  if (language !== 'en') toggleLanguage();
                }}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                  language === 'en'
                    ? 'bg-brand text-brand-ink shadow-xs'
                    : 'text-content-muted hover:text-content'
                }`}
              >
                English
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-content-muted flex items-center gap-1.5">
              {isDarkMode ? <Moon className="size-3.5 text-slate-400" /> : <Sun className="size-3.5 text-amber-500" />}
              <span>{isDarkMode ? (language === 'vi' ? 'Chế độ tối' : 'Dark Mode') : (language === 'vi' ? 'Chế độ sáng' : 'Light Mode')}</span>
            </span>
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center gap-1.5 rounded-xl border border-line bg-surface px-2.5 py-1 text-xs font-bold text-content hover:bg-surface-hover transition-colors"
            >
              {isDarkMode ? (
                <>
                  <Sun className="size-3.5 text-amber-400" />
                  <span>{language === 'vi' ? 'Sáng' : 'Light'}</span>
                </>
              ) : (
                <>
                  <Moon className="size-3.5 text-slate-600" />
                  <span>{language === 'vi' ? 'Tối' : 'Dark'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
