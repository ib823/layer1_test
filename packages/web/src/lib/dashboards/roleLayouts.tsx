/**
 * Role-Based Dashboard Layouts
 *
 * Defines default dashboard layouts for each user role
 */

import {
  DollarOutlined,
  SafetyOutlined,
  AlertOutlined,
  CheckCircleOutlined,
  FileSearchOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import type { DashboardLayout } from './types';

/**
 * CFO Dashboard
 *
 * Focus: Financial oversight, compliance metrics, risk exposure
 */
export const cfoLayout: DashboardLayout = {
  name: 'CFO Dashboard',
  role: 'CFO',
  widgets: [
    {
      id: 'cfo-financial-risk',
      type: 'kpi',
      title: 'Financial Risk Exposure',
      size: 'small',
      config: {
        icon: <DollarOutlined style={{ color: '#1890ff' }} />,
        dataKey: 'financialRisk',
      },
      refreshInterval: 300000, // 5 minutes
      removable: false,
    },
    {
      id: 'cfo-compliance-score',
      type: 'kpi',
      title: 'Compliance Score',
      size: 'small',
      config: {
        icon: <SafetyOutlined style={{ color: '#52c41a' }} />,
        dataKey: 'complianceScore',
      },
      refreshInterval: 300000,
      removable: false,
    },
    {
      id: 'cfo-sod-violations',
      type: 'kpi',
      title: 'Active SoD Violations',
      size: 'small',
      config: {
        icon: <AlertOutlined style={{ color: '#ff4d4f' }} />,
        dataKey: 'sodViolations',
      },
      refreshInterval: 60000, // 1 minute
      removable: false,
    },
    {
      id: 'cfo-audits-completed',
      type: 'kpi',
      title: 'Audits Completed (MTD)',
      size: 'small',
      config: {
        icon: <CheckCircleOutlined style={{ color: '#722ed1' }} />,
        dataKey: 'auditsCompleted',
      },
      refreshInterval: 300000,
      removable: true,
    },
    {
      id: 'cfo-risk-trend',
      type: 'chart',
      title: 'Risk Trend (Last 6 Months)',
      size: 'large',
      config: {
        chartType: 'line',
        dataKey: 'riskTrend',
      },
      refreshInterval: 600000, // 10 minutes
      removable: true,
      movable: true,
    },
    {
      id: 'cfo-critical-alerts',
      type: 'alerts',
      title: 'Critical Alerts',
      description: 'Requires immediate attention',
      size: 'medium',
      config: {
        severity: 'critical',
        maxItems: 5,
      },
      refreshInterval: 60000,
      removable: false,
    },
    {
      id: 'cfo-module-status',
      type: 'chart',
      title: 'Compliance by Module',
      size: 'medium',
      config: {
        chartType: 'doughnut',
        dataKey: 'moduleStatus',
      },
      refreshInterval: 300000,
      removable: true,
      movable: true,
    },
    {
      id: 'cfo-top-risks',
      type: 'list',
      title: 'Top Financial Risks',
      size: 'medium',
      config: {
        dataKey: 'topRisks',
        maxItems: 5,
      },
      refreshInterval: 300000,
      removable: true,
      movable: true,
    },
  ],
  settings: {
    customizable: true,
    defaultRefreshInterval: 300000,
  },
};

/**
 * Auditor Dashboard
 *
 * Focus: Violation tracking, audit trails, compliance checks
 */
export const auditorLayout: DashboardLayout = {
  name: 'Auditor Dashboard',
  role: 'Auditor',
  widgets: [
    {
      id: 'auditor-open-violations',
      type: 'kpi',
      title: 'Open Violations',
      size: 'small',
      config: {
        icon: <AlertOutlined style={{ color: '#ff4d4f' }} />,
        dataKey: 'openViolations',
      },
      refreshInterval: 60000,
      removable: false,
    },
    {
      id: 'auditor-resolved-today',
      type: 'kpi',
      title: 'Resolved Today',
      size: 'small',
      config: {
        icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
        dataKey: 'resolvedToday',
      },
      refreshInterval: 60000,
      removable: false,
    },
    {
      id: 'auditor-pending-reviews',
      type: 'kpi',
      title: 'Pending Reviews',
      size: 'small',
      config: {
        icon: <FileSearchOutlined style={{ color: '#faad14' }} />,
        dataKey: 'pendingReviews',
      },
      refreshInterval: 60000,
      removable: false,
    },
    {
      id: 'auditor-avg-resolution-time',
      type: 'kpi',
      title: 'Avg Resolution Time',
      size: 'small',
      config: {
        icon: <CheckCircleOutlined style={{ color: '#1890ff' }} />,
        dataKey: 'avgResolutionTime',
      },
      refreshInterval: 300000,
      removable: true,
    },
    {
      id: 'auditor-violations-list',
      type: 'list',
      title: 'Recent Violations',
      description: 'Last 24 hours',
      size: 'large',
      config: {
        dataKey: 'recentViolations',
        maxItems: 10,
      },
      refreshInterval: 60000,
      removable: false,
      movable: true,
    },
    {
      id: 'auditor-violation-trend',
      type: 'chart',
      title: 'Violation Trend (30 Days)',
      size: 'medium',
      config: {
        chartType: 'line',
        dataKey: 'violationTrend',
      },
      refreshInterval: 300000,
      removable: true,
      movable: true,
    },
    {
      id: 'auditor-by-severity',
      type: 'chart',
      title: 'Violations by Severity',
      size: 'medium',
      config: {
        chartType: 'bar',
        dataKey: 'violationsBySeverity',
      },
      refreshInterval: 300000,
      removable: true,
      movable: true,
    },
    {
      id: 'auditor-alerts',
      type: 'alerts',
      title: 'Audit Alerts',
      size: 'full',
      config: {
        maxItems: 5,
      },
      refreshInterval: 60000,
      removable: true,
    },
  ],
  settings: {
    customizable: true,
    defaultRefreshInterval: 60000,
  },
};

/**
 * Analyst Dashboard
 *
 * Focus: Data analysis, trends, anomaly detection
 */
export const analystLayout: DashboardLayout = {
  name: 'Analyst Dashboard',
  role: 'Analyst',
  widgets: [
    {
      id: 'analyst-anomalies-detected',
      type: 'kpi',
      title: 'Anomalies Detected',
      size: 'small',
      config: {
        icon: <AlertOutlined style={{ color: '#ff4d4f' }} />,
        dataKey: 'anomaliesDetected',
      },
      refreshInterval: 60000,
      removable: false,
    },
    {
      id: 'analyst-invoices-processed',
      type: 'kpi',
      title: 'Invoices Processed',
      size: 'small',
      config: {
        icon: <FileSearchOutlined style={{ color: '#1890ff' }} />,
        dataKey: 'invoicesProcessed',
      },
      refreshInterval: 300000,
      removable: false,
    },
    {
      id: 'analyst-match-rate',
      type: 'kpi',
      title: 'Match Rate',
      size: 'small',
      config: {
        icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
        dataKey: 'matchRate',
      },
      refreshInterval: 300000,
      removable: false,
    },
    {
      id: 'analyst-data-quality-score',
      type: 'kpi',
      title: 'Data Quality Score',
      size: 'small',
      config: {
        icon: <SafetyOutlined style={{ color: '#722ed1' }} />,
        dataKey: 'dataQualityScore',
      },
      refreshInterval: 300000,
      removable: true,
    },
    {
      id: 'analyst-gl-trend',
      type: 'chart',
      title: 'GL Anomaly Trend',
      size: 'large',
      config: {
        chartType: 'line',
        dataKey: 'glAnomalyTrend',
      },
      refreshInterval: 300000,
      removable: true,
      movable: true,
    },
    {
      id: 'analyst-invoice-matching',
      type: 'chart',
      title: 'Invoice Matching Status',
      size: 'medium',
      config: {
        chartType: 'doughnut',
        dataKey: 'invoiceMatchingStatus',
      },
      refreshInterval: 300000,
      removable: true,
      movable: true,
    },
    {
      id: 'analyst-top-anomalies',
      type: 'list',
      title: 'Top Anomalies',
      description: 'Highest confidence scores',
      size: 'medium',
      config: {
        dataKey: 'topAnomalies',
        maxItems: 8,
      },
      refreshInterval: 60000,
      removable: true,
      movable: true,
    },
    {
      id: 'analyst-vendor-quality',
      type: 'chart',
      title: 'Vendor Data Quality',
      size: 'medium',
      config: {
        chartType: 'bar',
        dataKey: 'vendorQuality',
      },
      refreshInterval: 600000,
      removable: true,
      movable: true,
    },
  ],
  settings: {
    customizable: true,
    defaultRefreshInterval: 300000,
  },
};

/**
 * Admin Dashboard
 *
 * Focus: System health, user management, configuration
 */
export const adminLayout: DashboardLayout = {
  name: 'Admin Dashboard',
  role: 'Admin',
  widgets: [
    {
      id: 'admin-active-users',
      type: 'kpi',
      title: 'Active Users',
      size: 'small',
      config: {
        icon: <TeamOutlined style={{ color: '#1890ff' }} />,
        dataKey: 'activeUsers',
      },
      refreshInterval: 60000,
      removable: false,
    },
    {
      id: 'admin-system-health',
      type: 'kpi',
      title: 'System Health',
      size: 'small',
      config: {
        icon: <SafetyOutlined style={{ color: '#52c41a' }} />,
        dataKey: 'systemHealth',
      },
      refreshInterval: 30000,
      removable: false,
    },
    {
      id: 'admin-api-calls',
      type: 'kpi',
      title: 'API Calls (Today)',
      size: 'small',
      config: {
        icon: <FileSearchOutlined style={{ color: '#722ed1' }} />,
        dataKey: 'apiCalls',
      },
      refreshInterval: 60000,
      removable: false,
    },
    {
      id: 'admin-error-rate',
      type: 'kpi',
      title: 'Error Rate',
      size: 'small',
      config: {
        icon: <AlertOutlined style={{ color: '#ff4d4f' }} />,
        dataKey: 'errorRate',
      },
      refreshInterval: 60000,
      removable: false,
    },
    {
      id: 'admin-user-activity',
      type: 'chart',
      title: 'User Activity (7 Days)',
      size: 'large',
      config: {
        chartType: 'line',
        dataKey: 'userActivity',
      },
      refreshInterval: 300000,
      removable: true,
      movable: true,
    },
    {
      id: 'admin-module-usage',
      type: 'chart',
      title: 'Module Usage',
      size: 'medium',
      config: {
        chartType: 'bar',
        dataKey: 'moduleUsage',
      },
      refreshInterval: 600000,
      removable: true,
      movable: true,
    },
    {
      id: 'admin-system-alerts',
      type: 'alerts',
      title: 'System Alerts',
      size: 'medium',
      config: {
        maxItems: 5,
      },
      refreshInterval: 30000,
      removable: false,
    },
    {
      id: 'admin-recent-activity',
      type: 'list',
      title: 'Recent Admin Activity',
      size: 'full',
      config: {
        dataKey: 'recentActivity',
        maxItems: 10,
      },
      refreshInterval: 60000,
      removable: true,
    },
  ],
  settings: {
    customizable: true,
    defaultRefreshInterval: 60000,
  },
};

/**
 * Get dashboard layout by role
 */
export function getDashboardLayout(role: string): DashboardLayout {
  switch (role) {
    case 'CFO':
      return cfoLayout;
    case 'Auditor':
      return auditorLayout;
    case 'Analyst':
      return analystLayout;
    case 'Admin':
      return adminLayout;
    default:
      return analystLayout; // Default to analyst view
  }
}
