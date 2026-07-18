import { type InputHTMLAttributes, forwardRef } from 'react';
import './Input.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, id, className = '', autoComplete = 'off', ...rest }, ref) => {
    const inputId = id ?? (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
    const hasError = Boolean(error);

    return (
      <div className={`input-group ${className}`}>
        {label && (
          <label className="input-group__label" htmlFor={inputId}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`input-group__input ${hasError ? 'input-group__input--error' : ''}`}
          aria-invalid={hasError}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          autoComplete={autoComplete}
          {...rest}
        />
        {error && (
          <p className="input-group__error" id={`${inputId}-error`} role="alert">
            {error}
          </p>
        )}
        {!error && hint && (
          <p className="input-group__hint" id={`${inputId}-hint`}>
            {hint}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

export { Input };
export type { InputProps };
