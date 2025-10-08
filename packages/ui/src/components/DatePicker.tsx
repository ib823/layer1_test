/**
 * DatePicker Component
 * Wrapper around Ant Design DatePicker with design tokens applied
 */

import React from 'react';
import {
  DatePicker as AntDatePicker,
  type DatePickerProps as AntDatePickerProps,
} from 'antd';
import clsx from 'clsx';

export interface DatePickerProps extends AntDatePickerProps {
  /**
   * Error message to display below picker
   */
  error?: string;
  /**
   * Helper text to display below picker
   */
  helperText?: string;
  /**
   * Label for the picker
   */
  label?: string;
}

/**
 * DatePicker Component
 *
 * A date picker with consistent styling and behavior.
 *
 * @example
 * ```tsx
 * <DatePicker
 *   label="Start Date"
 *   placeholder="Select date"
 *   format="YYYY-MM-DD"
 * />
 * ```
 */
export const DatePicker = React.forwardRef<any, DatePickerProps>(
  ({ error, helperText, label, className, status, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium mb-1 text-secondary">
            {label}
            {props.required && <span className="text-danger ml-1">*</span>}
          </label>
        )}
        <AntDatePicker
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

DatePicker.displayName = 'DatePicker';

// Export RangePicker and other specialized pickers
export const RangePicker: typeof AntDatePicker.RangePicker = AntDatePicker.RangePicker;
