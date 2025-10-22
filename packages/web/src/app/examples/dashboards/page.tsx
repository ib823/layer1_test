/**
 * Role-Based Dashboards Demo Page
 *
 * Showcases different dashboard layouts for each user role
 */

'use client';

import { useState } from 'react';
import { RoleDashboard } from '@/components/dashboards';
import { PageHead } from '@/components/seo/PageHead';
import type { UserRole, WidgetData } from '@/lib/dashboards/types';
import {
  DollarOutlined,
  SafetyOutlined,
  AlertOutlined,
  CheckCircleOutlined,
  FileSearchOutlined,
  TeamOutlined,
} from '@ant-design/icons';

/**
 * Mock data generator for widgets
 */
async function fetchMockWidgetData(widgetId: string): Promise<WidgetData> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Mock data based on widget ID
  const mockData: Record<string, WidgetData> = {
    // CFO Widgets
    'cfo-financial-risk': {
      kpi: {
        label: 'Financial Risk Exposure',
        value: 2450000,
        previousValue: 2800000,
        unit: '$',
        trend: 'down',
        trendSentiment: 'positive',
        target: 2000000,
        icon: <DollarOutlined />,
        color: '#1890ff',
      },
    },
    'cfo-compliance-score': {
      kpi: {
        label: 'Compliance Score',
        value: 94,
        previousValue: 92,
        unit: '%',
        trend: 'up',
        trendSentiment: 'positive',
        target: 95,
        icon: <SafetyOutlined />,
        color: '#52c41a',
      },
    },
    'cfo-sod-violations': {
      kpi: {
        label: 'Active SoD Violations',
        value: 12,
        previousValue: 18,
        trend: 'down',
        trendSentiment: 'positive',
        icon: <AlertOutlined />,
        color: '#ff4d4f',
      },
    },
    'cfo-audits-completed': {
      kpi: {
        label: 'Audits Completed (MTD)',
        value: 47,
        previousValue: 42,
        unit: 'audits',
        trend: 'up',
        trendSentiment: 'positive',
        icon: <CheckCircleOutlined />,
        color: '#722ed1',
      },
    },
    'cfo-risk-trend': {
      chart: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [
          {
            label: 'Risk Score',
            data: [65, 59, 70, 81, 56, 45],
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgba(255, 99, 132, 0.5)',
          },
          {
            label: 'Compliance Score',
            data: [85, 87, 90, 88, 92, 94],
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.5)',
          },
        ],
      },
    },
    'cfo-critical-alerts': {
      alerts: [
        {
          level: 'critical',
          message: 'Critical SoD violation in Finance module',
          timestamp: new Date(Date.now() - 3600000),
          action: { label: 'View', onClick: () => alert('View violation') },
        },
        {
          level: 'warning',
          message: 'Audit review deadline approaching (2 days)',
          timestamp: new Date(Date.now() - 7200000),
        },
        {
          level: 'info',
          message: 'Monthly compliance report ready',
          timestamp: new Date(Date.now() - 86400000),
        },
      ],
    },
    'cfo-module-status': {
      chart: {
        labels: ['SoD Control', 'GL Anomaly', 'Invoice Match', 'Vendor Quality', 'User Access'],
        datasets: [
          {
            label: 'Compliance Status',
            data: [95, 88, 92, 85, 90],
            backgroundColor: [
              'rgba(54, 162, 235, 0.8)',
              'rgba(255, 206, 86, 0.8)',
              'rgba(75, 192, 192, 0.8)',
              'rgba(153, 102, 255, 0.8)',
              'rgba(255, 159, 64, 0.8)',
            ],
          },
        ],
      },
    },
    'cfo-top-risks': {
      list: {
        items: [
          {
            id: '1',
            title: 'Segregation of Duties Violation',
            description: 'User has both AP and GL posting roles',
            meta: '2 hours ago',
            tag: { label: 'Critical', color: 'red' },
            onClick: () => alert('View risk'),
          },
          {
            id: '2',
            title: 'Vendor Data Quality Issue',
            description: 'Missing tax information for 15 vendors',
            meta: '5 hours ago',
            tag: { label: 'Medium', color: 'orange' },
          },
          {
            id: '3',
            title: 'Invoice Matching Exception',
            description: '3-way match failure for PO #12345',
            meta: '1 day ago',
            tag: { label: 'High', color: 'red' },
          },
        ],
      },
    },

    // Auditor Widgets
    'auditor-open-violations': {
      kpi: {
        label: 'Open Violations',
        value: 28,
        previousValue: 32,
        trend: 'down',
        trendSentiment: 'positive',
        icon: <AlertOutlined />,
        color: '#ff4d4f',
      },
    },
    'auditor-resolved-today': {
      kpi: {
        label: 'Resolved Today',
        value: 7,
        previousValue: 5,
        trend: 'up',
        trendSentiment: 'positive',
        icon: <CheckCircleOutlined />,
        color: '#52c41a',
      },
    },
    'auditor-pending-reviews': {
      kpi: {
        label: 'Pending Reviews',
        value: 15,
        previousValue: 18,
        trend: 'down',
        trendSentiment: 'positive',
        icon: <FileSearchOutlined />,
        color: '#faad14',
      },
    },
    'auditor-avg-resolution-time': {
      kpi: {
        label: 'Avg Resolution Time',
        value: '2.5 days',
        previousValue: 3.2,
        trend: 'down',
        trendSentiment: 'positive',
        icon: <CheckCircleOutlined />,
        color: '#1890ff',
      },
    },
    'auditor-violations-list': {
      list: {
        items: [
          {
            id: '1',
            title: 'Critical SoD Violation',
            description: 'User JohnD has conflicting Finance roles',
            meta: '1 hour ago',
            tag: { label: 'Critical', color: 'red' },
            onClick: () => alert('View violation'),
          },
          {
            id: '2',
            title: 'GL Posting Anomaly',
            description: 'Unusual posting pattern detected',
            meta: '3 hours ago',
            tag: { label: 'Medium', color: 'orange' },
          },
          {
            id: '3',
            title: 'Vendor Access Issue',
            description: 'Inactive vendor has active user access',
            meta: '5 hours ago',
            tag: { label: 'Low', color: 'blue' },
          },
        ],
      },
    },
    'auditor-violation-trend': {
      chart: {
        labels: Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`),
        datasets: [
          {
            label: 'New Violations',
            data: Array.from({ length: 30 }, () => Math.floor(Math.random() * 10)),
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgba(255, 99, 132, 0.1)',
          },
          {
            label: 'Resolved',
            data: Array.from({ length: 30 }, () => Math.floor(Math.random() * 8)),
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.1)',
          },
        ],
      },
    },
    'auditor-by-severity': {
      chart: {
        labels: ['Critical', 'High', 'Medium', 'Low'],
        datasets: [
          {
            label: 'Violations',
            data: [5, 12, 18, 8],
            backgroundColor: [
              'rgba(255, 99, 132, 0.8)',
              'rgba(255, 159, 64, 0.8)',
              'rgba(255, 206, 86, 0.8)',
              'rgba(75, 192, 192, 0.8)',
            ],
          },
        ],
      },
    },
    'auditor-alerts': {
      alerts: [
        {
          level: 'critical',
          message: 'New critical violation requires immediate review',
          timestamp: new Date(Date.now() - 1800000),
          action: { label: 'Review', onClick: () => {} },
        },
        {
          level: 'warning',
          message: '5 violations pending review for >48 hours',
          timestamp: new Date(Date.now() - 7200000),
        },
      ],
    },

    // Analyst Widgets
    'analyst-anomalies-detected': {
      kpi: {
        label: 'Anomalies Detected',
        value: 34,
        previousValue: 29,
        trend: 'up',
        trendSentiment: 'neutral',
        icon: <AlertOutlined />,
        color: '#ff4d4f',
      },
    },
    'analyst-invoices-processed': {
      kpi: {
        label: 'Invoices Processed',
        value: 1247,
        previousValue: 1180,
        trend: 'up',
        trendSentiment: 'positive',
        icon: <FileSearchOutlined />,
        color: '#1890ff',
      },
    },
    'analyst-match-rate': {
      kpi: {
        label: 'Match Rate',
        value: 96.5,
        previousValue: 95.8,
        unit: '%',
        trend: 'up',
        trendSentiment: 'positive',
        target: 98,
        icon: <CheckCircleOutlined />,
        color: '#52c41a',
      },
    },
    'analyst-data-quality-score': {
      kpi: {
        label: 'Data Quality Score',
        value: 91,
        previousValue: 89,
        unit: '%',
        trend: 'up',
        trendSentiment: 'positive',
        icon: <SafetyOutlined />,
        color: '#722ed1',
      },
    },
    'analyst-gl-trend': {
      chart: {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        datasets: [
          {
            label: 'Anomalies',
            data: [12, 19, 15, 25],
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
          },
        ],
      },
    },
    'analyst-invoice-matching': {
      chart: {
        labels: ['Matched', 'Pending', 'Exceptions'],
        datasets: [
          {
            label: 'Invoices',
            data: [1150, 67, 30],
            backgroundColor: [
              'rgba(75, 192, 192, 0.8)',
              'rgba(255, 206, 86, 0.8)',
              'rgba(255, 99, 132, 0.8)',
            ],
          },
        ],
      },
    },
    'analyst-top-anomalies': {
      list: {
        items: [
          {
            id: '1',
            title: 'Unusual GL Posting Amount',
            description: 'Amount 500% higher than historical average',
            meta: 'Confidence: 95%',
            tag: { label: 'High', color: 'red' },
          },
          {
            id: '2',
            title: 'Invoice Duplicate Detection',
            description: 'Potential duplicate invoice numbers',
            meta: 'Confidence: 88%',
            tag: { label: 'Medium', color: 'orange' },
          },
        ],
      },
    },
    'analyst-vendor-quality': {
      chart: {
        labels: ['Complete', 'Incomplete', 'Invalid', 'Missing'],
        datasets: [
          {
            label: 'Vendor Records',
            data: [450, 35, 12, 8],
            backgroundColor: 'rgba(75, 192, 192, 0.8)',
          },
        ],
      },
    },

    // Admin Widgets
    'admin-active-users': {
      kpi: {
        label: 'Active Users',
        value: 247,
        previousValue: 235,
        trend: 'up',
        trendSentiment: 'positive',
        icon: <TeamOutlined />,
        color: '#1890ff',
      },
    },
    'admin-system-health': {
      kpi: {
        label: 'System Health',
        value: 99.2,
        previousValue: 99.1,
        unit: '%',
        trend: 'up',
        trendSentiment: 'positive',
        icon: <SafetyOutlined />,
        color: '#52c41a',
      },
    },
    'admin-api-calls': {
      kpi: {
        label: 'API Calls (Today)',
        value: 45230,
        previousValue: 42100,
        trend: 'up',
        trendSentiment: 'neutral',
        icon: <FileSearchOutlined />,
        color: '#722ed1',
      },
    },
    'admin-error-rate': {
      kpi: {
        label: 'Error Rate',
        value: 0.3,
        previousValue: 0.5,
        unit: '%',
        trend: 'down',
        trendSentiment: 'positive',
        icon: <AlertOutlined />,
        color: '#ff4d4f',
      },
    },
    'admin-user-activity': {
      chart: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
          {
            label: 'Active Users',
            data: [220, 235, 240, 238, 245, 180, 150],
            borderColor: 'rgb(54, 162, 235)',
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
          },
        ],
      },
    },
    'admin-module-usage': {
      chart: {
        labels: ['SoD', 'GL Anomaly', 'Invoice', 'Vendor', 'Access Review'],
        datasets: [
          {
            label: 'Usage Count',
            data: [1250, 980, 1540, 720, 890],
            backgroundColor: 'rgba(153, 102, 255, 0.8)',
          },
        ],
      },
    },
    'admin-system-alerts': {
      alerts: [
        {
          level: 'warning',
          message: 'Database connection pool at 80% capacity',
          timestamp: new Date(Date.now() - 3600000),
        },
        {
          level: 'info',
          message: 'Scheduled maintenance in 3 days',
          timestamp: new Date(Date.now() - 86400000),
        },
      ],
    },
    'admin-recent-activity': {
      list: {
        items: [
          {
            id: '1',
            title: 'User Created',
            description: 'Admin created new user: jane.doe@example.com',
            meta: '15 minutes ago',
          },
          {
            id: '2',
            title: 'Configuration Changed',
            description: 'SoD rules updated by admin',
            meta: '1 hour ago',
          },
          {
            id: '3',
            title: 'Module Activated',
            description: 'GL Anomaly Detection enabled for tenant',
            meta: '2 hours ago',
          },
        ],
      },
    },
  };

  return mockData[widgetId] || {};
}

export default function DashboardsPage() {
  const [currentRole, setCurrentRole] = useState<UserRole>('CFO');

  return (
    <>
      <PageHead
        title="Role-Based Dashboards"
        description="Showcases different dashboard layouts for CFO, Auditor, Compliance Manager, and Business Analyst roles"
      />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Role-Based Dashboards</h1>
        <p className="text-gray-600">
          Different dashboard layouts optimized for each user role. Switch
          between roles to see customized views.
        </p>
      </div>

      <RoleDashboard
        role={currentRole}
        allowRoleSwitch={true}
        onRoleChange={setCurrentRole}
        fetchWidgetData={fetchMockWidgetData}
      />
      </div>
    </>
  );
}
