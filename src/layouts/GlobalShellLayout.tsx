import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import { Square, Minus, Bot } from 'lucide-react';
import { PlusIcon, CopyIcon, GearIcon, Cross2Icon, HomeIcon, LayersIcon } from '@radix-ui/react-icons';
import { useThemeStore } from '@/store/themeStore';
import { useProjectStore } from '@/store/projectStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useAiStore } from '@/store/aiStore';
import { OpenProjectModal } from '@/components/Modal/OpenProjectModal';
import { CreateProjectModal } from '@/components/Modal/CreateProjectModal';
import { GlobalSettingsModal } from '@/features/settings/components';
import { AIChatPanel } from '@/features/ai/components/AIChatPanel';
import { UpdateService, UpdateState } from '@/services/updateService';
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
  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState(false);
  const [updateState, setUpdateState] = useState<UpdateState>('idle');
  const [updateProgress, setUpdateProgress] = useState(0);

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

  useEffect(() => {
    const unsubscribe = UpdateService.subscribe((state, progress) => {
      setUpdateState(state);
      if (progress !== undefined) setUpdateProgress(progress);
    });
    
    // Auto check on startup
    if (UpdateService.getState() === 'idle') {
      UpdateService.checkForUpdates(true);
    } else {
      setUpdateState(UpdateService.getState());
      setUpdateProgress((UpdateService as any).progress || 0);
    }
    
    return unsubscribe;
  }, []);

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

  const { isAiActive, isAiStarting, togglePanel, startEngine } = useAiStore();
  
  const handleToggleAiPanel = async () => {
    togglePanel();
    if (!isAiActive && !isAiStarting) {
      await startEngine();
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
                  <Cross2Icon width={12} height={12} />
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
              <PlusIcon width={14} height={14} />
            </button>
            {isMenuOpen && (
              <div className="global-new-project-menu">
                <button 
                  className="global-new-project-menu__item"
                  onClick={() => {
                    setIsMenuOpen(false);
                    window.dispatchEvent(new Event('open-create-project'));
                  }}
                >
                  <PlusIcon width={14} height={14} /> New Project
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
          {['available', 'downloading', 'installing', 'restart-required'].includes(updateState) && (
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'var(--color-primary)',
                color: 'white',
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                marginRight: '8px',
                whiteSpace: 'nowrap'
              }}
              onClick={() => {
                if (updateState === 'restart-required') {
                  UpdateService.installAndRestart();
                } else {
                  navigate('/updates');
                }
              }}
            >
              {updateState === 'restart-required' ? 'Restart App' : 
               (updateState === 'downloading' || updateState === 'installing') ? `Downloading... ${updateProgress}%` :
               'Update Available'}
            </div>
          )}

          {/* Start AI Engine Button */}
          <button 
            className={`global-action-btn ${isAiStarting ? 'pulse-anim' : ''}`}
            onClick={handleToggleAiPanel}
            title={isAiActive ? "Open AI Chat" : "Start AI Engine & Open Chat"}
            type="button"
            style={{ position: 'relative' }}
          >
            <Bot size={15} />
            <div style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: isAiActive ? 'var(--color-success, #10b981)' : 'var(--color-error, #ef4444)',
              border: '1px solid var(--color-surface)',
              transition: 'background-color 0.3s ease'
            }} />
          </button>

          <button 
            className="global-action-btn"
            onClick={() => setIsGlobalSettingsOpen(true)}
            title="Settings"
            type="button"
          >
            <GearIcon width={14} height={14} />
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
            {isMaximized ? <CopyIcon width={13} height={13} /> : <Square size={13} />}
          </button>

          {/* Tauri Window Close */}
          <button 
            className="global-window-btn close-btn"
            onClick={handleClose}
            title="Close"
            type="button"
          >
            <Cross2Icon width={14} height={14} />
          </button>
        </div>
      </header>

      {/* Main Content Area (renders HomeLayout or AppLayout) */}
      <main className="global-shell__main">
        <Outlet />
      </main>
      
      <AIChatPanel />
      
      <CreateProjectModal />
      {/* Open Project Modal */}
      <OpenProjectModal 
        open={isOpenProjectModalOpen} 
        onClose={() => setIsOpenProjectModalOpen(false)} 
      />
      <GlobalSettingsModal 
        isOpen={isGlobalSettingsOpen} 
        onClose={() => setIsGlobalSettingsOpen(false)} 
      />
    </div>
  );
}
