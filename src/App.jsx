import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import Loader from './components/ui/Loader';

// CandidateFrontend: Login + Dashboard only (no test flow)
const Login = lazy(() => import('./modules/Auth/pages/Login'));
const ForgotPassword = lazy(() => import('./modules/Auth/pages/ForgotPassword'));
const ProtectedRoute = lazy(() => import('./components/auth/ProtectedRoute'));
const DashboardLayout = lazy(() => import('./components/layout/DashboardLayout'));
const Dashboard = lazy(() => import('./modules/Dashboard/pages/Dashboard'));
const JobsPage = lazy(() => import('./modules/Dashboard/pages/JobsPage'));
const ResumePage = lazy(() => import('./modules/Dashboard/pages/ResumePage'));
const AIPage = lazy(() => import('./modules/Dashboard/pages/AIPage'));
const PracticePage = lazy(() => import('./modules/Dashboard/pages/PracticePage'));
const CoursePage = lazy(() => import('./modules/Dashboard/pages/CoursePage'));
const ProgrammingPage = lazy(() => import('./modules/Dashboard/pages/ProgrammingPage'));
const LessonPage = lazy(() => import('./modules/Dashboard/pages/LessonPage'));
const LessonProgressPage = lazy(() => import('./modules/Dashboard/pages/LessonProgressPage'));
const KnowledgeBasePage = lazy(() => import('./modules/Dashboard/pages/KnowledgeBasePage'));
const TopicDetailsPage = lazy(() => import('./modules/Dashboard/pages/TopicDetailsPage'));
const NotificationsPage = lazy(() => import('./modules/Dashboard/pages/NotificationsPage'));
const BookmarkPage = lazy(() => import('./modules/Dashboard/pages/BookmarkPage'));
const SettingsPage = lazy(() => import('./modules/Dashboard/pages/SettingsPage'));
const ProfilePage = lazy(() => import('./modules/Dashboard/pages/ProfilePage'));
const ServicesPage = lazy(() => import('./modules/Dashboard/pages/ServicesPage'));

const NotFound = lazy(() => import('./components/common/NotFound'));
const ServiceUnavailable = lazy(() => import('./components/common/ServiceUnavailable'));

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <Suspense fallback={<Loader />}>
                <Routes>
                  {/* Public */}
                  <Route path="/" element={<Navigate to="/login" replace />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />

                  {/* Dashboard: home, practice, jobs, etc. */}
                  <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="jobs" element={<JobsPage />} />
                    <Route path="resume" element={<ResumePage />} />
                    <Route path="ai" element={<AIPage />} />
                    <Route path="practice" element={<PracticePage />} />
                    <Route path="assessment/:topicId" element={<PracticePage />} />
                    <Route path="assessment/coding/:category" element={<PracticePage />} />
                    <Route path="assessment/coding/:category/:topicId" element={<PracticePage />} />
                    <Route path="assessment/coding/:category/:topicId/:questionSlug" element={<PracticePage />} />
                    <Route path="assessment/:topicId/:questionSlug" element={<PracticePage />} />
                    <Route path="knowledge-base" element={<KnowledgeBasePage />} />
                    <Route path="knowledge-base/:topicSlug" element={<TopicDetailsPage />} />
                    <Route path="knowledge-base/:topicSlug/:itemSlug" element={<TopicDetailsPage />} />
                    <Route path="practice/knowledge-base" element={<Navigate to="/knowledge-base" replace />} />
                    <Route path="practice/knowledge-base/:topicSlug" element={<Navigate to="/knowledge-base/:topicSlug" replace />} />
                    <Route path="practice/programming" element={<ProgrammingPage />} />
                    <Route path="practice/programming/:slug" element={<ProgrammingPage />} />
                    <Route path="practice/programming/:slug/lesson/:lessonId" element={<LessonPage />} />
                    <Route path="practice/programming/:slug/lesson/:lessonId/progress" element={<LessonProgressPage />} />
                    <Route path="practice/programming/:slug/:moduleSlug/:lessonSlug" element={<LessonPage />} />
                    <Route path="course" element={<CoursePage />} />
                    <Route path="notifications" element={<NotificationsPage />} />
                    <Route path="bookmark" element={<BookmarkPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="profile" element={<ProfilePage />} />
                    <Route path="services" element={<ServicesPage />} />
                  </Route>

                  {/* Error routes */}
                  <Route path="/service-unavailable" element={<ServiceUnavailable />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
