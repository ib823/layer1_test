/**
 * Select Component
 * Wrapper around Ant Design Select with design tokens applied
 */

import React from 'react';
import { Select as AntSelect, type SelectProps as AntSelectProps } from 'antd';
import clsx from 'clsx';

export interface SelectProps<T = any> extends AntSelectProps<T> {
  /**
   * Error message to display below select
   */
  error?: string;
  /**
   * Helper text to display below select
   */
  helperText?: string;
  /**
   * Label for the select
   */
  label?: string;
  /**
   * Mark as required field
   */
  required?: boolean;
}

/**
 * Select Component
 *
 * A dropdown select with consistent styling and behavior.
 *
 * @example
 * ```tsx
 * <Select
 *   label="Country"
 *   placeholder="Select a country"
 *   options={[
 *     { label: 'USA', value: 'us' },
 *     { label: 'UK', value: 'uk' },
 *   ]}
 * />
 * ```
 */
export const Select = React.forwardRef<any, SelectProps>(
  ({ error, helperText, label, className, status, required, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium mb-1 text-secondary">
            {label}
            {required && <span className="text-danger ml-1">*</span>}
          </label>
        )}
        <AntSelect
          ref={ref}
          status={error ? 'error' : status}
          className={clsx('transition-base w-full', className)}
          {...props}
        />
        {error && (
          <div className="text-xs text-danger mt-1" role="alert">
            {error}
          </div>
        )}
        {helperText && !error && (
          <div className="text-xs text-tertiary mt-1">{helperText}</div>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

// Export Option for convenience
export const Option: typeof AntSelect.Option = AntSelect.Option;
