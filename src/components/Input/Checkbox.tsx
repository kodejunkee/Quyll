import { type InputHTMLAttributes, forwardRef } from 'react';
import './Checkbox.css';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  hint?: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, hint, id, className = '', ...rest }, ref) => {
    const inputId = id ?? `checkbox-${label.toLowerCase().replace(/\s+/g, '-')}`;

    return (
      <div className={`checkbox-group ${className}`}>
        <div className="checkbox-group__control">
          <input
            ref={ref}
            type="checkbox"
            id={inputId}
            className="checkbox-group__input"
            aria-describedby={hint ? `${inputId}-hint` : undefined}
            {...rest}
          />
          <label className="checkbox-group__label" htmlFor={inputId}>
            {label}
          </label>
        </div>
        {hint && (
          <p className="checkbox-group__hint" id={`${inputId}-hint`}>
            {hint}
          </p>
        )}
      </div>
    );
  },
);

Checkbox.displayName = 'Checkbox';

export { Checkbox };
export type { CheckboxProps };
