import { NavLink, useParams } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  MapPin,
  Building2,
  Dna,
  Package,
  Sparkles,
  ScrollText,
  Clock,
  GitBranch,
  Settings,
  PanelLeftClose,
  PanelLeft,
  Feather,
} from 'lucide-react';
import './NavigationSidebar.css';

interface NavigationSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const NAV_ITEMS = [
  { path: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: 'chapters', label: 'Chapters', icon: BookOpen },
  { path: 'characters', label: 'Characters', icon: Users },
  { path: 'locations', label: 'Locations', icon: MapPin },
  { path: 'organizations', label: 'Organizations', icon: Building2 },
  { path: 'species', label: 'Species', icon: Dna },
  { path: 'items', label: 'Items', icon: Package },
  { path: 'magic-systems', label: 'Magic Systems', icon: Sparkles },
  { path: 'lore', label: 'Lore', icon: ScrollText },
  { path: 'timeline', label: 'Timeline', icon: Clock },
  { path: 'plot-planner', label: 'Plot Planner', icon: GitBranch },
] as const;

export function NavigationSidebar({ collapsed, onToggle }: NavigationSidebarProps) {
  const { projectId } = useParams<{ projectId: string }>();

  return (
    <nav className={`nav-sidebar ${collapsed ? 'nav-sidebar--collapsed' : ''}`}>
      <div className="nav-sidebar__header">
        <div className="nav-sidebar__brand">
          <Feather size={20} className="nav-sidebar__logo" />
          {!collapsed && <span className="nav-sidebar__title">Quyll</span>}
        </div>
        <button
          className="nav-sidebar__toggle"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand (Ctrl+B)' : 'Collapse (Ctrl+B)'}
        >
          {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      <div className="nav-sidebar__items">
        {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={`/project/${projectId}/${path}`}
            className={({ isActive }) =>
              `nav-sidebar__link ${isActive ? 'nav-sidebar__link--active' : ''}`
            }
            title={collapsed ? label : undefined}
          >
            <Icon size={18} className="nav-sidebar__link-icon" />
            {!collapsed && <span className="nav-sidebar__link-label">{label}</span>}
          </NavLink>
        ))}
      </div>

      <div className="nav-sidebar__footer">
        <NavLink
          to={`/project/${projectId}/settings`}
          className={({ isActive }) =>
            `nav-sidebar__link ${isActive ? 'nav-sidebar__link--active' : ''}`
          }
          title={collapsed ? 'Settings' : undefined}
        >
          <Settings size={18} className="nav-sidebar__link-icon" />
          {!collapsed && <span className="nav-sidebar__link-label">Settings</span>}
        </NavLink>
      </div>
    </nav>
  );
}
