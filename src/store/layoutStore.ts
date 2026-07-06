import { create } from 'zustand';

interface LayoutState {
  sidebarCollapsed: boolean;
  inspectorCollapsed: boolean;
  toggleSidebar: () => void;
  toggleInspector: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setInspectorCollapsed: (collapsed: boolean) => void;
}

function loadBool(key: string, fallback: boolean): boolean {
  const v = localStorage.getItem(key);
  return v === null ? fallback : v === 'true';
}

export const useLayoutStore = create<LayoutState>((set) => ({
  sidebarCollapsed: loadBool('quyll-sidebar-collapsed', false),
  inspectorCollapsed: loadBool('quyll-inspector-collapsed', true),

  toggleSidebar: () =>
    set((s) => {
      const next = !s.sidebarCollapsed;
      localStorage.setItem('quyll-sidebar-collapsed', String(next));
      return { sidebarCollapsed: next };
    }),

  toggleInspector: () =>
    set((s) => {
      const next = !s.inspectorCollapsed;
      localStorage.setItem('quyll-inspector-collapsed', String(next));
      return { inspectorCollapsed: next };
    }),

  setSidebarCollapsed: (collapsed) => {
    localStorage.setItem('quyll-sidebar-collapsed', String(collapsed));
    set({ sidebarCollapsed: collapsed });
  },

  setInspectorCollapsed: (collapsed) => {
    localStorage.setItem('quyll-inspector-collapsed', String(collapsed));
    set({ inspectorCollapsed: collapsed });
  },
}));
