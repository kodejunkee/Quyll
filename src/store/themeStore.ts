import { create } from 'zustand';
import type { Theme } from '@/types/common';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('quyll-theme', theme);
}

const stored = (typeof localStorage !== 'undefined'
  ? localStorage.getItem('quyll-theme')
  : null) as Theme | null;

const initialTheme: Theme = stored === 'light' ? 'light' : 'dark';
applyTheme(initialTheme);

export const useThemeStore = create<ThemeState>((set) => ({
  theme: initialTheme,
  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },
  toggleTheme: () =>
    set((state) => {
      const next: Theme = state.theme === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      return { theme: next };
    }),
}));
