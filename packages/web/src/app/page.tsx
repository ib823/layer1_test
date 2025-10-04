'use client';

import { Button, Card, CardTitle, Badge } from '@/components/ui';
import { useViolations, useDashboardStats } from '@/hooks';
import { useAppStore } from '@/lib/store';
import { useEffect } from 'react';

export default function DashboardPage() {
  const { tenantId, setTenantId } = useAppStore();

  // Set default tenant for demo - in production, this would come from auth
  useEffect(() => {
    if (!tenantId) {
      setTenantId('tenant-123');
    }
  }, [tenantId, setTenantId]);

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useDashboardStats(tenantId);

  // Fetch recent violations
  const { data: violations, isLoading: violationsLoading } = useViolations(tenantId, {
    status: 'OPEN',
  });

  const recentViolations = violations?.slice(0, 4) || [];

  return (
    <main style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="text-3xl font-bold" style={{ marginBottom: '0.5rem' }}>
          SAP GRC Dashboard
        </h1>
        <p className="text-secondary">
          Governance, Risk & Compliance Overview
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md" style={{ marginBottom: '2rem' }}>
        <Card>
          <Card.Body>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-secondary" style={{ marginBottom: '0.25rem' }}>
                  Total Violations
                </p>
                <p className="text-3xl font-bold">
                  {statsLoading ? '...' : stats?.totalViolations || 0}
                </p>
              </div>
              {stats?.trends && (
                <Badge variant={stats.trends.violations > 0 ? 'critical' : 'low'}>
                  {stats.trends.violations > 0 ? '+' : ''}{stats.trends.violations}%
                </Badge>
              )}
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-secondary" style={{ marginBottom: '0.25rem' }}>
                  Critical Issues
                </p>
                <p className="text-3xl font-bold text-critical">
                  {statsLoading ? '...' : stats?.criticalIssues || 0}
                </p>
              </div>
              {stats?.trends && (
                <Badge variant="high">
                  +{stats.trends.critical}
                </Badge>
              )}
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-secondary" style={{ marginBottom: '0.25rem' }}>
                  Users Analyzed
                </p>
                <p className="text-3xl font-bold">
                  {statsLoading ? '...' : stats?.usersAnalyzed.toLocaleString() || 0}
                </p>
              </div>
              <Badge variant="info">Active</Badge>
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-secondary" style={{ marginBottom: '0.25rem' }}>
                  Compliance Score
                </p>
                <p className="text-3xl font-bold text-low">
                  {statsLoading ? '...' : `${stats?.complianceScore}%` || '0%'}
                </p>
              </div>
              {stats?.trends && (
                <Badge variant="low">
                  +{stats.trends.compliance}%
                </Badge>
              )}
            </div>
          </Card.Body>
        </Card>
      </div>

      {/* Recent Violations Table */}
      <Card>
        <Card.Header>
          <div className="flex justify-between items-center">
            <CardTitle>Recent SoD Violations</CardTitle>
            <Button variant="primary" size="sm">
              View All
            </Button>
          </div>
        </Card.Header>
        <Card.Body style={{ padding: 0 }}>
          {violationsLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <p className="text-secondary">Loading violations...</p>
            </div>
          ) : recentViolations.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <p className="text-secondary">No violations found</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Violation Type</th>
                  <th>Risk Level</th>
                  <th>Detected</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentViolations.map((violation) => (
                  <tr key={violation.violation_id}>
                    <td className="font-medium">{violation.user_id}</td>
                    <td>{violation.business_process}</td>
                    <td>
                      <Badge
                        variant={
                          violation.risk_level === 'CRITICAL'
                            ? 'critical'
                            : violation.risk_level === 'HIGH'
                            ? 'high'
                            : violation.risk_level === 'MEDIUM'
                            ? 'medium'
                            : 'low'
                        }
                      >
                        {violation.risk_level}
                      </Badge>
                    </td>
                    <td className="text-secondary">
                      {new Date(violation.detected_at).toLocaleString()}
                    </td>
                    <td>
                      <span
                        className={
                          violation.status === 'OPEN'
                            ? 'text-high'
                            : violation.status === 'RESOLVED'
                            ? 'text-low'
                            : 'text-secondary'
                        }
                      >
                        {violation.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card.Body>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-md" style={{ marginTop: '2rem' }}>
        <Button variant="primary" size="md">
          Run New Analysis
        </Button>
        <Button variant="secondary" size="md">
          Export Report
        </Button>
        <Button variant="ghost" size="md">
          View Settings
        </Button>
      </div>
    </main>
  );
}
