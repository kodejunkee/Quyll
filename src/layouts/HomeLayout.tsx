import { useState, useEffect } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { UpdateService, UpdateState } from '@/services/updateService';
import {
  LayersIcon,
  GearIcon,
  DownloadIcon,
  TrashIcon,
  UpdateIcon,
  InfoCircledIcon,
  HeartIcon,
  ExitIcon
} from '@radix-ui/react-icons';
import quyllBanner from '@/assets/images/quyll-banner.png';
import './HomeLayout.css';

export function HomeLayout() {
  const [updateState, setUpdateState] = useState<UpdateState>('idle');

  useEffect(() => {
    const unsubscribe = UpdateService.subscribe((state) => {
      setUpdateState(state);
    });
    setUpdateState(UpdateService.getState());
    return unsubscribe;
  }, []);
  const handleExit = async () => {
    try {
      await getCurrentWindow().close();
    } catch (e) {
      console.error('Failed to close window:', e);
    }
  };

  return (
    <div className="home-layout">
      {/* Sidebar Navigation */}
      <aside className="home-sidebar" data-tauri-drag-region>
        <div className="home-sidebar__brand">
          <img
            src={quyllBanner}
            alt="Quyll App"
            style={{ height: '50px', width: 'auto', objectFit: 'contain' }}
          />
        </div>

        <nav className="home-sidebar__nav">
          <div className="home-sidebar__section-title">Workspace</div>
          <NavLink to="/" end className={({ isActive }) => `home-sidebar__link ${isActive ? 'active' : ''}`}>
            <LayersIcon width={18} height={18} color="#A855F7" />
            <span>Projects</span>
          </NavLink>

          <NavLink to="/trash" className={({ isActive }) => `home-sidebar__link ${isActive ? 'active' : ''}`}>
            <TrashIcon width={18} height={18} color="#EF4444" />
            <span>Trash</span>
          </NavLink>

          <div className="home-sidebar__section-title">App Tools</div>

          <NavLink to="/online-backup" className={({ isActive }) => `home-sidebar__link ${isActive ? 'active' : ''}`}>
            <DownloadIcon width={18} height={18} color="#10B981" />
            <span>Online Backup</span>
          </NavLink>

          <NavLink to="/updates" className={({ isActive }) => `home-sidebar__link ${isActive ? 'active' : ''}`}>
            <div style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <UpdateIcon width={18} height={18} color="#3B82F6" />
                <span>Updates</span>
              </div>
              {['available', 'downloading', 'installing', 'restart-required'].includes(updateState) && (
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3B82F6' }} />
              )}
            </div>
          </NavLink>



          <NavLink to="/support" className={({ isActive }) => `home-sidebar__link ${isActive ? 'active' : ''}`}>
            <HeartIcon width={18} height={18} color="#EC4899" />
            <span>Support</span>
          </NavLink>

          <NavLink to="/about" className={({ isActive }) => `home-sidebar__link ${isActive ? 'active' : ''}`}>
            <InfoCircledIcon width={18} height={18} color="#6366F1" />
            <span>About</span>
          </NavLink>
        </nav>

      </aside>

      {/* Main Content (Dashboard/Settings etc) */}
      <main className="home-layout__main">
        <Outlet />
      </main>
    </div>
  );
}
