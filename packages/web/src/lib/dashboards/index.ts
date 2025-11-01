/**
 * Dashboard Library
 */

export type {
  UserRole,
  WidgetSize,
  WidgetType,
  Widget,
  DashboardLayout,
  KPIData,
  ChartData,
  WidgetData,
  DashboardPreferences,
} from './types';

export { getDashboardLayout, cfoLayout, auditorLayout, analystLayout, adminLayout } from './roleLayouts';
