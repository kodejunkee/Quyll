import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Plus, Square, Copy, Minus, Sun, Moon, X } from 'lucide-react';
import { HomeIcon, LayersIcon } from '@radix-ui/react-icons';
import { useThemeStore } from '@/store/themeStore';
import { useProjectStore } from '@/store/projectStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { OpenProjectModal } from '@/components/Modal/OpenProjectModal';
import './GlobalShellLayout.css';
import './GlobalShellLayout-Menu.css';

export function GlobalShellLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useThemeStore();
  const { openTabs, activeTabId, closeTab, setActiveTab } = useProjectStore();
  const { evictProject } = useWorkspaceStore();
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isOpenProjectModalOpen, setIsOpenProjectModalOpen] = useState(false);

  const isHome = location.pathname === '/' || !location.pathname.startsWith('/project/');

  const handleCloseTab = (projectId: string) => {
    const wasActive = projectId === activeTabId;
    const tabIndex = openTabs.findIndex(t => t.projectId === projectId);
    
    // Evict cached entities for this project
    evictProject(projectId);
    closeTab(projectId);

    if (wasActive) {
      const remaining = openTabs.filter(t => t.projectId !== projectId);
      if (remaining.length > 0) {
        const newIndex = Math.min(tabIndex, remaining.length - 1);
        navigate(remaining[newIndex]!.lastRoute);
      } else {
        navigate('/');
      }
    }
  };
  
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (isMenuOpen) {
        const target = e.target as HTMLElement;
        if (!target.closest('.global-tab-new-wrapper')) {
          setIsMenuOpen(false);
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  // Keep Tauri's custom styling
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

  const handleClose = async () => {
    try {
      await getCurrentWindow().close();
    } catch (e) {
      console.error('Failed to close window:', e);
    }
  };

  return (
    <div className="global-shell">
      {/* Custom Tauri Titlebar / Global Top Nav */}
      <header className="global-top-bar" data-tauri-drag-region>
        {/* Left: Home Button */}
        <div className={`global-top-bar__home-btn${isHome ? ' global-top-bar__home-btn--active' : ''}`} onClick={() => navigate('/')}>
          <HomeIcon width={20} height={20} className="global-top-bar__home-icon" />
        </div>

        {/* Center: Tabs */}
        <div className="global-top-bar__tabs-container">
          <div className="global-top-bar__tabs-scroll" data-tauri-drag-region>
            {openTabs.map((tab) => (
              <button
                key={tab.projectId}
                className={`global-tab${(!isHome && tab.projectId === activeTabId) ? ' active' : ''}`}
                type="button"
                style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                onClick={() => {
                  setActiveTab(tab.projectId);
                  navigate(tab.lastRoute);
                }}
                onAuxClick={(e) => {
                  if (e.button === 1) handleCloseTab(tab.projectId);
                }}
              >
                <span className="global-tab__name">{tab.projectInfo.name}</span>
                <span
                  className="global-tab__close"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCloseTab(tab.projectId);
                  }}
                >
                  <X size={12} />
                </span>
              </button>
            ))}
          </div>

          <div className="global-top-bar__divider" style={{ margin: '0 4px', opacity: 0.5 }} />

          <div className="global-tab-new-wrapper" style={{ position: 'relative', WebkitAppRegion: 'no-drag' } as any}>
            <button 
              className={`global-tab-new ${isMenuOpen ? 'active' : ''}`}
              title="Project Menu" 
              type="button" 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <Plus size={14} />
            </button>
            {isMenuOpen && (
              <div className="global-new-project-menu">
                <button 
                  className="global-new-project-menu__item"
                  onClick={() => {
                    setIsMenuOpen(false);
                    navigate('/');
                    setTimeout(() => {
                      window.dispatchEvent(new Event('open-create-project'));
                    }, 50);
                  }}
                >
                  <Plus size={14} /> New Project
                </button>
                <button 
                  className="global-new-project-menu__item"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsOpenProjectModalOpen(true);
                  }}
                >
                  <LayersIcon width={14} height={14} /> Open Project
                </button>
              </div>
            )}
          </div>
          
          {/* Spacer to push window controls to the right and allow window dragging */}
          <div style={{ flex: 1, height: '100%', WebkitAppRegion: 'drag' } as any} data-tauri-drag-region />
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

          <div className="global-top-bar__divider" />

          {/* Tauri Window Minimize */}
          <button 
            className="global-window-btn minimize"
            onClick={handleMinimize}
            title="Minimize"
            type="button"
          >
            <Minus size={14} />
          </button>

          <button 
            className="global-window-btn maximize"
            onClick={handleToggleMaximize}
            title={isMaximized ? "Restore Down" : "Maximize"}
            type="button"
          >
            {isMaximized ? <Copy size={13} /> : <Square size={13} />}
          </button>

          {/* Tauri Window Close */}
          <button 
            className="global-window-btn close-btn"
            onClick={handleClose}
            title="Close"
            type="button"
          >
            <X size={14} />
          </button>
        </div>
      </header>

      {/* Main Content Area (renders HomeLayout or AppLayout) */}
      <main className="global-shell__main">
        <Outlet />
      </main>
      
      <OpenProjectModal 
        open={isOpenProjectModalOpen} 
        onClose={() => setIsOpenProjectModalOpen(false)} 
      />
    </div>
  );
}
