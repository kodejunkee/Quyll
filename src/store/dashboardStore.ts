import { create } from 'zustand';

interface LatestChapter {
  id: string;
  title: string;
  chapter_number: number;
  word_count: number;
  updated_at: string;
}

interface DashboardState {
  /** Per-project cached dashboard data, keyed by projectId */
  cache: Record<string, {
    counts: Record<string, number>;
    latestChapter: LatestChapter | null;
    writingStats: { totalWords: number; totalReadingTime: number };
    /** ISO timestamp of when this cache entry was last populated */
    loadedAt: string;
  }>;

  /** Set the dashboard cache for a given project */
  setDashboardData: (
    projectId: string,
    data: {
      counts: Record<string, number>;
      latestChapter: LatestChapter | null;
      writingStats: { totalWords: number; totalReadingTime: number };
    }
  ) => void;

  /** Get the cached dashboard data for a given project (or undefined) */
  getDashboardData: (projectId: string) => DashboardState['cache'][string] | undefined;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  cache: {},

  setDashboardData: (projectId, data) =>
    set((state) => ({
      cache: {
        ...state.cache,
        [projectId]: {
          ...data,
          loadedAt: new Date().toISOString(),
        },
      },
    })),

  getDashboardData: (projectId) => get().cache[projectId],
}));
