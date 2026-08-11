import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useOutlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileNavigation } from './MobileNavigation';
import { useAuth } from '../../context/AuthContext';
import { SelectionTranslator } from '../common/SelectionTranslator';
import { AdminSidebar } from './RoleSidebars';
import { getUserRole } from '../../utils/rbac';
import { BoneyardSkeleton } from '../common/BoneyardSkeleton';

export const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, isLoading } = useAuth();
  const role = getUserRole(user);
  const location = useLocation();
  const outlet = useOutlet();
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useLayoutEffect(() => {
    // The app shell scrolls <main>, not window. Reset it before paint so a
    // runner with overflow-hidden cannot inherit an off-screen scrollTop from
    // Practice by Level or another long page.
    mainRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.key, location.pathname, location.search]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);

  if (isLoading) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-canvas px-4" role="status" aria-label="Đang tải ứng dụng">
        <BoneyardSkeleton name="app-layout-session" height={96} width="min(100%, 32rem)" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (user && role === 'student' && user.approvalStatus !== 'approved') {
    return <Navigate to="/pending-approval" replace />;
  }

  if (user && role === 'student' && user.isFrozen) {
    return <Navigate to="/account-frozen" replace />;
  }

  const isTestRunnerPage =
    location.pathname.includes('/mock-test/exam') ||
    location.pathname.includes('/practice/runner');

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
        <main
          ref={mainRef}
          className={
            isTestRunnerPage
              ? 'relative flex-1 w-full max-w-[1540px] mx-auto p-1.5 sm:p-2.5 h-[calc(100vh-72px)] overflow-hidden flex flex-col'
              : 'relative flex-1 w-full max-w-[1540px] mx-auto p-3 sm:p-4 md:p-5 overflow-x-hidden overflow-y-auto'
          }
        >
          <motion.div
            key={location.key}
            initial={{ opacity: 0, y: 10, scale: 0.997 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className={
              isTestRunnerPage
                ? 'flex-1 h-full w-full overflow-hidden'
                : 'min-h-[calc(100vh-8rem)]'
            }
          >
            {outlet}
          </motion.div>
        </main>
      </div>
      {role === 'student' && <SelectionTranslator />}
    </div>
  );
};
