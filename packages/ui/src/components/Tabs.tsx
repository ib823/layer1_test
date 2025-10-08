/**
 * Tabs Component
 * Wrapper around Ant Design Tabs with design tokens applied
 */

import React from 'react';
import { Tabs as AntTabs, type TabsProps as AntTabsProps } from 'antd';
import clsx from 'clsx';

export interface TabsProps extends AntTabsProps {}

/**
 * Tabs Component
 *
 * A tabbed interface for organizing content.
 *
 * @example
 * ```tsx
 * <Tabs
 *   items={[
 *     { key: '1', label: 'Tab 1', children: <div>Content 1</div> },
 *     { key: '2', label: 'Tab 2', children: <div>Content 2</div> },
 *   ]}
 * />
 * ```
 */
export const Tabs = React.forwardRef<any, TabsProps>(({ className, ...props }, ref) => {
  return <AntTabs ref={ref} className={clsx(className)} {...props} />;
});

Tabs.displayName = 'Tabs';

// Export TabPane for legacy API
export const { TabPane } = AntTabs;
