/**
 * Alerts Widget Component
 *
 * Displays critical alerts and warnings
 */

'use client';

import { Alert, Button, Empty } from 'antd';
import {
  ExclamationCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';

export interface AlertItem {
  level: 'critical' | 'warning' | 'info';
  message: string;
  timestamp: Date;
  action?: { label: string; onClick: () => void };
}

export interface AlertsWidgetProps {
  alerts: AlertItem[];
  maxItems?: number;
}

/**
 * Alerts Widget
 *
 * @example
 * ```tsx
 * <AlertsWidget
 *   alerts={[
 *     {
 *       level: 'critical',
 *       message: 'Critical SoD violation detected',
 *       timestamp: new Date(),
 *       action: { label: 'View', onClick: () => {} }
 *     }
 *   ]}
 * />
 * ```
 */
export function AlertsWidget({ alerts, maxItems = 5 }: AlertsWidgetProps) {
  const displayAlerts = alerts.slice(0, maxItems);

  const getAlertType = (level: AlertItem['level']) => {
    switch (level) {
      case 'critical':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      default:
        return 'info';
    }
  };

  const getAlertIcon = (level: AlertItem['level']) => {
    switch (level) {
      case 'critical':
        return <ExclamationCircleOutlined />;
      case 'warning':
        return <WarningOutlined />;
      case 'info':
        return <InfoCircleOutlined />;
      default:
        return undefined;
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (displayAlerts.length === 0) {
    return (
      <Empty
        description="No alerts"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        className="my-8"
      />
    );
  }

  return (
    <div className="space-y-3">
      {displayAlerts.map((alert, index) => (
        <Alert
          key={index}
          type={getAlertType(alert.level)}
          icon={getAlertIcon(alert.level)}
          message={
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div>{alert.message}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {formatTimestamp(alert.timestamp)}
                </div>
              </div>
              {alert.action && (
                <Button
                  size="small"
                  type="link"
                  onClick={alert.action.onClick}
                >
                  {alert.action.label}
                </Button>
              )}
            </div>
          }
          className="mb-2"
        />
      ))}
    </div>
  );
}
