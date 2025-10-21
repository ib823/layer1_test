/**
 * Module Template Type Definitions
 */
import { Role } from '@/types/auth';
import React from 'react';

export interface KPIConfig {
  key: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  endpoint: string;
}

export interface DashboardConfig {
  kpis: KPIConfig[];
  statusSection?: 'pipeline' | 'certificate' | 'health';
  chartType?: 'line' | 'bar' | 'pie' | 'heatmap';
}

export interface ColumnConfig {
  key: string;
  title: string;
  dataIndex: string | string[];
  sorter?: boolean;
  filters?: Array<{ text: string; value: string }>;
  render?: (value: any, record: any) => React.ReactNode;
}

export interface ActionConfig {
  key: string;
  label: string;
  icon: React.ReactNode;
  danger?: boolean;
  onClick: (record: any) => void;
}

export interface BulkActionConfig {
  key: string;
  label: string;
  onClick: (selectedIds: string[]) => void;
}

export interface FilterConfig {
  key: string;
  label: string;
  type: 'select' | 'dateRange' | 'search';
  options?: Array<{ label: string; value: string }>;
}

export interface DataGridConfig {
  columns: ColumnConfig[];
  actions: ActionConfig[];
  bulkActions?: BulkActionConfig[];
  filters: FilterConfig[];
  endpoint: string;
}

export interface DetailSection {
  key: string;
  title: string;
  component: React.ComponentType<any>;
}

export interface DetailViewConfig {
  sections: DetailSection[];
  primaryAction: {
    label: string;
    icon: React.ReactNode;
    onClick: (id: string) => void;
  };
  secondaryActions?: Array<{
    label: string;
    onClick: (id: string) => void;
  }>;
  endpoint: string;
}

export interface ConfigFormConfig {
  sections: Array<{
    key: string;
    title: string;
    fields: Array<{
      key: string;
      label: string;
      type: 'input' | 'select' | 'switch' | 'number' | 'textarea';
      options?: Array<{ label: string; value: string | number }>;
      placeholder?: string;
      required?: boolean;
    }>;
  }>;
  endpoint: string;
}

export interface ReportTemplate {
  key: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  endpoint: string;
}

export interface ReportsConfig {
  templates: ReportTemplate[];
  defaultDateRange: 'week' | 'month' | 'quarter' | 'year';
}

export interface ModuleConfig {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  basePath: string;
  allowedRoles: Role[];
  dashboard: DashboardConfig;
  dataGrid: DataGridConfig;
  detailView: DetailViewConfig;
  config: ConfigFormConfig;
  reports: ReportsConfig;
}
