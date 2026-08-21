import { useState, useEffect } from 'react';
import { Outlet, useParams, useLocation } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { useLayoutStore } from '@/store/layoutStore';
import { useProjectStore } from '@/store/projectStore';
import { ProjectDbProvider } from '@/hooks/useProjectDb';
import { NavigationSidebar } from './NavigationSidebar';
import { InspectorPanel } from './InspectorPanel';
import { GlobalKeywordHoverCard } from '@/components/HoverCard';
import { ReferenceBubbles } from '@/components/ReferenceBubbles';
import { EntityDetailsModal } from '@/components/EntityDetailsModal';
import { GlobalSearch } from '@/components/GlobalSearch/GlobalSearch';
import { useNotification } from '@/components/Notification';
import { ProjectSettingsModal } from '@/features/settings/components';
import { ThemeToggle, LoadingSkeleton } from '@/components';
import { Feather, Bot, Settings, Search } from 'lucide-react';
import './AppLayout.css';
import '@/styles/redesign.css';

const ChaptersPage = lazy(() => import('@/features/chapters/pages/ChaptersPage'));

function SuspenseWrap({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div style={{ padding: '2rem' }}><LoadingSkeleton variant="card" /></div>}>
      {children}
    </Suspense>
  );
}



export function AppLayout() {
  const { sidebarCollapsed, inspectorCollapsed, toggleSidebar, toggleInspector } = useLayoutStore();
  const { currentProject, projects, openTabs, updateTabRoute } = useProjectStore();
  const { projectId } = useParams<{ projectId: string }>();
  const location = useLocation();
  const { notify } = useNotification();
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Hide the inspector panel on the chapters/writing workspace route
  const isWritingWorkspace = location.pathname.includes('/chapters');

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.key === '\\') {
        e.preventDefault();
        toggleSidebar();
      }
      if (e.ctrlKey && e.shiftKey && e.key === '|' && !isWritingWorkspace) {
        e.preventDefault();
        toggleInspector();
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'f' && !isWritingWorkspace) {
        e.preventDefault();
      }
    }
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [toggleSidebar, toggleInspector, isWritingWorkspace]);

  // Track route changes for tab persistence
  useEffect(() => {
    if (projectId) {
      updateTabRoute(projectId, location.pathname);
    }
  }, [projectId, location.pathname, updateTabRoute]);

  if (!projectId) return null;

  const hideInspector = isWritingWorkspace || inspectorCollapsed;

  const SkeletonLayout = (
    <div className="app-shell">
      <div className={`app-layout ${sidebarCollapsed ? 'app-layout--sidebar-collapsed' : ''} ${hideInspector ? 'app-layout--inspector-collapsed' : ''}`}>
        <NavigationSidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
        <main className="app-layout__main">
          <div style={{ padding: 'var(--space-6) var(--space-8)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <LoadingSkeleton variant="card" height="150px" />
            <LoadingSkeleton variant="card" height="300px" />
          </div>
        </main>
        {!isWritingWorkspace && (
          <aside className="inspector-panel" style={{ width: '320px', borderLeft: '1px solid var(--color-border)', padding: 'var(--space-4)' }}>
            <LoadingSkeleton variant="text" count={5} />
          </aside>
        )}
      </div>
    </div>
  );

  return (
    <ProjectDbProvider projectId={projectId} fallback={SkeletonLayout}>
        <div className="app-shell">
        <div
          className={`app-layout ${sidebarCollapsed ? 'app-layout--sidebar-collapsed' : ''} ${hideInspector ? 'app-layout--inspector-collapsed' : ''}`}
        >
          <NavigationSidebar 
            collapsed={sidebarCollapsed} 
            onToggle={toggleSidebar} 
            onOpenSettings={() => setIsSettingsModalOpen(true)}
          />
          <main className="app-layout__main">
            <div style={{ display: isWritingWorkspace ? 'block' : 'none', height: '100%' }}>
              <SuspenseWrap>
                <ChaptersPage />
              </SuspenseWrap>
            </div>
            {!isWritingWorkspace && <Outlet />}
          </main>
          {!isWritingWorkspace && (
            <InspectorPanel collapsed={inspectorCollapsed} onToggle={toggleInspector} />
          )}
        </div>

        <GlobalKeywordHoverCard />
        {isWritingWorkspace && <ReferenceBubbles />}
        <EntityDetailsModal />
        <ProjectSettingsModal 
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
        />
      </div>

    </ProjectDbProvider>
  );
}
