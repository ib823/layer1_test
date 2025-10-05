'use client';

import { Card } from '@/components/ui/Card';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { useDashboardKPIs } from '@/hooks/useDashboard';

export default function DashboardPage() {
  const { data, isLoading } = useDashboardKPIs();

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-32 bg-gray-200 rounded"></div>)}
          </div>
        </div>
      </div>
    );
  }

  const kpis = [
    { label: 'Total Violations', value: data?.data.total?.toString() || '0', trend: `${data?.data.trend > 0 ? '+' : ''}${data?.data.trend || 0}%`, status: data?.data.critical > 0 ? 'error' : 'success' },
    { label: 'Critical Issues', value: data?.data.critical?.toString() || '0', status: 'error' },
    { label: 'Users Analyzed', value: data?.data.users?.toString() || '0', status: 'info' },
    { label: 'Compliance Score', value: `${data?.data.score || 100}%`, status: 'success' },
  ];

  return (
    <div className="p-6 space-y-6">
      <Breadcrumbs items={[{ label: 'Dashboard' }]} />

      <div>
        <h1 className="text-2xl font-bold mb-2">Dashboard Overview</h1>
        <p className="text-gray-600">Real-time metrics and insights from your SAP environment</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, i) => (
          <Card key={i}>
            <div className="p-6">
              <div className="text-sm font-medium text-gray-600">{kpi.label}</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">{kpi.value}</div>
              {kpi.trend && <div className="text-sm text-gray-500 mt-1">{kpi.trend} vs last month</div>}
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <a href="/violations" className="block p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                <div className="font-medium text-blue-900">View Violations</div>
                <div className="text-sm text-blue-700">Review and manage SoD violations</div>
              </a>
              <a href="/analytics" className="block p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
                <div className="font-medium text-purple-900">Analytics</div>
                <div className="text-sm text-purple-700">Explore trends and insights</div>
              </a>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">System Status</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Database Connection</span>
                <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">Active</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">SAP Connector</span>
                <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">Connected</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Last Analysis</span>
                <span className="text-sm text-gray-600">2 hours ago</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
