import { useState, useEffect } from 'react';
import { Outlet, useParams, useLocation } from 'react-router-dom';
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
import { Feather, Bot, Settings } from 'lucide-react';
import './AppLayout.css';

export function AppLayout() {
  const { sidebarCollapsed, inspectorCollapsed, toggleSidebar, toggleInspector } = useLayoutStore();
  const { currentProject, projects } = useProjectStore();
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

  if (!projectId) return null;

  const hideInspector = isWritingWorkspace || inspectorCollapsed;

  return (
    <ProjectDbProvider projectId={projectId}>
      <div className="app-shell">
        <header className="app-global-header">
          <div className="app-global-header__brand">
            <Feather size={20} className="app-global-header__logo" />
            <span className="app-global-header__title">Quyll</span>
            <span className="app-global-header__divider">/</span>
            <span className="app-global-header__project">
              {currentProject?.name || projects.find((p) => p.id === projectId)?.name || 'Untitled Project'}
            </span>
          </div>

          <div className="app-global-header__center">
            <GlobalSearch />
          </div>

          <div className="app-global-header__actions">
            <button
              className="app-global-header__ai-btn"
              onClick={() => notify('AI Assistant feature is coming soon to Quyll!', 'info')}
              title="AI Assistant"
            >
              <Bot size={15} className="app-global-header__ai-icon" />
              <span className="app-global-header__ai-label">AI Assistant</span>
              <span className="app-global-header__ai-badge">Coming Soon</span>
            </button>
            <button
              className="app-global-header__settings-btn"
              onClick={() => setIsSettingsModalOpen(true)}
              title="Project Settings"
            >
              <Settings size={18} />
            </button>
          </div>
        </header>

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

        <GlobalKeywordHoverCard />
        <ReferenceBubbles />
        <EntityDetailsModal />
        <ProjectSettingsModal 
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
        />
      </div>
    </ProjectDbProvider>
  );
}
