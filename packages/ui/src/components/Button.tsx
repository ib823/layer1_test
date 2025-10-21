/**
 * Button Component
 * Wrapper around Ant Design Button with design tokens applied
 */

import React from 'react';
import { Button as AntButton, type ButtonProps as AntButtonProps } from 'antd';
import clsx from 'clsx';

export interface ButtonProps extends Omit<AntButtonProps, 'type' | 'variant'> {
  /**
   * Button variant
   * @default 'default'
   */
  variant?: 'primary' | 'default' | 'dashed' | 'text' | 'link' | 'danger';
}

/**
 * Button Component
 *
 * A button component with consistent styling and behavior.
 * Wraps Ant Design Button with design tokens applied.
 *
 * @example
 * ```tsx
 * <Button variant="primary" size="middle" onClick={() => {}}>
 *   Click Me
 * </Button>
 * ```
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'default', className, size = 'middle', ...props }, ref) => {
    return (
      <AntButton
        ref={ref}
        type={variant === 'primary' ? 'primary' : 'default'}
        danger={variant === 'danger'}
        size={size}
        className={clsx(
          'transition-base', // Use our transition token class
          {
            'ant-btn-dashed': variant === 'dashed',
            'ant-btn-text': variant === 'text',
            'ant-btn-link': variant === 'link',
          },
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
