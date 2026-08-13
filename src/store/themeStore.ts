import { create } from 'zustand';

export type Theme = 'dark' | 'light' | 'oceans-blue' | 'midnight-violet';
export type Accent = 'blue' | 'pink' | 'green' | 'grey' | 'white' | 'fire' | 'apple' | 'yellow';

interface ThemeState {
  theme: Theme;
  accent: Accent;
  defaultFont: string;
  authorName: string;
  setTheme: (theme: Theme) => void;
  setAccent: (accent: Accent) => void;
  setDefaultFont: (font: string) => void;
  setAuthorName: (name: string) => void;
}

function applyThemeAndAccent(theme: Theme, accent: Accent) {
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.setAttribute('data-accent', accent);
  localStorage.setItem('quyll-theme', theme);
  localStorage.setItem('quyll-accent', accent);
}

const storedTheme = (typeof localStorage !== 'undefined'
  ? localStorage.getItem('quyll-theme')
  : null) as Theme | null;

const storedAccent = (typeof localStorage !== 'undefined'
  ? localStorage.getItem('quyll-accent')
  : null) as Accent | null;

const storedDefaultFont = typeof localStorage !== 'undefined'
  ? localStorage.getItem('quyll-default-font')
  : null;

const storedAuthorName = typeof localStorage !== 'undefined'
  ? localStorage.getItem('quyll-author-name')
  : null;

const initialTheme: Theme = storedTheme || 'dark';
const initialAccent: Accent = storedAccent || 'blue';
const initialDefaultFont: string = storedDefaultFont || 'Inter';
const initialAuthorName: string = storedAuthorName || '';

applyThemeAndAccent(initialTheme, initialAccent);

export const useThemeStore = create<ThemeState>((set) => ({
  theme: initialTheme,
  accent: initialAccent,
  defaultFont: initialDefaultFont,
  authorName: initialAuthorName,
  setTheme: (theme) => {
    set((state) => {
      applyThemeAndAccent(theme, state.accent);
      return { theme };
    });
  },
  setAccent: (accent) => {
    set((state) => {
      applyThemeAndAccent(state.theme, accent);
      return { accent };
    });
  },
  setDefaultFont: (font) => {
    localStorage.setItem('quyll-default-font', font);
    set({ defaultFont: font });
  },
  setAuthorName: (name) => {
    localStorage.setItem('quyll-author-name', name);
    set({ authorName: name });
  },
}));
