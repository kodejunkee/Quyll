import { type ReactNode } from 'react';
import './Toolbar.css';

interface ToolbarProps {
  title: string;
  icon?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}

function Toolbar({ title, icon, actions, children }: ToolbarProps) {
  return (
    <div className="toolbar">
      <div className="toolbar__left">
        {icon && <span className="toolbar__icon">{icon}</span>}
        <h1 className="toolbar__title">{title}</h1>
      </div>
      {actions && <div className="toolbar__actions">{actions}</div>}
      {children}
    </div>
  );
}

export { Toolbar };
export type { ToolbarProps };
