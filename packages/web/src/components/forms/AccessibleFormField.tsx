/**
 * Accessible Form Field Component
 *
 * WCAG 2.1 AA compliant form field wrapper that provides:
 * - Programmatic label association (3.3.2)
 * - Error identification (3.3.1)
 * - Help text association (3.3.2)
 * - Required field indication (3.3.2)
 * - Error announcements (4.1.3)
 *
 * @example
 * ```tsx
 * <AccessibleFormField
 *   name="action"
 *   label="Remediation Action"
 *   required
 *   helpText="Describe the specific action you will take"
 *   errorMessage={errors.action}
 * >
 *   <Input.TextArea rows={4} />
 * </AccessibleFormField>
 * ```
 */

'use client';

import React from 'react';
import { Form } from 'antd';
import type { FormItemProps } from 'antd';

interface AccessibleFormFieldProps {
  /** Field name for form state */
  name: string;
  /** Visible label text */
  label: string;
  /** Whether the field is required */
  required?: boolean;
  /** Contextual help text shown below the field */
  helpText?: string;
  /** Error message to display (if any) */
  errorMessage?: string;
  /** The form input element (Input, Select, TextArea, etc.) */
  children: React.ReactElement;
  /** Additional Form.Item props */
  formItemProps?: Omit<FormItemProps, 'name' | 'label' | 'required' | 'help'>;
}

export const AccessibleFormField: React.FC<AccessibleFormFieldProps> = ({
  name,
  label,
  required = false,
  helpText,
  errorMessage,
  children,
  formItemProps = {},
}) => {
  const fieldId = `field-${name}`;
  const helpId = helpText ? `${fieldId}-help` : undefined;
  const errorId = errorMessage ? `${fieldId}-error` : undefined;

  // Build aria-describedby string
  const ariaDescribedby = [helpId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <Form.Item
      {...formItemProps}
      name={name}
      label={label}
      required={required}
      validateStatus={errorMessage ? 'error' : ''}
      help={
        <>
          {helpText && (
            <span id={helpId} className="text-text-secondary">
              {helpText}
            </span>
          )}
          {errorMessage && (
            <div
              id={errorId}
              role="alert"
              aria-live="assertive"
              className="text-status-danger mt-1"
            >
              {errorMessage}
            </div>
          )}
        </>
      }
    >
      {React.cloneElement(children, {
        id: fieldId,
        'aria-label': label,
        'aria-describedby': ariaDescribedby,
        'aria-required': required ? 'true' : undefined,
        'aria-invalid': errorMessage ? 'true' : 'false',
      })}
    </Form.Item>
  );
};

export default AccessibleFormField;
