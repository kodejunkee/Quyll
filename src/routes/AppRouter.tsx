import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AppLayout } from '@/layouts/AppLayout';
import { HomeLayout } from '@/layouts/HomeLayout';
import { LoadingSkeleton } from '@/components';

// Lazy-loaded pages
const HomePage = lazy(() => import('@/features/projects/pages/HomePage'));
const DashboardPage = lazy(() => import('@/features/dashboard/pages/DashboardPage'));
const ChaptersPage = lazy(() => import('@/features/chapters/pages/ChaptersPage'));
const CharactersPage = lazy(() => import('@/features/characters/pages/CharactersPage'));
const LocationsPage = lazy(() => import('@/features/locations/pages/LocationsPage'));
const OrganizationsPage = lazy(() => import('@/features/organizations/pages/OrganizationsPage'));
const SpeciesPage = lazy(() => import('@/features/species/pages/SpeciesPage'));
const ItemsPage = lazy(() => import('@/features/items/pages/ItemsPage'));
const MagicSystemsPage = lazy(() => import('@/features/magic-systems/pages/MagicSystemsPage'));
const LorePage = lazy(() => import('@/features/lore/pages/LorePage'));
const TimelinePage = lazy(() => import('@/features/timeline/pages/TimelinePage'));
const PlotPlannerPage = lazy(() => import('@/features/plot-planner/pages/PlotPlannerPage'));
const SettingsPage = lazy(() => import('@/features/settings/pages/SettingsPage'));

function PageLoader() {
  return (
    <div style={{ padding: '2rem' }}>
      <LoadingSkeleton variant="card" />
    </div>
  );
}

function SuspenseWrap({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <HomeLayout />,
    children: [
      { index: true, element: <SuspenseWrap><HomePage /></SuspenseWrap> },
    ],
  },
  {
    path: '/project/:projectId',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', element: <SuspenseWrap><DashboardPage /></SuspenseWrap> },
      { path: 'chapters', element: <SuspenseWrap><ChaptersPage /></SuspenseWrap> },
      { path: 'characters', element: <SuspenseWrap><CharactersPage /></SuspenseWrap> },
      { path: 'locations', element: <SuspenseWrap><LocationsPage /></SuspenseWrap> },
      { path: 'organizations', element: <SuspenseWrap><OrganizationsPage /></SuspenseWrap> },
      { path: 'species', element: <SuspenseWrap><SpeciesPage /></SuspenseWrap> },
      { path: 'items', element: <SuspenseWrap><ItemsPage /></SuspenseWrap> },
      { path: 'magic-systems', element: <SuspenseWrap><MagicSystemsPage /></SuspenseWrap> },
      { path: 'lore', element: <SuspenseWrap><LorePage /></SuspenseWrap> },
      { path: 'timeline', element: <SuspenseWrap><TimelinePage /></SuspenseWrap> },
      { path: 'plot-planner', element: <SuspenseWrap><PlotPlannerPage /></SuspenseWrap> },
      { path: 'settings', element: <SuspenseWrap><SettingsPage /></SuspenseWrap> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
