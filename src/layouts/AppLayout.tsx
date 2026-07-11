import { useState, useEffect } from 'react';
import { Outlet, useParams, useLocation, useNavigate } from 'react-router-dom';
import { useLayoutStore } from '@/store/layoutStore';
import { ProjectDbProvider } from '@/hooks/useProjectDb';
import { NavigationSidebar } from './NavigationSidebar';
import { InspectorPanel } from './InspectorPanel';
import { GlobalKeywordHoverCard } from '@/components/HoverCard';
import { ReferenceBubbles } from '@/components/ReferenceBubbles';
import { EntityDetailsModal } from '@/components/EntityDetailsModal';
import { GlobalSearch } from '@/components/GlobalSearch/GlobalSearch';
import './AppLayout.css';

export function AppLayout() {
  const { sidebarCollapsed, inspectorCollapsed, toggleSidebar, toggleInspector } = useLayoutStore();
  const { projectId } = useParams<{ projectId: string }>();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);

  // Hide the inspector panel on the chapters/writing workspace route
  const isWritingWorkspace = location.pathname.includes('/chapters');

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.key === '\\') {
        e.preventDefault();
        toggleSidebar();
      }
      if (e.ctrlKey && e.shiftKey && e.key === '|' && !isWritingWorkspace) {
        // Shift + \ is |
        e.preventDefault();
        toggleInspector();
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'f' && !isWritingWorkspace) {
        e.preventDefault();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [toggleSidebar, toggleInspector, isWritingWorkspace]);

  if (!projectId) return null;

  const hideInspector = isWritingWorkspace || inspectorCollapsed;

  return (
    <ProjectDbProvider projectId={projectId}>
      <div
        className={`app-layout ${sidebarCollapsed ? 'app-layout--sidebar-collapsed' : ''} ${hideInspector ? 'app-layout--inspector-collapsed' : ''}`}
      >
        <NavigationSidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
        <main className="app-layout__main">
          <Outlet />
        </main>
        {!isWritingWorkspace && (
          <InspectorPanel collapsed={inspectorCollapsed} onToggle={toggleInspector} />
        )}
        <GlobalKeywordHoverCard />
        <ReferenceBubbles />
        <EntityDetailsModal />
        <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      </div>
    </ProjectDbProvider>
  );
}
