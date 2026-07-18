import { create } from 'zustand';

export interface EntityModalData {
  entityId: string;
  entityType: string;
  initialX?: number;
  initialY?: number;
  zIndex: number;
}

interface LayoutState {
  sidebarCollapsed: boolean;
  inspectorCollapsed: boolean;
  chapterListCollapsed: boolean;
  showKeywords: boolean;
  activeEntityModals: EntityModalData[];
  toggleSidebar: () => void;
  toggleInspector: () => void;
  toggleChapterList: () => void;
  toggleShowKeywords: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setInspectorCollapsed: (collapsed: boolean) => void;
  setChapterListCollapsed: (collapsed: boolean) => void;
  openEntityModal: (entityId: string, entityType: string, x?: number, y?: number) => void;
  closeEntityModal: (entityId: string) => void;
  bringToFront: (entityId: string) => void;
}

function loadBool(key: string, fallback: boolean): boolean {
  const v = localStorage.getItem(key);
  return v === null ? fallback : v === 'true';
}

export const useLayoutStore = create<LayoutState>((set) => ({
  sidebarCollapsed: loadBool('quyll-sidebar-collapsed', false),
  inspectorCollapsed: loadBool('quyll-inspector-collapsed', true),
  chapterListCollapsed: loadBool('quyll-chapter-list-collapsed', false),
  showKeywords: loadBool('quyll-show-keywords', true),
  activeEntityModals: [],

  toggleShowKeywords: () =>
    set((s) => {
      const next = !s.showKeywords;
      localStorage.setItem('quyll-show-keywords', String(next));
      return { showKeywords: next };
    }),

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

  toggleChapterList: () =>
    set((s) => {
      const next = !s.chapterListCollapsed;
      localStorage.setItem('quyll-chapter-list-collapsed', String(next));
      return { chapterListCollapsed: next };
    }),

  setSidebarCollapsed: (collapsed) => {
    localStorage.setItem('quyll-sidebar-collapsed', String(collapsed));
    set({ sidebarCollapsed: collapsed });
  },

  setInspectorCollapsed: (collapsed) => {
    localStorage.setItem('quyll-inspector-collapsed', String(collapsed));
    set({ inspectorCollapsed: collapsed });
  },

  setChapterListCollapsed: (collapsed) => {
    localStorage.setItem('quyll-chapter-list-collapsed', String(collapsed));
    set({ chapterListCollapsed: collapsed });
  },

  openEntityModal: (entityId, entityType, x, y) => {
    set((state) => {
      // If already open, just bring to front and update position if provided
      const existing = state.activeEntityModals.find(m => m.entityId === entityId);
      const maxZIndex = state.activeEntityModals.length > 0 
        ? Math.max(...state.activeEntityModals.map(m => m.zIndex)) 
        : 10000;
        
      if (existing) {
        return {
          activeEntityModals: state.activeEntityModals.map(m => 
            m.entityId === entityId 
              ? { ...m, zIndex: maxZIndex + 1, initialX: x ?? m.initialX, initialY: y ?? m.initialY } 
              : m
          )
        };
      }
      
      // Add new modal
      return {
        activeEntityModals: [
          ...state.activeEntityModals, 
          { entityId, entityType, initialX: x, initialY: y, zIndex: maxZIndex + 1 }
        ]
      };
    });
  },

  closeEntityModal: (entityId) => {
    set((state) => ({ 
      activeEntityModals: state.activeEntityModals.filter(m => m.entityId !== entityId) 
    }));
  },
  
  bringToFront: (entityId) => {
    set((state) => {
      const maxZIndex = state.activeEntityModals.length > 0 
        ? Math.max(...state.activeEntityModals.map(m => m.zIndex)) 
        : 10000;
      return {
        activeEntityModals: state.activeEntityModals.map(m => 
          m.entityId === entityId ? { ...m, zIndex: maxZIndex + 1 } : m
        )
      };
    });
  },
}));
