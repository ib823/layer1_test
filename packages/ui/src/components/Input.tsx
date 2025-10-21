/**
 * Input Component
 * Wrapper around Ant Design Input with design tokens applied
 */

import React from 'react';
import { Input as AntInput, type InputProps as AntInputProps } from 'antd';
import type { TextAreaProps as AntTextAreaProps } from 'antd/es/input/TextArea';
import type { PasswordProps as AntPasswordProps } from 'antd/es/input/Password';
import clsx from 'clsx';

export interface InputProps extends AntInputProps {
  /**
   * Error message to display below input
   */
  error?: string;
  /**
   * Helper text to display below input
   */
  helperText?: string;
  /**
   * Label for the input
   */
  label?: string;
}

/**
 * Input Component
 *
 * A text input with consistent styling and behavior.
 * Supports label, helper text, and error states.
 *
 * @example
 * ```tsx
 * <Input
 *   label="Email"
 *   placeholder="Enter your email"
 *   error="Invalid email"
 *   helperText="We'll never share your email"
 * />
 * ```
 */
export const Input = React.forwardRef<any, InputProps>(
  ({ error, helperText, label, className, status, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium mb-1 text-secondary">
            {label}
            {props.required && <span className="text-danger ml-1">*</span>}
          </label>
        )}
        <AntInput
          ref={ref}
          status={error ? 'error' : status}
          className={clsx('transition-base', className)}
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

Input.displayName = 'Input';

// Export specialized input types
export const { TextArea, Password, Search, Group } = AntInput;

export type { AntTextAreaProps as TextAreaProps, AntPasswordProps as PasswordProps };
