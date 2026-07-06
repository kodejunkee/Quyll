import type { ReactNode } from 'react';
import './Sidebar.css';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
  className?: string;
}

export function Sidebar({ collapsed, children, className = '' }: SidebarProps) {
  return (
    <aside
      className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''} ${className}`}
      aria-label="Sidebar"
    >
      <div className="sidebar__content">{children}</div>
    </aside>
  );
}
