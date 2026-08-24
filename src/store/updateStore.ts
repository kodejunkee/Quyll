import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UpdateStoreState {
  history: any[];
  setHistory: (history: any[]) => void;
}

export const useUpdateStore = create<UpdateStoreState>()(
  persist(
    (set) => ({
      history: [],
      setHistory: (history) => set({ history }),
    }),
    {
      name: 'quyll-updates-history',
    }
  )
);
