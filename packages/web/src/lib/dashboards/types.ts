/**
 * Dashboard Types
 *
 * Type definitions for role-based dashboards
 */

export type UserRole = 'CFO' | 'Auditor' | 'Analyst' | 'Admin';

export type WidgetSize = 'small' | 'medium' | 'large' | 'full';

export type WidgetType =
  | 'kpi'
  | 'chart'
  | 'table'
  | 'list'
  | 'progress'
  | 'heatmap'
  | 'timeline'
  | 'alerts';

export interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  description?: string;
  size: WidgetSize;
  /** Widget-specific configuration */
  config: Record<string, any>;
  /** Whether widget can be removed by user */
  removable?: boolean;
  /** Whether widget can be moved by user */
  movable?: boolean;
  /** Refresh interval in milliseconds */
  refreshInterval?: number;
}

export interface DashboardLayout {
  /** Layout name/identifier */
  name: string;
  /** User role this layout is for */
  role: UserRole;
  /** Widgets in this layout */
  widgets: Widget[];
  /** Custom layout settings */
  settings?: {
    /** Allow users to customize this dashboard */
    customizable?: boolean;
    /** Default refresh interval for all widgets */
    defaultRefreshInterval?: number;
  };
}

export interface KPIData {
  label: string;
  value: number | string;
  /** Previous value for trend calculation */
  previousValue?: number;
  /** Unit (e.g., '$', '%', 'violations') */
  unit?: string;
  /** Trend direction */
  trend?: 'up' | 'down' | 'stable';
  /** Is the trend good or bad? */
  trendSentiment?: 'positive' | 'negative' | 'neutral';
  /** Target value */
  target?: number;
  /** Icon to display */
  icon?: React.ReactNode;
  /** Color theme */
  color?: string;
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
  }[];
}

export interface WidgetData {
  /** KPI widget data */
  kpi?: KPIData;
  /** Chart widget data */
  chart?: ChartData;
  /** Table widget data */
  table?: {
    columns: { key: string; title: string; dataIndex: string }[];
    data: Record<string, any>[];
  };
  /** List widget data */
  list?: {
    items: { id: string; title: string; description?: string; meta?: string }[];
  };
  /** Progress widget data */
  progress?: {
    current: number;
    total: number;
    label: string;
    status?: 'success' | 'exception' | 'normal' | 'active';
  };
  /** Alert widget data */
  alerts?: {
    level: 'critical' | 'warning' | 'info';
    message: string;
    timestamp: Date;
    action?: { label: string; onClick: () => void };
  }[];
}

export interface DashboardPreferences {
  /** User ID */
  userId: string;
  /** Selected role dashboard */
  activeRole: UserRole;
  /** Customized widgets (overrides default layout) */
  customWidgets?: Widget[];
  /** Hidden widgets */
  hiddenWidgets?: string[];
  /** Custom widget positions */
  widgetPositions?: Record<string, { x: number; y: number }>;
}
