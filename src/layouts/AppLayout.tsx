import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useLayoutStore } from '@/store/layoutStore';
import { NavigationSidebar } from './NavigationSidebar';
import { InspectorPanel } from './InspectorPanel';
import './AppLayout.css';

export function AppLayout() {
  const { sidebarCollapsed, inspectorCollapsed, toggleSidebar, toggleInspector } = useLayoutStore();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
      if (e.ctrlKey && e.key === 'i') {
        e.preventDefault();
        toggleInspector();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar, toggleInspector]);

  return (
    <div
      className={`app-layout ${sidebarCollapsed ? 'app-layout--sidebar-collapsed' : ''} ${inspectorCollapsed ? 'app-layout--inspector-collapsed' : ''}`}
    >
      <NavigationSidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      <main className="app-layout__main">
        <Outlet />
      </main>
      <InspectorPanel collapsed={inspectorCollapsed} onToggle={toggleInspector} />
    </div>
  );
}
