import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { ComingSoonPage } from './pages/ComingSoon/ComingSoonPage';
import { HomePage } from './pages/Home/HomePage';
import { NotFoundPage } from './pages/NotFound/NotFoundPage';

// Sections from later stages show a placeholder for now.
const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/problems', element: <ComingSoonPage /> },
      { path: '/leaderboard', element: <ComingSoonPage /> },
      { path: '/contests', element: <ComingSoonPage /> },
      { path: '/profile', element: <ComingSoonPage /> },
      { path: '/login', element: <ComingSoonPage /> },
      { path: '/register', element: <ComingSoonPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
