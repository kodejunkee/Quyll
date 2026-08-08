import { Outlet, NavLink } from 'react-router-dom';
import { getCurrentWindow } from '@tauri-apps/api/window';
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
          <NavLink to="/" end className={({ isActive }) => `home-sidebar__link ${isActive ? 'active' : ''}`}>
            <LayersIcon width={18} height={18} color="#A855F7" />
            <span>Projects</span>
          </NavLink>

          <NavLink to="/trash" className={({ isActive }) => `home-sidebar__link ${isActive ? 'active' : ''}`}>
            <TrashIcon width={18} height={18} color="#EF4444" />
            <span>Trash</span>
          </NavLink>

          <div className="home-sidebar__section-title">App Tools</div>

          <NavLink to="/import-export" className={({ isActive }) => `home-sidebar__link ${isActive ? 'active' : ''}`}>
            <DownloadIcon width={18} height={18} color="#10B981" />
            <span>Import & Export</span>
          </NavLink>

          <NavLink to="/updates" className={({ isActive }) => `home-sidebar__link ${isActive ? 'active' : ''}`}>
            <UpdateIcon width={18} height={18} color="#3B82F6" />
            <span>Updates</span>
          </NavLink>

          <NavLink to="/settings" className={({ isActive }) => `home-sidebar__link ${isActive ? 'active' : ''}`}>
            <GearIcon width={18} height={18} color="#F59E0B" />
            <span>Settings</span>
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

        {/* Exit Button */}
        <div className="home-sidebar__footer">
          <button className="home-sidebar__link home-sidebar__exit" onClick={handleExit}>
            <ExitIcon width={18} height={18} color="#F87171" />
            <span>Exit</span>
          </button>
        </div>
      </aside>

      {/* Main Content (Dashboard/Settings etc) */}
      <main className="home-layout__main">
        <Outlet />
      </main>
    </div>
  );
}
