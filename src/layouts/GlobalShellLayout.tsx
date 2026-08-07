import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Home, Plus, Square, Copy, Minus, Sun, Moon } from 'lucide-react';
import { useThemeStore } from '@/store/themeStore';
import './GlobalShellLayout.css';

export function GlobalShellLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useThemeStore();

  // Mock tabs based on the current location just for visual effect
  // In a real implementation, this would read from the projectStore's open tabs
  const isHome = location.pathname === '/';
  
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const appWindow = getCurrentWindow();
    
    // Check initial state
    appWindow.isMaximized().then(setIsMaximized).catch(console.error);

    // Listen for resize events to update the icon
    const unlisten = appWindow.onResized(async () => {
      try {
        const maximized = await appWindow.isMaximized();
        setIsMaximized(maximized);
      } catch (e) {
        console.error('Failed to check maximize state on resize', e);
      }
    });

    return () => {
      unlisten.then(f => f()).catch(console.error);
    };
  }, []);
  
  const handleMinimize = async () => {
    try {
      await getCurrentWindow().minimize();
    } catch (e) {
      console.error('Failed to minimize window:', e);
    }
  };

  const handleToggleMaximize = async () => {
    try {
      await getCurrentWindow().toggleMaximize();
    } catch (e) {
      console.error('Failed to toggle maximize window:', e);
    }
  };

  return (
    <div className="global-shell">
      {/* Custom Tauri Titlebar / Global Top Nav */}
      <header className="global-top-bar" data-tauri-drag-region>
        {/* Left: Brand */}
        <div className="global-top-bar__brand" onClick={() => navigate('/')}>
          <Home size={20} className="global-top-bar__logo" />
        </div>

        {/* Center: Tabs */}
        <div className="global-top-bar__tabs" data-tauri-drag-region>
          {/* Mock Tab for visual effect */}
          {!isHome && (
            <button className="global-tab active" type="button">
              Active Project
            </button>
          )}

          <button className="global-tab-new" title="New Project" type="button" onClick={() => navigate('/')}>
            <Plus size={14} />
          </button>
        </div>

        {/* Right: Window Controls & Profile */}
        <div className="global-top-bar__actions">
          <button 
            className="global-action-btn"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title="Toggle theme"
            type="button"
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          <button 
            className="global-window-btn"
            onClick={handleToggleMaximize}
            title={isMaximized ? "Restore Down" : "Maximize"}
            type="button"
          >
            {isMaximized ? <Copy size={13} /> : <Square size={13} />}
          </button>

          {/* Tauri Window Minimize */}
          <button 
            className="global-window-btn minimize"
            onClick={handleMinimize}
            title="Minimize"
            type="button"
          >
            <Minus size={14} />
          </button>
        </div>
      </header>

      {/* Main Content Area (renders HomeLayout or AppLayout) */}
      <main className="global-shell__main">
        <Outlet />
      </main>
    </div>
  );
}
