/**
 * Tooltip Component
 * Wrapper around Ant Design Tooltip with design tokens applied
 */

import React from 'react';
import { Tooltip as AntTooltip } from 'antd';
import type { TooltipPropsWithTitle } from 'antd/es/tooltip';
import clsx from 'clsx';

export type TooltipProps = TooltipPropsWithTitle;

/**
 * Tooltip Component
 *
 * A simple tooltip that displays additional information on hover.
 *
 * @example
 * ```tsx
 * <Tooltip title="Helpful information">
 *   <Button>Hover me</Button>
 * </Tooltip>
 * ```
 */
export const Tooltip = React.forwardRef<any, TooltipProps>(
  ({ overlayClassName, placement = 'top', mouseEnterDelay = 0.3, ...props }, ref) => {
    return (
      <AntTooltip
        ref={ref}
        placement={placement}
        mouseEnterDelay={mouseEnterDelay}
        overlayClassName={clsx(overlayClassName)}
        {...props}
      />
    );
  }
);

Tooltip.displayName = 'Tooltip';
