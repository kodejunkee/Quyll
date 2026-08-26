import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AppLayout } from '@/layouts/AppLayout';
import { HomeLayout } from '@/layouts/HomeLayout';
import { GlobalShellLayout } from '@/layouts/GlobalShellLayout';
import { LoadingSkeleton, GlobalErrorBoundary } from '@/components';
import { PlaceholderPage } from '@/features/app-tools/pages/PlaceholderPage';
import { UpdatesPage } from '@/features/app-tools/pages/UpdatesPage';
import { OnlineBackupPage } from '@/features/app-tools/pages/OnlineBackupPage';

// Lazy-loaded pages
const HomePage = lazy(() => import('@/features/projects/pages/HomePage'));
const GlobalTrashPage = lazy(() => import('@/features/projects/pages/GlobalTrashPage').then(m => ({ default: m.GlobalTrashPage })));
const DashboardPage = lazy(() => import('@/features/dashboard/pages/DashboardPage'));
// KnowledgeGraphPage removed
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
const WorldSystemsPage = lazy(() => import('@/features/world-systems/pages/WorldSystemsPage'));
const WorldSystemDetailPage = lazy(() => import('@/features/world-systems/pages/WorldSystemDetailPage'));
const GlossaryDirectoryPage = lazy(() => import('@/features/glossary/pages/GlossaryDirectoryPage').then(m => ({ default: m.GlossaryDirectoryPage })));
const LorePage = lazy(() => import('@/features/lore/pages/LorePage'));
const LoreDetailPage = lazy(() => import('@/features/lore/pages/LoreDetailPage'));
const OutlinerPage = lazy(() => import('@/features/outliner/pages').then(m => ({ default: m.OutlinerPage })));
const PlotPlannerPage = lazy(() => import('@/features/plot-planner/pages/PlotPlannerPage'));
const PlotPointDetailPage = lazy(() => import('@/features/plot-planner/pages/PlotPointDetailPage'));
const LanguageBuilderPage = lazy(() => import('@/features/world/components/LanguageBuilder').then(m => ({ default: m.LanguageBuilder })));

const TrashPage = lazy(() => import('@/features/trash/pages/TrashPage').then(m => ({ default: m.TrashPage })));

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
    element: <GlobalShellLayout />,
    errorElement: <GlobalErrorBoundary />,
    children: [
      {
        path: '/',
        element: <HomeLayout />,
        children: [
          { index: true, element: <SuspenseWrap><HomePage /></SuspenseWrap> },

          { path: 'online-backup', element: <OnlineBackupPage /> },
          { path: 'trash', element: <SuspenseWrap><GlobalTrashPage /></SuspenseWrap> },
          { path: 'updates', element: <UpdatesPage /> },
          { path: 'about', element: <PlaceholderPage title="About" icon="about" /> },
          { path: 'support', element: <PlaceholderPage title="Support" icon="support" /> },
        ],
      },
      {
        path: '/project/:projectId',
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: 'dashboard', element: <SuspenseWrap><DashboardPage /></SuspenseWrap> },
          { path: 'chapters', element: null },
          { path: 'chapters/:chapterId', element: null },

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
          { path: 'world-systems', element: <SuspenseWrap><WorldSystemsPage /></SuspenseWrap> },
          { path: 'world-systems/:entityId', element: <SuspenseWrap><WorldSystemDetailPage /></SuspenseWrap> },

          // Lore
          { path: 'lore', element: <SuspenseWrap><LorePage /></SuspenseWrap> },
          { path: 'lore/:entityId', element: <SuspenseWrap><LoreDetailPage /></SuspenseWrap> },

          // Glossary
          { path: 'glossary', element: <SuspenseWrap><GlossaryDirectoryPage /></SuspenseWrap> },

          // Outliner
          { path: 'outliner', element: <SuspenseWrap><OutlinerPage /></SuspenseWrap> },


          // Plot Planner
          { path: 'plot-planner', element: <SuspenseWrap><PlotPlannerPage /></SuspenseWrap> },
          { path: 'plot-planner/:entityId', element: <SuspenseWrap><PlotPointDetailPage /></SuspenseWrap> },

          // Language Builder
          { path: 'language-builder', element: <SuspenseWrap><LanguageBuilderPage /></SuspenseWrap> },

          { path: 'trash', element: <SuspenseWrap><TrashPage /></SuspenseWrap> },
        ],
      },
    ]
  }
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}

