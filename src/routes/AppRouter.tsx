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
const CharacterDetailPage = lazy(() => import('@/features/characters/pages/CharacterDetailPage'));
const LocationsPage = lazy(() => import('@/features/locations/pages/LocationsPage'));
const LocationDetailPage = lazy(() => import('@/features/locations/pages/LocationDetailPage'));
const OrganizationsPage = lazy(() => import('@/features/organizations/pages/OrganizationsPage'));
const OrganizationDetailPage = lazy(() => import('@/features/organizations/pages/OrganizationDetailPage'));
const SpeciesPage = lazy(() => import('@/features/species/pages/SpeciesPage'));
const SpeciesDetailPage = lazy(() => import('@/features/species/pages/SpeciesDetailPage'));
const ItemsPage = lazy(() => import('@/features/items/pages/ItemsPage'));
const ItemDetailPage = lazy(() => import('@/features/items/pages/ItemDetailPage'));
const MagicSystemsPage = lazy(() => import('@/features/magic-systems/pages/MagicSystemsPage'));
const MagicSystemDetailPage = lazy(() => import('@/features/magic-systems/pages/MagicSystemDetailPage'));
const LorePage = lazy(() => import('@/features/lore/pages/LorePage'));
const LoreDetailPage = lazy(() => import('@/features/lore/pages/LoreDetailPage'));
const TimelinePage = lazy(() => import('@/features/timeline/pages/TimelinePage'));
const TimelineEventDetailPage = lazy(() => import('@/features/timeline/pages/TimelineEventDetailPage'));
const PlotPlannerPage = lazy(() => import('@/features/plot-planner/pages/PlotPlannerPage'));
const PlotPointDetailPage = lazy(() => import('@/features/plot-planner/pages/PlotPointDetailPage'));
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

      // Characters
      { path: 'characters', element: <SuspenseWrap><CharactersPage /></SuspenseWrap> },
      { path: 'characters/:entityId', element: <SuspenseWrap><CharacterDetailPage /></SuspenseWrap> },

      // Locations
      { path: 'locations', element: <SuspenseWrap><LocationsPage /></SuspenseWrap> },
      { path: 'locations/:entityId', element: <SuspenseWrap><LocationDetailPage /></SuspenseWrap> },

      // Organizations
      { path: 'organizations', element: <SuspenseWrap><OrganizationsPage /></SuspenseWrap> },
      { path: 'organizations/:entityId', element: <SuspenseWrap><OrganizationDetailPage /></SuspenseWrap> },

      // Species
      { path: 'species', element: <SuspenseWrap><SpeciesPage /></SuspenseWrap> },
      { path: 'species/:entityId', element: <SuspenseWrap><SpeciesDetailPage /></SuspenseWrap> },

      // Items
      { path: 'items', element: <SuspenseWrap><ItemsPage /></SuspenseWrap> },
      { path: 'items/:entityId', element: <SuspenseWrap><ItemDetailPage /></SuspenseWrap> },

      // Magic Systems
      { path: 'magic-systems', element: <SuspenseWrap><MagicSystemsPage /></SuspenseWrap> },
      { path: 'magic-systems/:entityId', element: <SuspenseWrap><MagicSystemDetailPage /></SuspenseWrap> },

      // Lore
      { path: 'lore', element: <SuspenseWrap><LorePage /></SuspenseWrap> },
      { path: 'lore/:entityId', element: <SuspenseWrap><LoreDetailPage /></SuspenseWrap> },

      // Timeline
      { path: 'timeline', element: <SuspenseWrap><TimelinePage /></SuspenseWrap> },
      { path: 'timeline/:entityId', element: <SuspenseWrap><TimelineEventDetailPage /></SuspenseWrap> },

      // Plot Planner
      { path: 'plot-planner', element: <SuspenseWrap><PlotPlannerPage /></SuspenseWrap> },
      { path: 'plot-planner/:entityId', element: <SuspenseWrap><PlotPointDetailPage /></SuspenseWrap> },

      { path: 'settings', element: <SuspenseWrap><SettingsPage /></SuspenseWrap> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
