'use client';

/**
 * Tenant Dashboard Page
 *
 * Overview of compliance status, recent violations, and key metrics.
 */

import { Card, Statistic, Space, Button, Badge, Tag } from '@sap-framework/ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  AlertOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  TeamOutlined,
} from '@ant-design/icons';

const mockChartData = [
  { name: 'P2P', critical: 12, high: 24, medium: 18 },
  { name: 'OTC', critical: 8, high: 15, medium: 22 },
  { name: 'R2R', critical: 5, high: 18, medium: 14 },
  { name: 'H2R', critical: 3, high: 8, medium: 12 },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Dashboard</h1>
          <p className="text-secondary mt-1">Overview of compliance and risk status</p>
        </div>
        <Space>
          <Button variant="primary">Run New Analysis</Button>
          <Button>Export Report</Button>
        </Space>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <Statistic
            title="Total Violations"
            value={247}
            prefix={<AlertOutlined />}
            valueStyle={{ color: '#DC2626' }}
          />
        </Card>
        <Card>
          <Statistic
            title="Critical Issues"
            value={45}
            prefix={<AlertOutlined />}
            valueStyle={{ color: '#EA580C' }}
          />
        </Card>
        <Card>
          <Statistic
            title="Users Analyzed"
            value={1284}
            prefix={<TeamOutlined />}
            valueStyle={{ color: '#2563EB' }}
          />
        </Card>
        <Card>
          <Statistic
            title="Compliance Score"
            value={94}
            suffix="%"
            prefix={<CheckCircleOutlined />}
            valueStyle={{ color: '#16A34A' }}
          />
        </Card>
      </div>

      {/* Violations by Process Chart */}
      <Card title="Violations by Business Process" className="w-full">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={mockChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="critical" fill="#DC2626" name="Critical" />
            <Bar dataKey="high" fill="#EA580C" name="High" />
            <Bar dataKey="medium" fill="#F59E0B" name="Medium" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Recent Violations */}
      <Card
        title="Recent Violations"
        extra={<Button variant="link">View All</Button>}
      >
        <div className="space-y-3">
          {[
            { user: 'john.doe', type: 'PO Creation + Approval', risk: 'critical', time: '2 hours ago' },
            { user: 'jane.smith', type: 'Vendor Master + Payment', risk: 'critical', time: '4 hours ago' },
            { user: 'bob.wilson', type: 'GL Posting + Close', risk: 'high', time: '6 hours ago' },
          ].map((violation, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 bg-surface-base rounded-md hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Tag variant={violation.risk as any}>{violation.risk.toUpperCase()}</Tag>
                <div>
                  <div className="font-medium text-primary">{violation.user}</div>
                  <div className="text-sm text-secondary">{violation.type}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-tertiary text-sm">
                <ClockCircleOutlined />
                {violation.time}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
