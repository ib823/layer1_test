'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAnalytics } from '@/hooks/useAnalytics';

const COLORS = { critical: '#BB0000', high: '#E9730C', medium: '#F0AB00', low: '#107E3E' };

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState(6);
  const { trends, riskDistribution, departmentBreakdown, violationTypes, complianceScore, isLoading, error } = useAnalytics(timeRange);

  if (isLoading) {
    return <div className="p-6"><div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div></div>;
  }

  if (error) {
    return <div className="p-6"><div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center"><h3 className="text-red-800 font-semibold mb-2">Failed to load analytics</h3><button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg">Retry</button></div></div>;
  }

  if (trends.data?.data.length === 0) {
    return <div className="p-6"><div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center"><h3 className="text-xl font-semibold text-gray-900 mb-2">Not enough data yet</h3><p className="text-gray-600 mb-6">Run at least one SoD analysis to see trends.</p><button onClick={() => window.location.href = '/admin/sod'} className="px-6 py-3 bg-blue-600 text-white rounded-lg">Run first analysis</button></div></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <Breadcrumbs items={[{ label: 'Analytics' }]} />
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1></div>
        <Select value={timeRange.toString()} onChange={(e) => setTimeRange(parseInt(e.target.value))}>
          <option value="3">Last 3 months</option>
          <option value="6">Last 6 months</option>
          <option value="12">Last 12 months</option>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card><div className="text-sm font-medium text-gray-600">Compliance Score</div><div className="mt-2 text-3xl font-bold text-green-600">{complianceScore.data?.data.score || 0}%</div></Card>
        <Card><div className="text-sm font-medium text-gray-600">Open Violations</div><div className="mt-2 text-3xl font-bold text-gray-900">{riskDistribution.data?.total || 0}</div></Card>
        <Card><div className="text-sm font-medium text-gray-600">Critical</div><div className="mt-2 text-3xl font-bold text-red-600">{complianceScore.data?.data.critical_open || 0}</div></Card>
        <Card><div className="text-sm font-medium text-gray-600">Resolved</div><div className="mt-2 text-3xl font-bold text-green-600">{complianceScore.data?.data.resolved || 0}</div></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Violation Trends"><ResponsiveContainer width="100%" height={300}><LineChart data={trends.data?.data || []}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Legend /><Line type="monotone" dataKey="violations" stroke="#BB0000" strokeWidth={2} name="Open" /><Line type="monotone" dataKey="resolved" stroke="#107E3E" strokeWidth={2} name="Resolved" /></LineChart></ResponsiveContainer></Card>
        <Card title="Risk Distribution"><ResponsiveContainer width="100%" height={300}><PieChart><Pie data={riskDistribution.data?.data || []} cx="50%" cy="50%" label={(e) => `${e.name}: ${e.value}`} outerRadius={100} dataKey="value">{(riskDistribution.data?.data || []).map((entry, i) => <Cell key={i} fill={COLORS[entry.name.toLowerCase() as keyof typeof COLORS]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></Card>
      </div>

      <Card title="Top Departments"><ResponsiveContainer width="100%" height={300}><BarChart data={departmentBreakdown.data?.data || []}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="department" /><YAxis /><Tooltip /><Legend /><Bar dataKey="violations" fill="#0C2B87" name="Total" /><Bar dataKey="critical_count" fill="#BB0000" name="Critical" /></BarChart></ResponsiveContainer></Card>

      <Card title="Top Violation Types"><div className="space-y-4">{(violationTypes.data?.data || []).map((type, i) => <div key={i}><div className="flex justify-between text-sm mb-1"><span className="font-medium">{type.type}</span><span>{type.count} ({type.percentage}%)</span></div><div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-blue-600 h-2 rounded-full" style={{ width: `${type.percentage}%` }} /></div></div>)}</div></Card>
    </div>
  );
}
