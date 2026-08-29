import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/authStore';
import { getCsrfToken } from './services/api';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';

// Public pages
import LandingPage from './pages/LandingPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import ProfilePage from './pages/ProfilePage';

// Auth pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import CompleteProfilePage from './pages/CompleteProfilePage';
import AuthErrorPage from './pages/AuthErrorPage';

// Student pages (protected)
import DashboardPage from './pages/DashboardPage';
import ProjectFormPage from './pages/ProjectFormPage';
import NotificationsPage from './pages/NotificationsPage';

// Admin pages (protected)
import AdminAuthPage from './pages/admin/AdminAuthPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminUserDetail from './pages/admin/AdminUserDetail';
import AdminNotifications from './pages/admin/AdminNotifications';


/* ── Shared layout wrapper ───────────────────────────────────── */
function Layout({ children, hideFooter, hideHeader }) {
  return (
    <>
      {!hideHeader && <Navbar />}
      <main className="flex-1">{children}</main>
      {!hideFooter && <Footer />}
    </>
  );
}

/* ── Redirect logged-in users away from auth pages ───────────── */
function GuestRoute({ children }) {
  const { user, loading } = useAuthStore();
  if (loading) return null;
  if (user) {
    if (user.role === 'recruiter') return <Navigate to="/projects" replace />;
    if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

/* ── Root component ──────────────────────────────────────────── */
export default function App() {
  const { fetchMe } = useAuthStore();

  useEffect(() => {
    getCsrfToken();
    fetchMe();

    const onExpired = () => {
      useAuthStore.getState().clearUser();
    };
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, [fetchMe]);

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { borderRadius: '12px', fontSize: '14px' },
        }}
      />
      <Routes>
        {/* ── Public ─────────────────────────────────────────── */}
        <Route path="/" element={<Layout><LandingPage /></Layout>} />
        <Route path="/projects" element={<Layout><ProjectsPage /></Layout>} />
        <Route path="/projects/:id" element={<Layout><ProjectDetailPage /></Layout>} />
        {/* ── Auth (redirect if already logged in) ───────────── */}
        <Route
          path="/auth/login"
          element={<GuestRoute><Layout hideFooter hideHeader><LoginPage /></Layout></GuestRoute>}
        />
        <Route
          path="/auth/register"
          element={<GuestRoute><Layout hideFooter hideHeader><RegisterPage /></Layout></GuestRoute>}
        />
        <Route
          path="/verify-email"
          element={<GuestRoute><Layout hideFooter hideHeader><VerifyEmailPage /></Layout></GuestRoute>}
        />
        <Route path="/auth/error" element={<Layout hideFooter><AuthErrorPage /></Layout>} />

        {/* ── Admin auth (separate hidden portal) ────────────── */}
        <Route path="/admin/auth" element={<AdminAuthPage />} />

        {/* ── Protected: complete profile (new OAuth students) ── */}
        <Route
          path="/complete-profile"
          element={
            <ProtectedRoute>
              <Layout hideFooter><CompleteProfilePage /></Layout>
            </ProtectedRoute>
          }
        />

        {/* ── Protected: student ──────────────────────────────── */}
        <Route
          path="/profile/:id"
          element={
            <ProtectedRoute>
              <Layout><ProfilePage /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute roles={['student']}>
              <Layout><DashboardPage /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/new"
          element={
            <ProtectedRoute roles={['student']}>
              <Layout><ProjectFormPage /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/:id/edit"
          element={
            <ProtectedRoute roles={['student']}>
              <Layout><ProjectFormPage /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <Layout><NotificationsPage /></Layout>
            </ProtectedRoute>
          }
        />

        {/* ── Protected: admin ────────────────────────────────── */}
        <Route path="/admin" element={<Outlet />}>
          <Route
            path="dashboard"
            element={
              <ProtectedRoute roles={['admin']}>
                <Layout><AdminDashboardPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route path="users" element={<Navigate to="/admin/dashboard?tab=users" replace />} />
          <Route path="projects" element={<Navigate to="/admin/dashboard?tab=projects" replace />} />
          <Route
            path="users/:id"
            element={
              <ProtectedRoute roles={['admin']}>
                <Layout><AdminUserDetail /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="projects/:id/edit"
            element={
              <ProtectedRoute roles={['admin']}>
                <Layout><ProjectFormPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="notifications"
            element={
              <ProtectedRoute roles={['admin']}>
                <Layout><AdminNotifications /></Layout>
              </ProtectedRoute>
            }
          />
        </Route>

        {/* ── Fallback ─────────────────────────────────────────── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes >
    </BrowserRouter >
  );
}