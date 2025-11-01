/**
 * KPI Widget Component
 *
 * Displays key performance indicator with trend
 */

'use client';

import { Statistic, Progress } from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  MinusOutlined,
} from '@ant-design/icons';
import type { KPIData } from '@/lib/dashboards/types';

export interface KPIWidgetProps {
  data: KPIData;
}

/**
 * KPI Widget
 *
 * @example
 * ```tsx
 * <KPIWidget
 *   data={{
 *     label: 'Total Violations',
 *     value: 42,
 *     previousValue: 50,
 *     trend: 'down',
 *     trendSentiment: 'positive',
 *     unit: 'violations',
 *   }}
 * />
 * ```
 */
export function KPIWidget({ data }: KPIWidgetProps) {
  const {
    label,
    value,
    previousValue,
    unit,
    trend,
    trendSentiment,
    target,
    icon,
    color,
  } = data;

  // Calculate percentage change
  const percentageChange =
    previousValue && typeof value === 'number'
      ? ((value - previousValue) / previousValue) * 100
      : undefined;

  // Calculate progress towards target
  const progressPercent =
    target && typeof value === 'number' ? (value / target) * 100 : undefined;

  // Determine trend color
  const getTrendColor = () => {
    if (!trendSentiment) return undefined;
    if (trendSentiment === 'positive') return 'text-green-600';
    if (trendSentiment === 'negative') return 'text-red-600';
    return 'text-gray-600';
  };

  // Get trend icon
  const getTrendIcon = () => {
    if (trend === 'up') return <ArrowUpOutlined />;
    if (trend === 'down') return <ArrowDownOutlined />;
    return <MinusOutlined />;
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <Statistic
            title={label}
            value={value}
            suffix={unit}
            valueStyle={{
              color: color,
              fontSize: '32px',
              fontWeight: 'bold',
            }}
            prefix={icon}
          />
        </div>
      </div>

      {/* Trend indicator */}
      {trend && percentageChange !== undefined && (
        <div className={`flex items-center gap-2 text-sm ${getTrendColor()}`}>
          {getTrendIcon()}
          <span className="font-semibold">
            {Math.abs(percentageChange).toFixed(1)}%
          </span>
          <span className="text-gray-500">vs previous period</span>
        </div>
      )}

      {/* Progress towards target */}
      {target && progressPercent !== undefined && (
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-500">Target: {target}</span>
            <span className="font-semibold">{progressPercent.toFixed(0)}%</span>
          </div>
          <Progress
            percent={progressPercent}
            showInfo={false}
            strokeColor={
              progressPercent >= 100
                ? '#52c41a'
                : progressPercent >= 75
                ? '#1890ff'
                : progressPercent >= 50
                ? '#faad14'
                : '#ff4d4f'
            }
          />
        </div>
      )}
    </div>
  );
}
