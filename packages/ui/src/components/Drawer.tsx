/**
 * Drawer Component
 * Wrapper around Ant Design Drawer with design tokens applied
 */

import React from 'react';
import { Drawer as AntDrawer, type DrawerProps as AntDrawerProps } from 'antd';
import clsx from 'clsx';

export interface DrawerProps extends AntDrawerProps {
  /**
   * Drawer size preset
   * @default 'default'
   */
  drawerSize?: 'small' | 'default' | 'large';
}

const sizeMap = {
  small: 378,
  default: 520,
  large: 736,
};

/**
 * Drawer Component
 *
 * A panel that slides in from the edge of the screen.
 *
 * @example
 * ```tsx
 * <Drawer
 *   title="User Details"
 *   open={isOpen}
 *   onClose={handleClose}
 *   drawerSize="default"
 * >
 *   <p>Drawer content</p>
 * </Drawer>
 * ```
 */
export const Drawer = React.forwardRef<any, DrawerProps>(
  ({ drawerSize = 'default', width, className, placement = 'right', ...props }, ref) => {
    return (
      <AntDrawer
        width={width || sizeMap[drawerSize]}
        placement={placement}
        className={clsx(className)}
        destroyOnClose
        {...props}
      />
    );
  }
);

Drawer.displayName = 'Drawer';
