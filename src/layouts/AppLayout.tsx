import { useEffect } from 'react';
import { Outlet, useParams, useLocation } from 'react-router-dom';
import { useLayoutStore } from '@/store/layoutStore';
import { ProjectDbProvider } from '@/hooks/useProjectDb';
import { NavigationSidebar } from './NavigationSidebar';
import { InspectorPanel } from './InspectorPanel';
import './AppLayout.css';

export function AppLayout() {
  const { sidebarCollapsed, inspectorCollapsed, toggleSidebar, toggleInspector } = useLayoutStore();
  const { projectId } = useParams<{ projectId: string }>();
  const location = useLocation();

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
      </div>
    </ProjectDbProvider>
  );
}
