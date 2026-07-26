import { useState, useEffect } from 'react';
import { Outlet, useParams, useLocation } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { useLayoutStore } from '@/store/layoutStore';
import { useProjectStore } from '@/store/projectStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { ProjectDbProvider, useProjectDb } from '@/hooks/useProjectDb';
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

function WorkspaceInitializer({ children, fallback }: { children: React.ReactNode; fallback: React.ReactNode }) {
  const { db, projectId } = useProjectDb();
  const { isInitialized, isInitializing, initialize } = useWorkspaceStore();

  useEffect(() => {
    if (db && projectId) {
      initialize(db, projectId);
    }
  }, [db, projectId, initialize]);

  if (isInitializing || !isInitialized) return <>{fallback}</>;
  return <>{children}</>;
}

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

  const SkeletonLayout = (
    <div className="app-shell">
      <header className="app-global-header">
        <div className="app-global-header__brand">
          <Feather size={20} className="app-global-header__logo" />
          <span className="app-global-header__title">Quyll</span>
          <span className="app-global-header__divider">/</span>
          <span className="app-global-header__project">
            {currentProject?.name || projects.find((p) => p.id === projectId)?.name || 'Loading...'}
          </span>
        </div>

        <div className="app-global-header__center">
          <div className="global-search-wrapper">
            <div className="global-search-bar">
              <Search size={16} className="global-search-bar__icon" />
              <input disabled type="text" className="global-search-bar__input" placeholder="Search the project" />
              <kbd className="global-search-bar__shortcut">Ctrl K</kbd>
            </div>
          </div>
        </div>

        <div className="app-global-header__actions">
          <button className="app-global-header__ai-btn" disabled>
            <Bot size={15} className="app-global-header__ai-icon" />
            <span className="app-global-header__ai-label">AI Assistant</span>
            <span className="app-global-header__ai-badge">Coming Soon</span>
          </button>
          <ThemeToggle />
          <button className="app-global-header__settings-btn" disabled>
            <Settings size={18} />
          </button>
        </div>
      </header>

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
      <WorkspaceInitializer fallback={SkeletonLayout}>
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
            <ThemeToggle />
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
        <ReferenceBubbles />
        <EntityDetailsModal />
        <ProjectSettingsModal 
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
        />
      </div>
      </WorkspaceInitializer>
    </ProjectDbProvider>
  );
}
