import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', ...props }, ref) => {
    const inputClasses = `input ${error ? 'input-error' : ''} ${className}`.trim();

    return (
      <div className="flex flex-col gap-sm">
        {label && (
          <label className="text-sm font-medium text-primary">
            {label}
          </label>
        )}
        <input ref={ref} className={inputClasses} {...props} />
        {error && (
          <span className="text-xs text-critical">{error}</span>
        )}
        {helperText && !error && (
          <span className="text-xs text-secondary">{helperText}</span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
