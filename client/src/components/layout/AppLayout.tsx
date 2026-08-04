import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate, useOutlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileNavigation } from './MobileNavigation';
import { useAuth } from '../../context/AuthContext';
import { SelectionTranslator } from '../common/SelectionTranslator';
import { AdminSidebar } from './RoleSidebars';
import { getUserRole } from '../../utils/rbac';

export const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [featureNotice, setFeatureNotice] = useState('');
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const outlet = useOutlet();

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const state = location.state as { featureUnavailableMessage?: string } | null;
    if (!state?.featureUnavailableMessage) return;
    setFeatureNotice(state.featureUnavailableMessage);
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
  }, [location.pathname, location.search, location.state, navigate]);

  useEffect(() => {
    if (!featureNotice) return undefined;
    const timer = window.setTimeout(() => setFeatureNotice(''), 3600);
    return () => window.clearTimeout(timer);
  }, [featureNotice]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas text-content transition-colors duration-300">
        <div className="w-9 h-9 rounded-full border-4 border-brand-100 border-t-brand animate-spin" aria-label="Đang tải" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const isTestRunnerPage =
    location.pathname.includes('/mock-test/exam') ||
    location.pathname.includes('/practice/runner');
  const role = getUserRole(user);

  return (
    <div className="app-shell h-screen text-slate-800 dark:text-content flex flex-col md:flex-row antialiased overflow-hidden">
      {/* Desktop & Tablet Sidebar */}
      {role === 'admin' ? (
        <AdminSidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} />
      ) : (
        <Sidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} />
      )}

      {/* Mobile Navigation Drawer & Bottom Bar */}
      <MobileNavigation
        isOpen={mobileMenuOpen}
        onOpen={() => setMobileMenuOpen(true)}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header onOpenMobileMenu={() => setMobileMenuOpen(true)} />
        <AnimatePresence>
          {featureNotice && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="pointer-events-none fixed left-1/2 top-20 z-[70] w-[min(92vw,440px)] -translate-x-1/2"
              role="status"
              aria-live="polite"
            >
              <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 shadow-lg dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
                <AlertCircle className="size-5 shrink-0" aria-hidden="true" />
                <span>{featureNotice}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <main
          className={
            isTestRunnerPage
              ? 'relative flex-1 w-full max-w-[1540px] mx-auto p-1.5 sm:p-2.5 h-[calc(100vh-72px)] overflow-hidden flex flex-col'
              : 'relative flex-1 w-full max-w-[1540px] mx-auto p-3 sm:p-4 md:p-5 overflow-x-hidden overflow-y-auto'
          }
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 15, scale: 0.995 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.995 }}
              transition={{
                duration: 0.2,
                ease: 'easeInOut',
              }}
              onAnimationStart={(definition) => {
                if (
                  typeof definition === 'object' &&
                  'opacity' in definition &&
                  definition.opacity === 1
                ) {
                  window.scrollTo({ top: 0, behavior: 'auto' });
                }
              }}
              className={
                isTestRunnerPage
                  ? 'flex-1 h-full w-full overflow-hidden'
                  : 'min-h-[calc(100vh-8rem)]'
              }
            >
              {outlet}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      {role === 'student' && <SelectionTranslator />}
    </div>
  );
};
