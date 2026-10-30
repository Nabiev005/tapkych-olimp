import { lazy, type ComponentType } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { GuestOnly, RequireAuth } from './components/layout/RouteGuards';
import { AuthProvider } from './hooks/AuthProvider';
import { HomePage } from './pages/Home/HomePage';
import { NotFoundPage } from './pages/NotFound/NotFoundPage';

/** Code-split page: loaded on first visit, so the landing page stays small. */
function page<K extends string>(
  load: () => Promise<Record<K, ComponentType>>,
  name: K,
): ComponentType {
  return lazy(async () => {
    const component: ComponentType = (await load())[name];
    return { default: component };
  });
}

const AdminDaily = page(() => import('./pages/Admin/AdminDaily'), 'AdminDaily');
const AdminImport = page(() => import('./pages/Admin/AdminImport'), 'AdminImport');
const AdminLayout = page(() => import('./pages/Admin/AdminLayout'), 'AdminLayout');
const AdminOverview = page(() => import('./pages/Admin/AdminOverview'), 'AdminOverview');
const AdminProblemEdit = page(() => import('./pages/Admin/AdminProblemEdit'), 'AdminProblemEdit');
const AdminProblems = page(() => import('./pages/Admin/AdminProblems'), 'AdminProblems');
const AdminProposals = page(() => import('./pages/Admin/AdminProblems'), 'AdminProposals');
const AdminTaxonomy = page(() => import('./pages/Admin/AdminTaxonomy'), 'AdminTaxonomy');
const AdminUsers = page(() => import('./pages/Admin/AdminUsers'), 'AdminUsers');
const ForgotPasswordPage = page(
  () => import('./pages/Auth/ForgotPasswordPage'),
  'ForgotPasswordPage',
);
const LoginPage = page(() => import('./pages/Auth/LoginPage'), 'LoginPage');
const RegisterPage = page(() => import('./pages/Auth/RegisterPage'), 'RegisterPage');
const ResetPasswordPage = page(() => import('./pages/Auth/ResetPasswordPage'), 'ResetPasswordPage');
const AssignmentPrintPage = page(
  () => import('./pages/Classes/AssignmentPrintPage'),
  'AssignmentPrintPage',
);
const AssignmentPage = page(() => import('./pages/Classes/AssignmentPage'), 'AssignmentPage');
const ClassesPage = page(() => import('./pages/Classes/ClassesPage'), 'ClassesPage');
const ClassPage = page(() => import('./pages/Classes/ClassPage'), 'ClassPage');
const NewAssignmentPage = page(
  () => import('./pages/Classes/NewAssignmentPage'),
  'NewAssignmentPage',
);
const ContestPage = page(() => import('./pages/Contests/ContestPage'), 'ContestPage');
const ContestResultsPage = page(
  () => import('./pages/Contests/ContestResultsPage'),
  'ContestResultsPage',
);
const CertificatePage = page(() => import('./pages/Contests/CertificatePage'), 'CertificatePage');
const ContestsPage = page(() => import('./pages/Contests/ContestsPage'), 'ContestsPage');
const NewContestPage = page(() => import('./pages/Contests/NewContestPage'), 'NewContestPage');
const LeaderboardPage = page(
  () => import('./pages/Leaderboard/LeaderboardPage'),
  'LeaderboardPage',
);
const ProblemPage = page(() => import('./pages/Problem/ProblemPage'), 'ProblemPage');
const ProblemsPage = page(() => import('./pages/Problems/ProblemsPage'), 'ProblemsPage');
const ProfilePage = page(() => import('./pages/Profile/ProfilePage'), 'ProfilePage');
const PublicProfilePage = page(() => import('./pages/Profile/ProfilePage'), 'PublicProfilePage');
const TheoryPage = page(() => import('./pages/Theory/TheoryPage'), 'TheoryPage');
const LessonPage = page(() => import('./pages/Theory/LessonPage'), 'LessonPage');
const ProposePage = page(() => import('./pages/Propose/ProposePage'), 'ProposePage');

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/problems', element: <ProblemsPage /> },
      { path: '/problems/:slug', element: <ProblemPage /> },
      { path: '/theory', element: <TheoryPage /> },
      { path: '/theory/:slug', element: <LessonPage /> },
      { path: '/leaderboard', element: <LeaderboardPage /> },
      { path: '/u/:id', element: <PublicProfilePage /> },
      { path: '/contests', element: <ContestsPage /> },
      {
        path: '/contests/new',
        element: (
          <RequireAuth>
            <NewContestPage />
          </RequireAuth>
        ),
      },
      { path: '/contests/:id', element: <ContestPage /> },
      { path: '/contests/:id/results', element: <ContestResultsPage /> },
      {
        path: '/contests/:id/certificate',
        element: (
          <RequireAuth>
            <CertificatePage />
          </RequireAuth>
        ),
      },
      {
        path: '/profile',
        element: (
          <RequireAuth>
            <ProfilePage />
          </RequireAuth>
        ),
      },
      {
        path: '/classes',
        element: (
          <RequireAuth>
            <ClassesPage />
          </RequireAuth>
        ),
      },
      {
        path: '/classes/:id',
        element: (
          <RequireAuth>
            <ClassPage />
          </RequireAuth>
        ),
      },
      {
        path: '/classes/:id/assignments/new',
        element: (
          <RequireAuth permission="assignments:create">
            <NewAssignmentPage />
          </RequireAuth>
        ),
      },
      {
        path: '/classes/:id/assignments/:assignmentId',
        element: (
          <RequireAuth>
            <AssignmentPage />
          </RequireAuth>
        ),
      },
      {
        path: '/classes/:id/assignments/:assignmentId/print',
        element: (
          <RequireAuth permission="assignments:create">
            <AssignmentPrintPage />
          </RequireAuth>
        ),
      },
      {
        path: '/propose',
        element: (
          <RequireAuth permission="problems:propose">
            <ProposePage />
          </RequireAuth>
        ),
      },
      {
        path: '/admin',
        element: (
          <RequireAuth permission="admin:stats">
            <AdminLayout />
          </RequireAuth>
        ),
        children: [
          { index: true, element: <AdminOverview /> },
          { path: 'problems', element: <AdminProblems /> },
          { path: 'problems/new', element: <AdminProblemEdit /> },
          { path: 'problems/:id', element: <AdminProblemEdit /> },
          { path: 'proposals', element: <AdminProposals /> },
          { path: 'import', element: <AdminImport /> },
          { path: 'users', element: <AdminUsers /> },
          { path: 'taxonomy', element: <AdminTaxonomy /> },
          { path: 'daily', element: <AdminDaily /> },
        ],
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
