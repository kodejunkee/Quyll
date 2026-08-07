import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { getCurrentWindow } from '@tauri-apps/api/window';
import {
  FolderOpen,
  Settings,
  Download,
  Trash2,
  RefreshCw,
  Info,
  HelpCircle,
  LogOut
} from 'lucide-react';
import quyllBanner from '@/assets/images/quyll-banner.png';
import './HomeLayout.css';

export function HomeLayout() {
  const navigate = useNavigate();

  const handleExit = async () => {
    try {
      await getCurrentWindow().close();
    } catch (e) {
      console.error('Failed to close window:', e);
    }
  };

  return (
    <div className="home-layout">
      {/* Left Sidebar */}
      <aside className="home-sidebar">
        <div className="home-sidebar__brand">
          <img
            src={quyllBanner}
            alt="Quyll App"
            style={{ height: '50px', width: 'auto', objectFit: 'contain' }}
          />
        </div>

        <nav className="home-sidebar__nav">
          <NavLink to="/" end className={({ isActive }) => `home-sidebar__link ${isActive ? 'active' : ''}`}>
            <FolderOpen size={16} />
            <span>Projects</span>
          </NavLink>

          <div className="home-sidebar__section-title">App Tools</div>

          <NavLink to="/settings" className={({ isActive }) => `home-sidebar__link ${isActive ? 'active' : ''}`}>
            <Settings size={16} />
            <span>Settings</span>
          </NavLink>

          <NavLink to="/import-export" className={({ isActive }) => `home-sidebar__link ${isActive ? 'active' : ''}`}>
            <Download size={16} />
            <span>Import & Export</span>
          </NavLink>

          <NavLink to="/trash" className={({ isActive }) => `home-sidebar__link ${isActive ? 'active' : ''}`}>
            <Trash2 size={16} />
            <span>Trash</span>
          </NavLink>

          <NavLink to="/updates" className={({ isActive }) => `home-sidebar__link ${isActive ? 'active' : ''}`}>
            <RefreshCw size={16} />
            <span>Updates</span>
          </NavLink>

          <NavLink to="/about" className={({ isActive }) => `home-sidebar__link ${isActive ? 'active' : ''}`}>
            <Info size={16} />
            <span>About</span>
          </NavLink>

          <NavLink to="/support" className={({ isActive }) => `home-sidebar__link ${isActive ? 'active' : ''}`}>
            <HelpCircle size={16} />
            <span>Support</span>
          </NavLink>
        </nav>

        <div className="home-sidebar__footer">
          <button className="home-sidebar__link home-sidebar__exit" onClick={handleExit} type="button">
            <LogOut size={16} />
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
