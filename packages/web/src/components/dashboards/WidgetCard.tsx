/**
 * Widget Card Component
 *
 * Base wrapper for all dashboard widgets
 */

'use client';

import React, { useEffect } from 'react';
import { Card, Button, Dropdown } from 'antd';
import {
  ReloadOutlined,
  MoreOutlined,
  CloseOutlined,
  DragOutlined,
} from '@ant-design/icons';
import type { Widget, WidgetSize } from '@/lib/dashboards/types';

export interface WidgetCardProps {
  widget: Widget;
  children: React.ReactNode;
  /** Loading state */
  loading?: boolean;
  /** Refresh callback */
  onRefresh?: () => void;
  /** Remove callback */
  onRemove?: () => void;
  /** Custom actions in dropdown */
  actions?: { key: string; label: string; onClick: () => void }[];
}

const sizeClasses: Record<WidgetSize, string> = {
  small: 'col-span-12 md:col-span-6 lg:col-span-3',
  medium: 'col-span-12 md:col-span-6',
  large: 'col-span-12 lg:col-span-8',
  full: 'col-span-12',
};

/**
 * Widget Card Component
 *
 * @example
 * ```tsx
 * <WidgetCard
 *   widget={widget}
 *   loading={loading}
 *   onRefresh={handleRefresh}
 *   onRemove={handleRemove}
 * >
 *   <KPIWidget data={data} />
 * </WidgetCard>
 * ```
 */
export function WidgetCard({
  widget,
  children,
  loading,
  onRefresh,
  onRemove,
  actions = [],
}: WidgetCardProps) {
  // Auto-refresh if interval is set
  useEffect(() => {
    if (!widget.refreshInterval || !onRefresh) return;

    const interval = setInterval(() => {
      onRefresh();
    }, widget.refreshInterval);

    return () => clearInterval(interval);
  }, [widget.refreshInterval, onRefresh]);

  const menuItems = [
    ...(onRefresh
      ? [
          {
            key: 'refresh',
            label: 'Refresh',
            icon: <ReloadOutlined />,
            onClick: onRefresh,
          },
        ]
      : []),
    ...actions,
    ...(widget.removable && onRemove
      ? [
          {
            key: 'remove',
            label: 'Remove',
            icon: <CloseOutlined />,
            onClick: onRemove,
            danger: true,
          },
        ]
      : []),
  ];

  return (
    <div className={sizeClasses[widget.size]}>
      <Card
        title={
          <div className="flex items-center gap-2">
            {widget.movable && (
              <DragOutlined className="cursor-move text-gray-400" />
            )}
            <span className="font-semibold">{widget.title}</span>
          </div>
        }
        extra={
          menuItems.length > 0 ? (
            <Dropdown menu={{ items: menuItems }} trigger={['click']}>
              <Button type="text" icon={<MoreOutlined />} size="small" />
            </Dropdown>
          ) : undefined
        }
        loading={loading}
        className="h-full"
      >
        {widget.description && (
          <p className="text-sm text-gray-500 mb-4">{widget.description}</p>
        )}
        {children}
      </Card>
    </div>
  );
}
