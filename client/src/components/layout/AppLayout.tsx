import React, { Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Navigate, useLocation, useOutlet } from 'react-router-dom';
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
  const reduceMotion = useReducedMotion();

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
  const isAdminArea = role === 'admin' && location.pathname.startsWith('/admin');

  return (
    <div className="app-shell h-screen text-slate-800 dark:text-content flex flex-col md:flex-row antialiased overflow-hidden">
      {/* Desktop & Tablet Sidebar */}
      {isAdminArea ? (
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
          <div
            className={
              isTestRunnerPage
                ? 'grid flex-1 h-full w-full overflow-hidden'
                : 'grid min-h-[calc(100vh-8rem)] w-full'
            }
          >
            <AnimatePresence initial={false} mode="sync">
              <motion.div
                key={location.key}
                className={
                  isTestRunnerPage
                    ? 'col-start-1 row-start-1 min-w-0 h-full w-full overflow-hidden'
                    : 'col-start-1 row-start-1 min-w-0 w-full'
                }
                initial={reduceMotion ? false : { opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduceMotion ? { opacity: 1 } : { opacity: 0, x: -10 }}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : {
                        opacity: { duration: 0.18, ease: 'linear' },
                        x: { duration: 0.22, ease: [0.4, 0, 0.2, 1] },
                      }
                }
              >
                <Suspense
                  fallback={
                    <div
                      className="grid min-h-[55vh] place-items-center"
                      role="status"
                      aria-label="Đang tải nội dung"
                    >
                      <BoneyardSkeleton
                        name={`app-layout-route-${location.pathname}`}
                        height={64}
                        width={260}
                        className="shadow-lg"
                      />
                    </div>
                  }
                >
                  {outlet}
                </Suspense>
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
      {!isAdminArea && <SelectionTranslator />}
    </div>
  );
};
