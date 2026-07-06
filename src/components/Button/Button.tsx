import { type ButtonHTMLAttributes, type ReactNode, forwardRef } from 'react';
import './Button.css';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  fullWidth?: boolean;
  children?: ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'secondary',
      size = 'md',
      icon,
      iconPosition = 'left',
      loading = false,
      fullWidth = false,
      disabled,
      className = '',
      children,
      ...rest
    },
    ref,
  ) => {
    const classes = [
      'btn',
      `btn--${variant}`,
      `btn--${size}`,
      fullWidth && 'btn--full-width',
      loading && 'btn--loading',
      icon && !children && 'btn--icon-only',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled ?? loading}
        {...rest}
      >
        {loading && <span className="btn__spinner" aria-hidden="true" />}
        {!loading && icon && iconPosition === 'left' && (
          <span className="btn__icon">{icon}</span>
        )}
        {children && <span className="btn__label">{children}</span>}
        {!loading && icon && iconPosition === 'right' && (
          <span className="btn__icon">{icon}</span>
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';

export { Button };
export type { ButtonProps, ButtonVariant, ButtonSize };
