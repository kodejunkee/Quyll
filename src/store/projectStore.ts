import { create } from 'zustand';

const MAX_TABS = 8;
const TABS_STORAGE_KEY = 'quyll_open_tabs';

export interface ProjectInfo {
  id: string;
  name: string;
  path: string;
  description: string;
  author: string;
  genre: string;
  tags: string[];
  cover_image: string | null;
  last_opened_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TabInfo {
  projectId: string;
  projectInfo: ProjectInfo;
  lastRoute: string; // e.g. "/project/abc/dashboard"
}

interface ProjectState {
  // Tab management
  openTabs: TabInfo[];
  activeTabId: string | null;

  // Backward-compatible computed property
  currentProject: ProjectInfo | null;

  // Project registry (all known projects)
  projects: ProjectInfo[];
  deletedProjects: ProjectInfo[];

  // Tab actions
  openTab: (project: ProjectInfo, route?: string) => void;
  closeTab: (projectId: string) => void;
  setActiveTab: (projectId: string) => void;
  updateTabRoute: (projectId: string, route: string) => void;
  updateTabProjectInfo: (projectId: string, info: ProjectInfo) => void;

  // Legacy — kept for backward compatibility
  setCurrentProject: (project: ProjectInfo | null) => void;
  setProjects: (projects: ProjectInfo[]) => void;
  setDeletedProjects: (projects: ProjectInfo[]) => void;
  updateProject: (id: string, updates: Partial<ProjectInfo>) => void;
  removeProject: (id: string) => void;
}

/** Load persisted tabs from localStorage */
function loadPersistedTabs(): TabInfo[] {
  try {
    const raw = localStorage.getItem(TABS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Ignore parse errors
  }
  return [];
}

/** Persist tabs to localStorage */
function persistTabs(tabs: TabInfo[], activeTabId: string | null) {
  try {
    localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(tabs));
    localStorage.setItem(TABS_STORAGE_KEY + '_active', activeTabId ?? '');
  } catch {
    // Ignore write errors
  }
}

/** Load persisted active tab ID */
function loadPersistedActiveTab(): string | null {
  try {
    const val = localStorage.getItem(TABS_STORAGE_KEY + '_active');
    return val || null;
  } catch {
    return null;
  }
}

const initialTabs = loadPersistedTabs();
const initialActiveTab = loadPersistedActiveTab();

export const useProjectStore = create<ProjectState>((set, get) => ({
  openTabs: initialTabs,
  activeTabId: initialActiveTab,
  currentProject: initialTabs.find(t => t.projectId === initialActiveTab)?.projectInfo ?? null,
  projects: [],
  deletedProjects: [],

  openTab: (project, route) => {
    const state = get();
    const existingTab = state.openTabs.find(t => t.projectId === project.id);

    if (existingTab) {
      // Tab already open — just activate it
      const activeTabId = project.id;
      const openTabs = route
        ? state.openTabs.map(t => t.projectId === project.id ? { ...t, lastRoute: route, projectInfo: project } : t)
        : state.openTabs.map(t => t.projectId === project.id ? { ...t, projectInfo: project } : t);
      set({ openTabs, activeTabId, currentProject: project });
      persistTabs(openTabs, activeTabId);
      return;
    }

    // Enforce max tabs
    let tabs = [...state.openTabs];
    if (tabs.length >= MAX_TABS) {
      // Close the oldest non-active tab
      const oldestNonActive = tabs.find(t => t.projectId !== state.activeTabId);
      if (oldestNonActive) {
        tabs = tabs.filter(t => t.projectId !== oldestNonActive.projectId);
      } else {
        // All tabs are "active" (shouldn't happen with MAX_TABS > 1), remove first
        tabs = tabs.slice(1);
      }
    }

    const newTab: TabInfo = {
      projectId: project.id,
      projectInfo: project,
      lastRoute: route ?? `/project/${project.id}/dashboard`,
    };

    const openTabs = [...tabs, newTab];
    const activeTabId = project.id;
    set({ openTabs, activeTabId, currentProject: project });
    persistTabs(openTabs, activeTabId);
  },

  closeTab: (projectId) => {
    const state = get();
    const tabIndex = state.openTabs.findIndex(t => t.projectId === projectId);
    if (tabIndex === -1) return;

    const openTabs = state.openTabs.filter(t => t.projectId !== projectId);

    let activeTabId = state.activeTabId;
    let currentProject = state.currentProject;

    if (activeTabId === projectId) {
      // Activate nearest tab
      if (openTabs.length > 0) {
        const newIndex = Math.min(tabIndex, openTabs.length - 1);
        const nextTab = openTabs[newIndex]!;
        activeTabId = nextTab.projectId;
        currentProject = nextTab.projectInfo;
      } else {
        activeTabId = null;
        currentProject = null;
      }
    }

    set({ openTabs, activeTabId, currentProject });
    persistTabs(openTabs, activeTabId);
  },

  setActiveTab: (projectId) => {
    const state = get();
    const tab = state.openTabs.find(t => t.projectId === projectId);
    if (!tab) return;

    set({ activeTabId: projectId, currentProject: tab.projectInfo });
    persistTabs(state.openTabs, projectId);
  },

  updateTabRoute: (projectId, route) => {
    const state = get();
    const openTabs = state.openTabs.map(t =>
      t.projectId === projectId ? { ...t, lastRoute: route } : t
    );
    set({ openTabs });
    persistTabs(openTabs, state.activeTabId);
  },

  updateTabProjectInfo: (projectId, info) => {
    const state = get();
    const openTabs = state.openTabs.map(t =>
      t.projectId === projectId ? { ...t, projectInfo: info } : t
    );
    const currentProject = state.activeTabId === projectId ? info : state.currentProject;
    set({ openTabs, currentProject });
    persistTabs(openTabs, state.activeTabId);
  },

  // Legacy: setCurrentProject — updates active tab's projectInfo if applicable
  setCurrentProject: (project) => {
    if (project) {
      const state = get();
      const openTabs = state.openTabs.map(t =>
        t.projectId === project.id ? { ...t, projectInfo: project } : t
      );
      set({ currentProject: project, openTabs });
      persistTabs(openTabs, state.activeTabId);
    } else {
      set({ currentProject: null });
    }
  },

  setProjects: (projects) => set({ projects }),

  setDeletedProjects: (deletedProjects) => set({ deletedProjects }),

  updateProject: (id, updates) =>
    set((state) => {
      const updatedProjects = state.projects.map((p) => (p.id === id ? { ...p, ...updates } : p));
      const updatedDeletedProjects = state.deletedProjects.map((p) => (p.id === id ? { ...p, ...updates } : p));
      const updatedCurrentProject = state.currentProject?.id === id
        ? { ...state.currentProject, ...updates }
        : state.currentProject;

      // Also update the tab's projectInfo if this project has an open tab
      const openTabs = state.openTabs.map(t =>
        t.projectId === id ? { ...t, projectInfo: { ...t.projectInfo, ...updates } } : t
      );

      persistTabs(openTabs, state.activeTabId);

      return {
        projects: updatedProjects,
        deletedProjects: updatedDeletedProjects,
        currentProject: updatedCurrentProject,
        openTabs,
      };
    }),

  removeProject: (id) =>
    set((state) => {
      const openTabs = state.openTabs.filter(t => t.projectId !== id);
      const activeTabId = state.activeTabId === id
        ? (openTabs.length > 0 ? openTabs[0]!.projectId : null)
        : state.activeTabId;

      persistTabs(openTabs, activeTabId);

      return {
        projects: state.projects.filter((p) => p.id !== id),
        deletedProjects: state.deletedProjects.filter((p) => p.id !== id),
        currentProject: state.currentProject?.id === id ? null : state.currentProject,
        openTabs,
        activeTabId,
      };
    }),
}));
