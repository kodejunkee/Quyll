import { create } from 'zustand';

interface ProjectInfo {
  id: string;
  name: string;
  path: string;
  description: string;
  author: string;
  genre: string;
  last_opened_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ProjectState {
  currentProject: ProjectInfo | null;
  projects: ProjectInfo[];
  deletedProjects: ProjectInfo[];
  setCurrentProject: (project: ProjectInfo | null) => void;
  setProjects: (projects: ProjectInfo[]) => void;
  setDeletedProjects: (projects: ProjectInfo[]) => void;
  updateProject: (id: string, updates: Partial<ProjectInfo>) => void;
  removeProject: (id: string) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  currentProject: null,
  projects: [],
  deletedProjects: [],

  setCurrentProject: (project) => set({ currentProject: project }),

  setProjects: (projects) => set({ projects }),
  
  setDeletedProjects: (deletedProjects) => set({ deletedProjects }),

  updateProject: (id, updates) =>
    set((state) => ({
      projects: state.projects.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      deletedProjects: state.deletedProjects.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      currentProject:
        state.currentProject?.id === id
          ? { ...state.currentProject, ...updates }
          : state.currentProject,
    })),

  removeProject: (id) =>
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      deletedProjects: state.deletedProjects.filter((p) => p.id !== id),
      currentProject: state.currentProject?.id === id ? null : state.currentProject,
    })),
}));
