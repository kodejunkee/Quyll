import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '@/store/themeStore';
import './ThemeToggle.css';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { theme, setTheme } = useThemeStore();
  const isLight = theme === 'light';
  const label = isLight ? 'Switch to dark mode' : 'Switch to light mode';

  return (
    <button
      type="button"
      className={`theme-toggle ${className}`.trim()}
      onClick={() => setTheme(isLight ? 'dark' : 'light')}
      aria-label={label}
      aria-pressed={isLight}
      title={label}
    >
      {isLight ? <Moon size={17} /> : <Sun size={17} />}
    </button>
  );
}
