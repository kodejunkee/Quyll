import { type HTMLAttributes, type ReactNode } from 'react';
import './Card.css';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outlined' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
  title?: string;
  children: ReactNode;
}

function Card({
  variant = 'default',
  padding = 'md',
  interactive = false,
  title,
  className = '',
  children,
  ...rest
}: CardProps) {
  const classes = [
    'card',
    `card--${variant}`,
    `card--pad-${padding}`,
    interactive && 'card--interactive',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} {...rest}>
      {title && <h3 className="card__title">{title}</h3>}
      {children}
    </div>
  );
}

export { Card };
export type { CardProps };
