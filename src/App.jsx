import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import Loader from './components/ui/Loader';

// CandidateFrontend: Login + Dashboard only (no test flow)
const Login = lazy(() => import('./modules/Auth/pages/Login'));
const GithubCallback = lazy(() => import('./modules/Auth/pages/GithubCallback'));
const GoogleCallback = lazy(() => import('./modules/Auth/pages/GoogleCallback'));
const MicrosoftCallback = lazy(() => import('./modules/Auth/pages/MicrosoftCallback'));
const LinkedinCallback = lazy(() => import('./modules/Auth/pages/LinkedinCallback'));
const ForgotPassword = lazy(() => import('./modules/Auth/pages/ForgotPassword'));
const ProtectedRoute = lazy(() => import('./components/auth/ProtectedRoute'));
const DashboardLayout = lazy(() => import('./components/layout/DashboardLayout'));
const Dashboard = lazy(() => import('./modules/Dashboard/pages/Dashboard'));
const JobsPage = lazy(() => import('./modules/Dashboard/pages/JobsPage'));
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
const BillingHistoryPage = lazy(() => import('./modules/Dashboard/pages/BillingHistoryPage'));
const ServicesPage = lazy(() => import('./modules/Dashboard/pages/ServicesPage'));
const SubscriptionPlans = lazy(() => import('./modules/Auth/pages/SubscriptionPlans'));
const SessionReportPage = lazy(() => import('./modules/Dashboard/pages/SessionReportPage'));
const ResumeReportPage = lazy(() => import('./modules/Dashboard/pages/ResumeReportPage'));
const ResumeTemplatesPage = lazy(() => import('./modules/Dashboard/pages/ResumeTemplatesPage'));
const ResumeTemplateEditorPage = lazy(() => import('./modules/Dashboard/pages/ResumeTemplateEditorPage'));
const TasksPage = lazy(() => import('./modules/Dashboard/pages/TasksPage'));
const AttendancePage = lazy(() => import('./modules/Dashboard/pages/AttendancePage'));
const FakeOfferDetection = lazy(() => import('./modules/Dashboard/pages/FakeOfferDetection'));

// AI Module Pages
const CommunicationPage = lazy(() => import('./modules/AI/pages/CommunicationPage'));
const TechnicalPage = lazy(() => import('./modules/AI/pages/TechnicalPage'));
const AptitudePage = lazy(() => import('./modules/AI/pages/AptitudePage'));
const HRManagementPage = lazy(() => import('./modules/AI/pages/HRManagementPage'));

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
                  <Route path="/auth/github-callback" element={<GithubCallback />} />
                  <Route path="/auth/google-callback" element={<GoogleCallback />} />
                  <Route path="/auth/microsoft-callback" element={<MicrosoftCallback />} />
                  <Route path="/auth/linkedin-callback" element={<LinkedinCallback />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/subscription" element={<ProtectedRoute><SubscriptionPlans /></ProtectedRoute>} />

                  {/* Dashboard: home, practice, jobs, etc. */}
                  <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="jobs" element={<JobsPage />} />
                    <Route path="jobs/:jobId/:jobTitle" element={<JobsPage />} />
                    <Route path="resume-template-studio" element={<ResumeTemplatesPage />} />
                    <Route path="resume-template-studio/:templateId/editor" element={<ResumeTemplateEditorPage />} />
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
                    <Route path="attendance" element={<AttendancePage />} />
                    <Route path="tasks" element={<TasksPage />} />
                    <Route path="billing" element={<BillingHistoryPage />} />
                    <Route path="services" element={<ServicesPage />} />
                    <Route path="grammar" element={<PracticePage />} />
                    <Route path="ai" element={<AIPage />} />
                    <Route path="ai/communication" element={<CommunicationPage />} />
                    <Route path="ai/technical" element={<TechnicalPage />} />
                    <Route path="ai/aptitude" element={<AptitudePage />} />
                    <Route path="ai/hr-management" element={<HRManagementPage />} />
                    <Route path="ai/report/:sessionId" element={<SessionReportPage />} />
                    <Route path="resume/report/:reportId" element={<ResumeReportPage />} />
                    <Route path="fake-offer-detection" element={<FakeOfferDetection />} />
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
