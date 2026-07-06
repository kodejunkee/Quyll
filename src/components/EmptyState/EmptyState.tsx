import { type ElementType, type ReactNode, isValidElement, createElement } from 'react';
import { Button } from '@/components/Button';
import './EmptyState.css';

interface EmptyStateProps {
  /** Lucide icon component or a ReactNode */
  icon?: ElementType | ReactNode;
  title: string;
  description?: string;
  /** Shorthand: renders a primary button with this label */
  actionLabel?: string;
  onAction?: () => void;
  /** Custom action slot (overrides actionLabel/onAction) */
  action?: ReactNode;
}

/** Check if a value is a React component (function, class, or forwardRef). */
function isComponent(value: unknown): value is ElementType {
  if (typeof value === 'function') return true;
  if (typeof value === 'object' && value !== null && '$$typeof' in value) return true;
  return false;
}

function EmptyState({ icon, title, description, actionLabel, onAction, action }: EmptyStateProps) {
  let iconNode: React.ReactNode = null;
  if (icon) {
    if (isValidElement(icon)) {
      iconNode = icon;
    } else if (isComponent(icon)) {
      iconNode = createElement(icon, { size: 40 });
    }
  }

  return (
    <div className="empty-state">
      {iconNode && <div className="empty-state__icon">{iconNode}</div>}
      <h3 className="empty-state__title">{title}</h3>
      {description && (
        <p className="empty-state__description">{description}</p>
      )}
      {action && <div className="empty-state__action">{action}</div>}
      {!action && actionLabel && onAction && (
        <div className="empty-state__action">
          <Button variant="primary" onClick={onAction}>{actionLabel}</Button>
        </div>
      )}
    </div>
  );
}

export { EmptyState };
export type { EmptyStateProps };
