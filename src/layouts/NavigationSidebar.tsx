import { NavLink, useLocation, useParams } from 'react-router-dom';
import type { CSSProperties } from 'react';
import quyllBanner from '@/assets/images/quyll-banner.png';
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
  BookA,
  Settings,
  Search
, StickyNote } from 'lucide-react';
import { GlobalSearch } from '@/components/GlobalSearch/GlobalSearch';
import './NavigationSidebar.css';
import { useLayoutStore } from '@/store/layoutStore';

interface NavigationSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onOpenSettings?: () => void;
}

const NAV_SECTIONS = [
  {
    title: 'NAVIGATION',
    items: [
      { path: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, colorKey: 'dashboard' },
      { path: 'chapters', label: 'Chapters', icon: BookOpen, colorKey: 'chapters', useLastActive: true },
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
      { path: 'glossary', label: 'Glossary', icon: BookA, colorKey: 'glossary' },
    ],
  },
  {
    title: 'TOOLS',
    items: [
      { path: 'outliner', label: 'Outliner', icon: StickyNote, colorKey: 'outline' },
      { path: 'plot-planner', label: 'Plot Planner', icon: GitBranch, colorKey: 'plot_planner', disabled: true },
      { path: 'trash', label: 'Trash Bin', icon: Trash2, colorKey: 'trash' },
    ],
  },
] as const;

function accentStyle(colorKey: string): CSSProperties {
  return { '--nav-accent': `var(--color-icon-${colorKey})` } as CSSProperties;
}

export function NavigationSidebar({ collapsed, onToggle, onOpenSettings }: NavigationSidebarProps) {
  const { projectId } = useParams<{ projectId: string }>();
  const { lastActiveChapterId } = useLayoutStore();

  return (
    <nav className={`nav-sidebar ${collapsed ? 'nav-sidebar--collapsed' : ''}`}>
      <div className="nav-sidebar__header">
        {!collapsed && (
          <img 
            src={quyllBanner} 
            alt="Quyll Logo" 
            className="nav-sidebar__header-logo" 
            style={{ height: '44px', objectFit: 'contain', marginLeft: '-2px', marginTop: '-10px', marginBottom: '-10px', filter: 'var(--theme-logo-filter, none)' }} 
          />
        )}
        <button
          className="nav-sidebar__toggle"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand (Ctrl+\\)' : 'Collapse (Ctrl+\\)'}
        >
          {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      <div style={{ padding: '0 14px 10px 14px', display: collapsed ? 'none' : 'block' }}>
        <GlobalSearch />
      </div>

      {collapsed && (
        <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: '10px' }}>
          <button 
            className="nav-sidebar__toggle" 
            style={{ width: '32px', height: '32px' }}
            onClick={onToggle}
            title="Search (Ctrl+K)"
          >
            <Search size={18} />
          </button>
        </div>
      )}

      <div className="nav-sidebar__items">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="nav-sidebar__section">
            {!collapsed && <div className="nav-sidebar__section-title">{section.title}</div>}
            
            {section.items.map((item) => {
              const { path, label, icon: Icon, colorKey } = item;
              const useLastActive = 'useLastActive' in item ? item.useLastActive : false;
              const isDisabled = 'disabled' in item ? item.disabled : false;
              
              const targetPath = useLastActive && lastActiveChapterId 
                ? `/project/${projectId}/${path}/${lastActiveChapterId}`
                : `/project/${projectId}/${path}`;

              return (
                <NavLink
                  key={path}
                  to={targetPath}
                  className={({ isActive }) =>
                    `nav-sidebar__link ${isActive ? 'nav-sidebar__link--active' : ''}`
                  }
                  title={collapsed ? label : undefined}
                  style={{
                    ...accentStyle(colorKey),
                    opacity: isDisabled ? 0.5 : 1,
                    pointerEvents: isDisabled ? 'none' : 'auto'
                  } as CSSProperties}
                >
                  <Icon
                    size={18}
                    className="nav-sidebar__link-icon"
                    style={{ color: `var(--color-icon-${colorKey})` }}
                  />
                  {!collapsed && (
                    <span className="nav-sidebar__link-label">
                      {label} {isDisabled && <span style={{ fontSize: '10px', marginLeft: '6px', opacity: 0.7 }}>(WIP)</span>}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </div>
      <div className="nav-sidebar__footer">
        <NavLink
          to="/"
          className="nav-sidebar__link"
          title={collapsed ? "Back to projects" : undefined}
          style={{ '--nav-accent': 'var(--color-text-secondary)' } as CSSProperties}
        >
          <Home size={18} className="nav-sidebar__link-icon" />
          {!collapsed && <span className="nav-sidebar__link-label">Back to projects</span>}
        </NavLink>
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="nav-sidebar__link"
            title={collapsed ? "Project Settings" : undefined}
            style={{ 
              '--nav-accent': 'var(--color-text-secondary)',
              background: 'transparent',
              border: 'none',
              width: '100%',
              textAlign: 'left',
              padding: '6px 10px',
              fontFamily: 'inherit',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: 'pointer',
              color: 'var(--color-text-secondary)'
            } as CSSProperties}
          >
            <Settings size={18} className="nav-sidebar__link-icon" />
            {!collapsed && <span className="nav-sidebar__link-label">Project Settings</span>}
          </button>
        )}
      </div>
    </nav>
  );
}
