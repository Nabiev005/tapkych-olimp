import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { GuestOnly, RequireAuth } from './components/layout/RouteGuards';
import { AuthProvider } from './hooks/AuthProvider';
import { ForgotPasswordPage } from './pages/Auth/ForgotPasswordPage';
import { LoginPage } from './pages/Auth/LoginPage';
import { RegisterPage } from './pages/Auth/RegisterPage';
import { ResetPasswordPage } from './pages/Auth/ResetPasswordPage';
import { ComingSoonPage } from './pages/ComingSoon/ComingSoonPage';
import { HomePage } from './pages/Home/HomePage';
import { LeaderboardPage } from './pages/Leaderboard/LeaderboardPage';
import { NotFoundPage } from './pages/NotFound/NotFoundPage';
import { ProblemPage } from './pages/Problem/ProblemPage';
import { ProblemsPage } from './pages/Problems/ProblemsPage';
import { ProfilePage, PublicProfilePage } from './pages/Profile/ProfilePage';

// Sections from later stages show a placeholder for now.
const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/problems', element: <ProblemsPage /> },
      { path: '/problems/:slug', element: <ProblemPage /> },
      { path: '/leaderboard', element: <LeaderboardPage /> },
      { path: '/u/:id', element: <PublicProfilePage /> },
      { path: '/contests', element: <ComingSoonPage /> },
      { path: '/contests/:id', element: <ComingSoonPage /> },
      {
        path: '/profile',
        element: (
          <RequireAuth>
            <ProfilePage />
          </RequireAuth>
        ),
      },
      {
        path: '/login',
        element: (
          <GuestOnly>
            <LoginPage />
          </GuestOnly>
        ),
      },
      {
        path: '/register',
        element: (
          <GuestOnly>
            <RegisterPage />
          </GuestOnly>
        ),
      },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

export function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
