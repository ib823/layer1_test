'use client';

import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState('30days');
  const [department, setDepartment] = useState('all');

  // Fetch analytics data
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics', timeRange, department],
    queryFn: async () => {
      const params = new URLSearchParams({
        timeRange,
        ...(department !== 'all' && { department }),
      });
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/analytics?${params}`);
      if (!res.ok) throw new Error('Failed to fetch analytics');
      return res.json();
    },
  });

  // Mock data structure (replace with real API data)
  const trendData = analytics?.trends || [
    { date: '2025-09-01', total: 45, critical: 12, high: 18, medium: 10, low: 5 },
    { date: '2025-09-08', total: 52, critical: 15, high: 20, medium: 12, low: 5 },
    { date: '2025-09-15', total: 48, critical: 13, high: 19, medium: 11, low: 5 },
    { date: '2025-09-22', total: 41, critical: 10, high: 16, medium: 10, low: 5 },
    { date: '2025-09-29', total: 38, critical: 8, high: 15, medium: 10, low: 5 },
    { date: '2025-10-06', total: 35, critical: 7, high: 14, medium: 9, low: 5 },
  ];

  const departmentData = analytics?.byDepartment || [
    { name: 'Finance', violations: 87, riskScore: 75 },
    { name: 'HR', violations: 42, riskScore: 45 },
    { name: 'IT', violations: 31, riskScore: 38 },
    { name: 'Operations', violations: 56, riskScore: 52 },
    { name: 'Sales', violations: 23, riskScore: 28 },
  ];

  const riskDistribution = analytics?.riskDistribution || [
    { name: 'Critical', value: 65, color: '#BB0000' },
    { name: 'High', value: 132, color: '#E9730C' },
    { name: 'Medium', value: 78, color: '#F0AB00' },
    { name: 'Low', value: 45, color: '#107E3E' },
  ];

  const topViolationTypes = analytics?.topViolations || [
    { type: 'PO Creation + Invoice Approval', count: 45 },
    { type: 'Vendor Creation + Payment', count: 38 },
    { type: 'User Admin + Role Assignment', count: 32 },
    { type: 'GL Posting + Approval', count: 28 },
    { type: 'Asset Creation + Disposal', count: 22 },
  ];

  const complianceScore = analytics?.complianceScore || {
    overall: 82,
    trend: 'improving',
    previousScore: 78,
  };

  // Chart colors matching design system
  const COLORS = {
    critical: '#BB0000',
    high: '#E9730C',
    medium: '#F0AB00',
    low: '#107E3E',
    primary: '#0C2B87',
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-text-primary mb-2">
            Compliance Analytics
          </h1>
          <p className="text-text-secondary">
            Comprehensive insights into your SoD violations and risk posture
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <Select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
            <option value="1year">Last Year</option>
          </Select>
          <Select value={department} onChange={(e) => setDepartment(e.target.value)}>
            <option value="all">All Departments</option>
            <option value="finance">Finance</option>
            <option value="hr">HR</option>
            <option value="it">IT</option>
            <option value="operations">Operations</option>
            <option value="sales">Sales</option>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <Card.Body>
            <div className="flex flex-col">
              <span className="text-sm text-text-secondary mb-1">Compliance Score</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-semibold text-brand-primary">
                  {complianceScore.overall}%
                </span>
                <span className={`text-sm ${complianceScore.trend === 'improving' ? 'text-status-low' : 'text-status-high'}`}>
                  {complianceScore.trend === 'improving' ? '↑' : '↓'}{' '}
                  {Math.abs(complianceScore.overall - complianceScore.previousScore)}%
                </span>
              </div>
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            <div className="flex flex-col">
              <span className="text-sm text-text-secondary mb-1">Total Violations</span>
              <span className="text-3xl font-semibold text-text-primary">
                {riskDistribution.reduce((sum, item) => sum + item.value, 0)}
              </span>
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            <div className="flex flex-col">
              <span className="text-sm text-text-secondary mb-1">High Risk</span>
              <span className="text-3xl font-semibold text-status-high">
                {riskDistribution.find(r => r.name === 'High')?.value || 0}
              </span>
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            <div className="flex flex-col">
              <span className="text-sm text-text-secondary mb-1">Critical</span>
              <span className="text-3xl font-semibold text-status-critical">
                {riskDistribution.find(r => r.name === 'Critical')?.value || 0}
              </span>
            </div>
          </Card.Body>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Trend Chart */}
        <Card>
          <Card.Header>
            <h2 className="text-lg font-semibold">Violation Trends</h2>
            <p className="text-sm text-text-secondary">Historical violation count over time</p>
          </Card.Header>
          <Card.Body>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="critical" stroke={COLORS.critical} strokeWidth={2} name="Critical" />
                <Line type="monotone" dataKey="high" stroke={COLORS.high} strokeWidth={2} name="High" />
                <Line type="monotone" dataKey="medium" stroke={COLORS.medium} strokeWidth={2} name="Medium" />
                <Line type="monotone" dataKey="low" stroke={COLORS.low} strokeWidth={2} name="Low" />
              </LineChart>
            </ResponsiveContainer>
          </Card.Body>
        </Card>

        {/* Risk Distribution */}
        <Card>
          <Card.Header>
            <h2 className="text-lg font-semibold">Risk Distribution</h2>
            <p className="text-sm text-text-secondary">Violations by risk level</p>
          </Card.Header>
          <Card.Body>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={riskDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {riskDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card.Body>
        </Card>

        {/* Department Comparison */}
        <Card>
          <Card.Header>
            <h2 className="text-lg font-semibold">Department Comparison</h2>
            <p className="text-sm text-text-secondary">Violations and risk scores by department</p>
          </Card.Header>
          <Card.Body>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={departmentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="violations" fill={COLORS.primary} name="Violations" />
                <Bar yAxisId="right" dataKey="riskScore" fill={COLORS.high} name="Risk Score" />
              </BarChart>
            </ResponsiveContainer>
          </Card.Body>
        </Card>

        {/* Top Violation Types */}
        <Card>
          <Card.Header>
            <h2 className="text-lg font-semibold">Top Violation Types</h2>
            <p className="text-sm text-text-secondary">Most frequent SoD conflicts</p>
          </Card.Header>
          <Card.Body>
            <div className="space-y-4">
              {topViolationTypes.map((violation, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-text-primary">
                        {violation.type}
                      </span>
                    </div>
                    <div className="w-full bg-surface-secondary rounded-full h-2">
                      <div
                        className="bg-brand-primary h-2 rounded-full transition-all"
                        style={{
                          width: `${(violation.count / topViolationTypes[0].count) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  <span className="ml-4 text-lg font-semibold text-text-primary">
                    {violation.count}
                  </span>
                </div>
              ))}
            </div>
          </Card.Body>
        </Card>
      </div>

      {/* Detailed Stats Table */}
      <Card>
        <Card.Header>
          <h2 className="text-lg font-semibold">Department Details</h2>
        </Card.Header>
        <Card.Body>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Department</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-text-primary">Violations</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-text-primary">Risk Score</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-text-primary">Status</th>
                </tr>
              </thead>
              <tbody>
                {departmentData.map((dept, index) => (
                  <tr key={index} className="border-b border-border hover:bg-surface-secondary transition-colors">
                    <td className="py-3 px-4 font-medium">{dept.name}</td>
                    <td className="py-3 px-4 text-right">{dept.violations}</td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`font-semibold ${
                          dept.riskScore >= 70
                            ? 'text-status-critical'
                            : dept.riskScore >= 50
                            ? 'text-status-high'
                            : dept.riskScore >= 30
                            ? 'text-status-medium'
                            : 'text-status-low'
                        }`}
                      >
                        {dept.riskScore}/100
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge
                        variant={
                          dept.riskScore >= 70
                            ? 'critical'
                            : dept.riskScore >= 50
                            ? 'high'
                            : dept.riskScore >= 30
                            ? 'medium'
                            : 'low'
                        }
                      >
                        {dept.riskScore >= 70
                          ? 'Critical'
                          : dept.riskScore >= 50
                          ? 'High'
                          : dept.riskScore >= 30
                          ? 'Medium'
                          : 'Low'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}
