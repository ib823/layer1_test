/**
 * Tag Component
 * Wrapper around Ant Design Tag with design tokens applied
 */

import React from 'react';
import { Tag as AntTag, type TagProps as AntTagProps } from 'antd';
import clsx from 'clsx';

export interface TagProps extends AntTagProps {
  /**
   * Tag variant for semantic meaning
   */
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'critical' | 'high' | 'medium' | 'low';
}

/**
 * Tag Component
 *
 * A tag for categorizing or labeling items.
 * Supports risk level variants for SoD violations.
 *
 * @example
 * ```tsx
 * <Tag variant="critical">Critical Risk</Tag>
 * <Tag variant="success" closable>Approved</Tag>
 * ```
 */
export const Tag = React.forwardRef<any, TagProps>(
  ({ variant = 'default', color, className, ...props }, ref) => {
    // Map risk variants to colors
    const variantColorMap: Record<string, string> = {
      success: 'success',
      warning: 'warning',
      danger: 'error',
      info: 'processing',
      critical: 'error',
      high: 'warning',
      medium: 'warning',
      low: 'success',
    };

    const finalColor = color || (variant !== 'default' ? variantColorMap[variant] : undefined);

    return (
      <AntTag
        ref={ref}
        color={finalColor}
        className={clsx(
          'inline-flex items-center gap-1 rounded-sm',
          {
            'bg-[var(--risk-critical-bg)] text-[var(--risk-critical)] border-[var(--risk-critical)]':
              variant === 'critical' && !color,
            'bg-[var(--risk-high-bg)] text-[var(--risk-high)] border-[var(--risk-high)]':
              variant === 'high' && !color,
            'bg-[var(--risk-medium-bg)] text-[var(--risk-medium)] border-[var(--risk-medium)]':
              variant === 'medium' && !color,
            'bg-[var(--risk-low-bg)] text-[var(--risk-low)] border-[var(--risk-low)]':
              variant === 'low' && !color,
          },
          className
        )}
        {...props}
      />
    );
  }
);

Tag.displayName = 'Tag';

// Export CheckableTag for toggleable tags
export const { CheckableTag } = AntTag;
