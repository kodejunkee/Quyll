import { type TextareaHTMLAttributes, forwardRef } from 'react';
import './TextArea.css';

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, hint, id, className = '', ...rest }, ref) => {
    const textareaId = id ?? (label ? `textarea-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
    const hasError = Boolean(error);

    return (
      <div className={`textarea-group ${className}`}>
        {label && (
          <label className="textarea-group__label" htmlFor={textareaId}>
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={`textarea-group__textarea ${hasError ? 'textarea-group__textarea--error' : ''}`}
          aria-invalid={hasError}
          aria-describedby={error ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined}
          {...rest}
        />
        {error && (
          <p className="textarea-group__error" id={`${textareaId}-error`} role="alert">
            {error}
          </p>
        )}
        {!error && hint && (
          <p className="textarea-group__hint" id={`${textareaId}-hint`}>
            {hint}
          </p>
        )}
      </div>
    );
  },
);

TextArea.displayName = 'TextArea';

export { TextArea };
export type { TextAreaProps };
