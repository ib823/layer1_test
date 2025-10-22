/**
 * Role-Based Dashboard Component
 *
 * Main dashboard component that renders role-specific layouts
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Select, Spin, message } from 'antd';
import { WidgetCard } from './WidgetCard';
import { KPIWidget, ChartWidget, AlertsWidget, ListWidget } from './widgets';
import { getDashboardLayout } from '@/lib/dashboards/roleLayouts';
import type {
  UserRole,
  DashboardLayout,
  Widget,
  WidgetData,
} from '@/lib/dashboards/types';

export interface RoleDashboardProps {
  /** Current user role */
  role: UserRole;
  /** Allow role switching (for demo purposes) */
  allowRoleSwitch?: boolean;
  /** Callback when role changes */
  onRoleChange?: (role: UserRole) => void;
  /** Data fetcher function */
  fetchWidgetData?: (widgetId: string) => Promise<WidgetData>;
}

/**
 * Role-Based Dashboard
 *
 * @example
 * ```tsx
 * <RoleDashboard
 *   role="CFO"
 *   allowRoleSwitch={true}
 *   fetchWidgetData={async (widgetId) => {
 *     // Fetch data for widget
 *     return widgetData;
 *   }}
 * />
 * ```
 */
export function RoleDashboard({
  role,
  allowRoleSwitch = false,
  onRoleChange,
  fetchWidgetData,
}: RoleDashboardProps) {
  const [currentRole, setCurrentRole] = useState<UserRole>(role);
  const [layout, setLayout] = useState<DashboardLayout>(
    getDashboardLayout(currentRole)
  );
  const [widgetData, setWidgetData] = useState<Record<string, WidgetData>>({});
  const [loadingWidgets, setLoadingWidgets] = useState<Set<string>>(new Set());

  // Update layout when role changes
  useEffect(() => {
    setLayout(getDashboardLayout(currentRole));
  }, [currentRole]);

  // Fetch widget data
  const loadWidgetData = async (widget: Widget) => {
    if (!fetchWidgetData) return;

    setLoadingWidgets((prev) => new Set(prev).add(widget.id));

    try {
      const data = await fetchWidgetData(widget.id);
      setWidgetData((prev) => ({ ...prev, [widget.id]: data }));
    } catch (error) {
      message.error(`Failed to load ${widget.title}`);
    } finally {
      setLoadingWidgets((prev) => {
        const next = new Set(prev);
        next.delete(widget.id);
        return next;
      });
    }
  };

  // Load all widgets on mount and when layout changes
  useEffect(() => {
    layout.widgets.forEach((widget) => {
      loadWidgetData(widget);
    });
  }, [layout]);

  const handleRoleChange = (newRole: UserRole) => {
    setCurrentRole(newRole);
    onRoleChange?.(newRole);
  };

  const handleRefresh = (widget: Widget) => {
    loadWidgetData(widget);
  };

  const handleRemove = (widgetId: string) => {
    // In a real implementation, this would update user preferences
    message.info('Widget removed (demo mode)');
  };

  const renderWidget = (widget: Widget) => {
    const data = widgetData[widget.id];
    const loading = loadingWidgets.has(widget.id);

    let content = null;

    switch (widget.type) {
      case 'kpi':
        content = data?.kpi ? <KPIWidget data={data.kpi} /> : null;
        break;
      case 'chart':
        content = data?.chart ? (
          <ChartWidget
            data={data.chart}
            type={widget.config.chartType}
            height={widget.size === 'large' ? 400 : 300}
          />
        ) : null;
        break;
      case 'alerts':
        content = data?.alerts ? (
          <AlertsWidget
            alerts={data.alerts}
            maxItems={widget.config.maxItems}
          />
        ) : null;
        break;
      case 'list':
        content = data?.list ? (
          <ListWidget items={data.list.items} maxItems={widget.config.maxItems} />
        ) : null;
        break;
      default:
        content = (
          <div className="text-gray-500 text-center py-8">
            Widget type not implemented: {widget.type}
          </div>
        );
    }

    return (
      <WidgetCard
        key={widget.id}
        widget={widget}
        loading={loading}
        onRefresh={() => handleRefresh(widget)}
        onRemove={widget.removable ? () => handleRemove(widget.id) : undefined}
      >
        {content || (
          <div className="text-center py-8 text-gray-400">
            <Spin />
            <div className="mt-2">Loading...</div>
          </div>
        )}
      </WidgetCard>
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{layout.name}</h1>
          <p className="text-gray-500">
            Personalized view for {currentRole} role
          </p>
        </div>
        {allowRoleSwitch && (
          <Select
            value={currentRole}
            onChange={handleRoleChange}
            style={{ width: 200 }}
            options={[
              { value: 'CFO', label: 'CFO Dashboard' },
              { value: 'Auditor', label: 'Auditor Dashboard' },
              { value: 'Analyst', label: 'Analyst Dashboard' },
              { value: 'Admin', label: 'Admin Dashboard' },
            ]}
          />
        )}
      </div>

      {/* Widget Grid */}
      <div className="grid grid-cols-12 gap-4">
        {layout.widgets.map((widget) => renderWidget(widget))}
      </div>
    </div>
  );
}
