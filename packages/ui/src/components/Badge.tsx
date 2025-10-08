/**
 * Badge Component
 * Wrapper around Ant Design Badge with design tokens applied
 */

import React from 'react';
import { Badge as AntBadge, type BadgeProps as AntBadgeProps } from 'antd';
import clsx from 'clsx';

export interface BadgeProps extends AntBadgeProps {
  /**
   * Badge variant for semantic meaning
   */
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'critical' | 'high' | 'medium' | 'low';
}

/**
 * Badge Component
 *
 * A badge for notification counts or status indicators.
 *
 * @example
 * ```tsx
 * <Badge count={5} variant="danger">
 *   <Button>Notifications</Button>
 * </Badge>
 * ```
 */
export const Badge = React.forwardRef<any, BadgeProps>(
  ({ variant = 'default', status, color, className, ...props }, ref) => {
    // Map risk variants to status
    const variantStatusMap: Record<string, AntBadgeProps['status']> = {
      success: 'success',
      warning: 'warning',
      danger: 'error',
      info: 'processing',
      critical: 'error',
      high: 'warning',
      medium: 'warning',
      low: 'success',
    };

    const finalStatus = status || (variant !== 'default' ? variantStatusMap[variant] : undefined);

    return (
      <AntBadge
        ref={ref}
        status={finalStatus}
        color={color}
        className={clsx(className)}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';

// Export Ribbon for ribbon badges
export const { Ribbon } = AntBadge;
