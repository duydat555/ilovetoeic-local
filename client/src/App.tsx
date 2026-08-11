import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AdminFeatureStatusProvider } from './context/AdminFeatureStatusContext';
import { FeatureFlagsProvider } from './hooks/useFeatureFlags';
import { NotificationProvider } from './context/NotificationContext';
import { ThemeProvider } from './context/ThemeContext';
import { AppLayout } from './components/layout/AppLayout';
import { RoleGuard } from './components/auth/RoleGuard';
import { AdminFeatureRoute } from './components/auth/AdminFeatureRoute';
import { FeatureRouteGuard } from './components/auth/FeatureRouteGuard';
import { AuthLayout } from './components/auth/AuthLayout';
import { LoginPage } from './pages/Auth/LoginPage';
import { RegisterPage } from './pages/Auth/RegisterPage';
import { PendingApprovalPage } from './pages/Auth/PendingApprovalPage';
import { FrozenAccountPage } from './pages/Auth/FrozenAccountPage';

const LandingPage = lazy(() => import('./pages/Landing/LandingPage').then((m) => ({ default: m.LandingPage })));
const AuthCallbackPage = lazy(() => import('./pages/Auth/AuthCallbackPage').then((m) => ({ default: m.AuthCallbackPage })));
const DashboardLivePage = lazy(() => import('./pages/Dashboard/DashboardLivePage').then((m) => ({ default: m.DashboardLivePage })));
const PracticeRunnerPage = lazy(() => import('./pages/Practice/PracticeRunnerPage').then((m) => ({ default: m.PracticeRunnerPage })));
const PracticeByLevelPage = lazy(() => import('./pages/Practice/PracticeByLevelPage').then((m) => ({ default: m.PracticeByLevelPage })));
const MockTestPage = lazy(() => import('./pages/MockTest/MockTestPage').then((m) => ({ default: m.MockTestPage })));
const TestExamPage = lazy(() => import('./pages/MockTest/TestExamPage').then((m) => ({ default: m.TestExamPage })));
const TestResultPage = lazy(() => import('./pages/Results/TestResultPage').then((m) => ({ default: m.TestResultPage })));
const TopicListPage = lazy(() => import('./pages/Vocabulary/TopicListPage').then((m) => ({ default: m.TopicListPage })));
const TopicFlashcardPage = lazy(() => import('./pages/Vocabulary/VocabularyLivePage').then((m) => ({ default: m.TopicFlashcardPage })));
const GrammarLivePage = lazy(() => import('./pages/Grammar/GrammarLivePage').then((m) => ({ default: m.GrammarLivePage })));
const MistakeNotebookLivePage = lazy(() => import('./pages/MistakeNotebook/MistakeNotebookLivePage').then((m) => ({ default: m.MistakeNotebookLivePage })));
const RankingPage = lazy(() => import('./pages/Ranking/RankingPage').then((m) => ({ default: m.RankingPage })));
const ProfilePage = lazy(() => import('./pages/Profile/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const SettingsPage = lazy(() => import('./pages/Settings/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const NotificationsPage = lazy(() => import('./pages/Notifications/NotificationsPage').then((m) => ({ default: m.NotificationsPage })));
const ClassStudentsLivePage = lazy(() => import('./pages/Admin/ClassStudentsLivePage').then((m) => ({ default: m.ClassStudentsLivePage })));
const StudentDetailLivePage = lazy(() => import('./pages/Admin/StudentDetailLivePage').then((m) => ({ default: m.StudentDetailLivePage })));
const AdminOverviewLivePage = lazy(() => import('./pages/Admin/AdminOverviewLivePage').then((m) => ({ default: m.AdminOverviewLivePage })));
const ClassesManagementPage = lazy(() => import('./pages/Admin/ClassesManagementPage').then((m) => ({ default: m.ClassesManagementPage })));
const AccountManagementLivePage = lazy(() => import('./pages/Admin/AccountManagementLivePage').then((m) => ({ default: m.AccountManagementLivePage })));
const FeatureManagementPage = lazy(() => import('./pages/Admin/FeatureManagementPage').then((m) => ({ default: m.FeatureManagementPage })));

import { BoneyardSkeleton } from './components/common/BoneyardSkeleton';

const RouteFallback = () => (
  <div className="min-h-[55vh] grid place-items-center" role="status" aria-label="Đang tải nội dung">
    <BoneyardSkeleton name="app-route-fallback" height={64} width={260} className="shadow-lg" />
  </div>
);

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <FeatureFlagsProvider>
        <AdminFeatureStatusProvider>
        <NotificationProvider>
          <BrowserRouter future={{ v7_startTransition: true }}>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Route>
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/pending-approval" element={<PendingApprovalPage />} />
            <Route path="/account-frozen" element={<FrozenAccountPage />} />

            {/* Application Dashboard Routes with Common Layout */}
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardLivePage />} />
              <Route element={<FeatureRouteGuard feature="mock_test" />}>
                <Route path="/practice-by-level" element={<PracticeByLevelPage />} />
                <Route path="/practice/runner/:partId" element={<PracticeRunnerPage />} />
                <Route path="/mock-test" element={<MockTestPage />} />
                <Route path="/mock-test/exam/:testId" element={<TestExamPage />} />
                <Route path="/results" element={<TestResultPage />} />
              </Route>
              <Route element={<FeatureRouteGuard feature="vocabulary" />}>
                <Route path="/vocabulary" element={<TopicListPage />} />
                <Route path="/vocabulary/:topicId" element={<TopicFlashcardPage />} />
              </Route>
              <Route element={<FeatureRouteGuard feature="grammar" />}><Route path="/grammar" element={<GrammarLivePage />} /></Route>
              <Route element={<FeatureRouteGuard feature="mistake_notebook" />}><Route path="/mistake-notebook" element={<MistakeNotebookLivePage />} /></Route>
              <Route element={<FeatureRouteGuard feature="ranking" />}><Route path="/ranking" element={<RankingPage />} /></Route>
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />

              {/* The single teacher account manages every student and class group. */}
              <Route element={<RoleGuard allowedRoles={['admin']} />}>
                <Route path="/admin" element={<Navigate to="/admin/overview" replace />} />
                <Route path="/admin/overview" element={<AdminFeatureRoute route="/admin/overview"><AdminOverviewLivePage /></AdminFeatureRoute>} />
                <Route path="/admin/groups" element={<Navigate to="/admin/classes" replace />} />
                <Route path="/admin/classes" element={<AdminFeatureRoute route="/admin/classes"><ClassesManagementPage /></AdminFeatureRoute>} />
                <Route path="/admin/classes/:classId" element={<ClassStudentsLivePage />} />
                <Route path="/admin/students/:studentId" element={<StudentDetailLivePage />} />
                <Route path="/admin/accounts" element={<AdminFeatureRoute route="/admin/accounts"><AccountManagementLivePage /></AdminFeatureRoute>} />
                <Route path="/admin/features" element={<FeatureManagementPage />} />
              </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
          </BrowserRouter>
          </NotificationProvider>
        </AdminFeatureStatusProvider>
        </FeatureFlagsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
