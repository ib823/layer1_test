import React from 'react';
import { 
  SecurityScanOutlined, 
  WarningOutlined, 
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  ToolOutlined,
  FileTextOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { Tag } from 'antd';
import { ModuleConfig } from '@/components/modules/types';
import { Role } from '@/types/auth';

export const sodConfig: ModuleConfig = {
  id: 'sod',
  name: 'Segregation of Duties',
  icon: <SecurityScanOutlined />,
  description: 'Detect and remediate role conflicts',
  basePath: '/modules/sod',
  allowedRoles: [Role.SYSTEM_ADMIN, Role.TENANT_ADMIN, Role.COMPLIANCE_MANAGER],
  
  dashboard: {
    kpis: [
      { 
        key: 'total', 
        label: 'Total Violations', 
        icon: <WarningOutlined />, 
        color: '#1890ff', 
        endpoint: '/api/modules/sod/summary' 
      },
      { 
        key: 'high_risk', 
        label: 'High Risk', 
        icon: <ExclamationCircleOutlined />, 
        color: '#ff4d4f', 
        endpoint: '/api/modules/sod/summary' 
      },
      { 
        key: 'pending', 
        label: 'Pending Action', 
        icon: <ClockCircleOutlined />, 
        color: '#faad14', 
        endpoint: '/api/modules/sod/summary' 
      },
      { 
        key: 'resolved', 
        label: 'Resolved', 
        icon: <CheckCircleOutlined />, 
        color: '#52c41a', 
        endpoint: '/api/modules/sod/summary' 
      },
    ],
    chartType: 'line',
  },
  
  dataGrid: {
    columns: [
      { 
        key: 'id', 
        title: 'ID', 
        dataIndex: 'id', 
        sorter: true 
      },
      { 
        key: 'user', 
        title: 'User', 
        dataIndex: ['user', 'name'], 
        sorter: true 
      },
      { 
        key: 'roles', 
        title: 'Conflicting Roles', 
        dataIndex: 'conflicting_roles', 
        render: (roles: string[]) => roles?.join(', ') || 'N/A'
      },
      { 
        key: 'risk', 
        title: 'Risk', 
        dataIndex: 'risk_level', 
        filters: [
          { text: 'CRITICAL', value: 'CRITICAL' },
          { text: 'HIGH', value: 'HIGH' },
          { text: 'MEDIUM', value: 'MEDIUM' },
          { text: 'LOW', value: 'LOW' },
        ],
        render: (level: string) => {
          const colors: Record<string, string> = {
            CRITICAL: 'red',
            HIGH: 'orange',
            MEDIUM: 'gold',
            LOW: 'blue',
          };
          return <Tag color={colors[level] || 'default'}>{level}</Tag>;
        },
      },
      { 
        key: 'status', 
        title: 'Status', 
        dataIndex: 'status',
        filters: [
          { text: 'OPEN', value: 'OPEN' },
          { text: 'IN_REVIEW', value: 'IN_REVIEW' },
          { text: 'MITIGATED', value: 'MITIGATED' },
          { text: 'RESOLVED', value: 'RESOLVED' },
        ],
        render: (status: string) => {
          const colors: Record<string, string> = {
            OPEN: 'red',
            IN_REVIEW: 'orange',
            MITIGATED: 'blue',
            RESOLVED: 'green',
          };
          return <Tag color={colors[status] || 'default'}>{status}</Tag>;
        },
      },
    ],
    actions: [
      { 
        key: 'view', 
        label: 'View Details', 
        icon: <EyeOutlined />, 
        onClick: (record) => {
          // Will be implemented in the component
        },
      },
      { 
        key: 'remediate', 
        label: 'Remediate', 
        icon: <ToolOutlined />, 
        onClick: (record) => {
          // Will be implemented in the component
        },
      },
      { 
        key: 'exception', 
        label: 'Request Exception', 
        icon: <FileTextOutlined />, 
        onClick: (record) => {
          // Will be implemented in the component
        },
      },
    ],
    bulkActions: [
      { 
        key: 'assign', 
        label: 'Assign to User', 
        onClick: (selectedIds) => {
          console.log('Assign to user:', selectedIds);
        },
      },
      { 
        key: 'export', 
        label: 'Export Selected', 
        onClick: (selectedIds) => {
          console.log('Export selected:', selectedIds);
        },
      },
    ],
    filters: [
      { 
        key: 'risk', 
        label: 'Risk Level', 
        type: 'select', 
        options: [
          { label: 'All', value: '' },
          { label: 'CRITICAL', value: 'CRITICAL' },
          { label: 'HIGH', value: 'HIGH' },
          { label: 'MEDIUM', value: 'MEDIUM' },
          { label: 'LOW', value: 'LOW' },
        ],
      },
      { 
        key: 'status', 
        label: 'Status', 
        type: 'select', 
        options: [
          { label: 'All', value: '' },
          { label: 'Open', value: 'OPEN' },
          { label: 'In Review', value: 'IN_REVIEW' },
          { label: 'Mitigated', value: 'MITIGATED' },
          { label: 'Resolved', value: 'RESOLVED' },
        ],
      },
      { 
        key: 'date', 
        label: 'Date Range', 
        type: 'dateRange',
      },
      { 
        key: 'search', 
        label: 'Search', 
        type: 'search',
      },
    ],
    endpoint: '/api/modules/sod/violations',
  },
  
  detailView: {
    sections: [
      { 
        key: 'overview', 
        title: 'Violation Details', 
        component: () => <div>Violation Overview Component</div>,
      },
      { 
        key: 'roles', 
        title: 'Role Analysis', 
        component: () => <div>Role Analysis Component</div>,
      },
      { 
        key: 'history', 
        title: 'History', 
        component: () => <div>Violation History Component</div>,
      },
    ],
    primaryAction: {
      label: 'Remove Role',
      icon: <DeleteOutlined />,
      onClick: (id) => {
        console.log('Remove role for:', id);
      },
    },
    secondaryActions: [
      { 
        label: 'Request Exception', 
        onClick: (id) => {
          console.log('Request exception for:', id);
        },
      },
      { 
        label: 'Mark False Positive', 
        onClick: (id) => {
          console.log('Mark false positive:', id);
        },
      },
    ],
    endpoint: '/api/modules/sod/violations/:id',
  },

  config: {
    sections: [
      {
        key: 'datasource',
        title: 'Data Source Settings',
        fields: [
          {
            key: 'sap_host',
            label: 'SAP Host',
            type: 'input',
            placeholder: 'sap.company.com',
            required: true,
          },
          {
            key: 'sync_frequency',
            label: 'Sync Frequency (minutes)',
            type: 'number',
            placeholder: '60',
            required: true,
          },
          {
            key: 'auto_sync',
            label: 'Enable Auto Sync',
            type: 'switch',
          },
        ],
      },
      {
        key: 'analysis',
        title: 'Analysis Settings',
        fields: [
          {
            key: 'risk_threshold',
            label: 'Risk Threshold',
            type: 'select',
            options: [
              { label: 'High', value: 'HIGH' },
              { label: 'Medium', value: 'MEDIUM' },
              { label: 'Low', value: 'LOW' },
            ],
            required: true,
          },
          {
            key: 'auto_analyze',
            label: 'Auto Analyze on Sync',
            type: 'switch',
          },
        ],
      },
      {
        key: 'notifications',
        title: 'Notification Settings',
        fields: [
          {
            key: 'email_notifications',
            label: 'Email Notifications',
            type: 'switch',
          },
          {
            key: 'notification_email',
            label: 'Notification Email',
            type: 'input',
            placeholder: 'admin@company.com',
          },
        ],
      },
    ],
    endpoint: '/api/modules/sod/config',
  },

  reports: {
    templates: [
      {
        key: 'violations_summary',
        title: 'Violations Summary',
        description: 'Overview of all violations',
        icon: <FileTextOutlined />,
        endpoint: '/api/modules/sod/reports/violations',
      },
      {
        key: 'risk_analysis',
        title: 'Risk Analysis',
        description: 'Detailed risk breakdown',
        icon: <WarningOutlined />,
        endpoint: '/api/modules/sod/reports/risk',
      },
      {
        key: 'user_access',
        title: 'User Access Report',
        description: 'User permissions audit',
        icon: <SecurityScanOutlined />,
        endpoint: '/api/modules/sod/reports/users',
      },
    ],
    defaultDateRange: 'month',
  },
};
