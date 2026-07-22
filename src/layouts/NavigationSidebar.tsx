import { NavLink, useParams } from 'react-router-dom';
import type { CSSProperties } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  MapPin,
  Building2,
  Dna,
  Package,
  Globe,
  ScrollText,
  Clock,
  GitBranch,
  PanelLeft,
  PanelLeftClose,
  Home,
  Trash2,
  Share2
} from 'lucide-react';
import './NavigationSidebar.css';

interface NavigationSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const NAV_SECTIONS = [
  {
    title: 'NAVIGATION',
    items: [
      { path: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, colorKey: 'dashboard' },
      { path: 'chapters', label: 'Chapters', icon: BookOpen, colorKey: 'chapters' },
    ],
  },
  {
    title: 'WORLD DATABASE',
    items: [
      { path: 'characters', label: 'Characters', icon: Users, colorKey: 'character' },
      { path: 'locations', label: 'Locations', icon: MapPin, colorKey: 'location' },
      { path: 'organizations', label: 'Organizations', icon: Building2, colorKey: 'organization' },
      { path: 'species', label: 'Species & Races', icon: Dna, colorKey: 'species' },
      { path: 'items', label: 'Items & Artefacts', icon: Package, colorKey: 'item' },
      { path: 'world-systems', label: 'World Systems', icon: Globe, colorKey: 'world_system' },
      { path: 'lore', label: 'Lore', icon: ScrollText, colorKey: 'lore' },
      { path: 'timeline', label: 'Timeline', icon: Clock, colorKey: 'timeline_event' },
      { path: 'plot-planner', label: 'Plot Planner', icon: GitBranch, colorKey: 'plot_planner' },
    ],
  },
] as const;

function accentStyle(colorKey: string): CSSProperties {
  return { '--nav-accent': `var(--color-icon-${colorKey})` } as CSSProperties;
}

export function NavigationSidebar({ collapsed, onToggle }: NavigationSidebarProps) {
  const { projectId } = useParams<{ projectId: string }>();

  return (
    <nav className={`nav-sidebar ${collapsed ? 'nav-sidebar--collapsed' : ''}`}>
      <div className="nav-sidebar__header">
        {!collapsed && <span className="nav-sidebar__header-label">SIDEBAR</span>}
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
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="nav-sidebar__section">
            {!collapsed && <div className="nav-sidebar__section-title">{section.title}</div>}
            
            {section.items.map(({ path, label, icon: Icon, colorKey }) => (
              <NavLink
                key={path}
                to={`/project/${projectId}/${path}`}
                className={({ isActive }) =>
                  `nav-sidebar__link ${isActive ? 'nav-sidebar__link--active' : ''}`
                }
                title={collapsed ? label : undefined}
                style={accentStyle(colorKey)}
              >
                <Icon
                  size={18}
                  className="nav-sidebar__link-icon"
                  style={{ color: `var(--color-icon-${colorKey})` }}
                />
                {!collapsed && <span className="nav-sidebar__link-label">{label}</span>}
              </NavLink>
            ))}
          </div>
        ))}

        <div className="nav-sidebar__section">
          {!collapsed && <div className="nav-sidebar__section-title">TOOLS</div>}
          <NavLink
            to={`/project/${projectId}/graph`}
            className={({ isActive }) =>
              `nav-sidebar__link ${isActive ? 'nav-sidebar__link--active' : ''}`
            }
            title={collapsed ? 'Knowledge Graph' : undefined}
            style={accentStyle('graph')}
          >
            <Share2
              size={18}
              className="nav-sidebar__link-icon"
              style={{ color: 'var(--color-icon-graph)' }}
            />
            {!collapsed && <span className="nav-sidebar__link-label">Knowledge Graph</span>}
          </NavLink>
          <NavLink
            to={`/project/${projectId}/trash`}
            className={({ isActive }) =>
              `nav-sidebar__link ${isActive ? 'nav-sidebar__link--active' : ''}`
            }
            title={collapsed ? 'Trash Bin' : undefined}
            style={accentStyle('trash')}
          >
            <Trash2
              size={18}
              className="nav-sidebar__link-icon"
              style={{ color: 'var(--color-icon-trash)' }}
            />
            {!collapsed && <span className="nav-sidebar__link-label">Trash Bin</span>}
          </NavLink>
        </div>
      </div>
      <div className="nav-sidebar__footer">
        <NavLink
          to="/"
          className="nav-sidebar__link"
          title={collapsed ? 'Back to projects' : undefined}
          style={accentStyle('home')}
        >
          <Home size={18} className="nav-sidebar__link-icon" />
          {!collapsed && <span className="nav-sidebar__link-label">Back to projects</span>}
        </NavLink>
      </div>
    </nav>
  );
}
