'use client';

import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import Link from 'next/link';

interface DashboardMetrics {
  invoices: {
    total: number;
    draft: number;
    submitted: number;
    accepted: number;
    rejected: number;
    acceptanceRate: number;
  };
  exceptions: {
    total: number;
    critical: number;
    canRetry: number;
    byType: Record<string, number>;
  };
  queue: {
    pending: number;
    processing: number;
    failed: number;
    avgProcessingTimeMs: number;
  };
  circuitBreakers: Array<{
    serviceName: string;
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    failureCount: number;
    lastFailureAt?: string;
  }>;
  recentActivity: Array<{
    id: string;
    type: string;
    message: string;
    timestamp: string;
    severity: 'INFO' | 'WARNING' | 'ERROR';
  }>;
  performance: {
    todaySubmissions: number;
    todayAcceptance: number;
    avgValidationTimeMs: number;
    avgSubmissionTimeMs: number;
  };
}

export default function OperationsDashboardPage() {
  const { data: metrics, isLoading } = useQuery<DashboardMetrics>({
    queryKey: ['operations-dashboard'],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/modules/lhdn/operations/dashboard`);
      if (!res.ok) throw new Error('Failed to fetch dashboard metrics');
      return res.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading || !metrics) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <p className="text-center text-text-secondary">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <Breadcrumbs
        items={[
          { label: 'LHDN e-Invoice', href: '/lhdn' },
          { label: 'Operations Dashboard' },
        ]}
      />

      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-text-primary mb-2">
          Operations Dashboard
        </h1>
        <p className="text-text-secondary">
          Real-time monitoring and operational metrics for LHDN e-Invoice integration
        </p>
      </div>

      {/* Invoice Metrics */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-text-primary mb-4">Invoice Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <Card>
            <Card.Body>
              <span className="text-sm text-text-secondary">Total</span>
              <p className="text-3xl font-semibold text-text-primary">{metrics.invoices.total}</p>
            </Card.Body>
          </Card>
          <Card>
            <Card.Body>
              <span className="text-sm text-text-secondary">Draft</span>
              <p className="text-3xl font-semibold text-gray-600">{metrics.invoices.draft}</p>
            </Card.Body>
          </Card>
          <Card>
            <Card.Body>
              <span className="text-sm text-text-secondary">Submitted</span>
              <p className="text-3xl font-semibold text-blue-600">{metrics.invoices.submitted}</p>
            </Card.Body>
          </Card>
          <Card>
            <Card.Body>
              <span className="text-sm text-text-secondary">Accepted</span>
              <p className="text-3xl font-semibold text-status-low">{metrics.invoices.accepted}</p>
            </Card.Body>
          </Card>
          <Card>
            <Card.Body>
              <span className="text-sm text-text-secondary">Rejected</span>
              <p className="text-3xl font-semibold text-status-high">{metrics.invoices.rejected}</p>
            </Card.Body>
          </Card>
          <Card>
            <Card.Body>
              <span className="text-sm text-text-secondary">Accept Rate</span>
              <p className="text-3xl font-semibold text-brand-primary">
                {metrics.invoices.acceptanceRate.toFixed(1)}%
              </p>
            </Card.Body>
          </Card>
        </div>
      </div>

      {/* Exceptions & Queue */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-text-primary mb-4">Exceptions</h2>
          <Card>
            <Card.Body>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <span className="text-sm text-text-secondary">Total</span>
                    <p className="text-2xl font-semibold text-text-primary">{metrics.exceptions.total}</p>
                  </div>
                  <div>
                    <span className="text-sm text-text-secondary">Critical</span>
                    <p className="text-2xl font-semibold text-status-critical">{metrics.exceptions.critical}</p>
                  </div>
                  <div>
                    <span className="text-sm text-text-secondary">Can Retry</span>
                    <p className="text-2xl font-semibold text-brand-primary">{metrics.exceptions.canRetry}</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-border-default">
                  <p className="text-sm text-text-secondary mb-2">By Type</p>
                  <div className="space-y-2">
                    {Object.entries(metrics.exceptions.byType).map(([type, count]) => (
                      <div key={type} className="flex justify-between items-center">
                        <span className="text-sm text-text-primary">{type.replace(/_/g, ' ')}</span>
                        <Badge variant="medium">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="pt-4">
                  <Link href="/lhdn/exceptions">
                    <span className="text-sm text-brand-primary hover:underline">View Exception Inbox →</span>
                  </Link>
                </div>
              </div>
            </Card.Body>
          </Card>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-text-primary mb-4">Submission Queue</h2>
          <Card>
            <Card.Body>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <span className="text-sm text-text-secondary">Pending</span>
                    <p className="text-2xl font-semibold text-gray-600">{metrics.queue.pending}</p>
                  </div>
                  <div>
                    <span className="text-sm text-text-secondary">Processing</span>
                    <p className="text-2xl font-semibold text-blue-600">{metrics.queue.processing}</p>
                  </div>
                  <div>
                    <span className="text-sm text-text-secondary">Failed</span>
                    <p className="text-2xl font-semibold text-status-high">{metrics.queue.failed}</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-border-default">
                  <p className="text-sm text-text-secondary mb-2">Performance</p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-text-primary">Avg Processing Time</span>
                      <span className="text-sm font-medium">{metrics.queue.avgProcessingTimeMs}ms</span>
                    </div>
                  </div>
                </div>
                <div className="pt-4">
                  <Link href="/lhdn/monitor">
                    <span className="text-sm text-brand-primary hover:underline">View Submission Monitor →</span>
                  </Link>
                </div>
              </div>
            </Card.Body>
          </Card>
        </div>
      </div>

      {/* Circuit Breakers */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-text-primary mb-4">Circuit Breakers</h2>
        <Card>
          <Card.Body>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {metrics.circuitBreakers.map((cb) => (
                <div key={cb.serviceName} className="p-4 border border-border-default rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-text-primary">{cb.serviceName.replace(/_/g, ' ')}</span>
                    <Badge
                      variant={
                        cb.state === 'CLOSED'
                          ? 'low'
                          : cb.state === 'OPEN'
                          ? 'high'
                          : 'medium'
                      }
                    >
                      {cb.state}
                    </Badge>
                  </div>
                  <div className="text-sm text-text-secondary">
                    Failures: {cb.failureCount}
                  </div>
                  {cb.lastFailureAt && (
                    <div className="text-xs text-text-secondary mt-1">
                      Last: {new Date(cb.lastFailureAt).toLocaleString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card.Body>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-text-primary mb-4">Today's Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <Card.Body>
              <span className="text-sm text-text-secondary">Submissions</span>
              <p className="text-3xl font-semibold text-brand-primary">{metrics.performance.todaySubmissions}</p>
            </Card.Body>
          </Card>
          <Card>
            <Card.Body>
              <span className="text-sm text-text-secondary">Acceptances</span>
              <p className="text-3xl font-semibold text-status-low">{metrics.performance.todayAcceptance}</p>
            </Card.Body>
          </Card>
          <Card>
            <Card.Body>
              <span className="text-sm text-text-secondary">Avg Validation Time</span>
              <p className="text-2xl font-semibold text-text-primary">{metrics.performance.avgValidationTimeMs}ms</p>
            </Card.Body>
          </Card>
          <Card>
            <Card.Body>
              <span className="text-sm text-text-secondary">Avg Submission Time</span>
              <p className="text-2xl font-semibold text-text-primary">{metrics.performance.avgSubmissionTimeMs}ms</p>
            </Card.Body>
          </Card>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-xl font-semibold text-text-primary mb-4">Recent Activity</h2>
        <Card>
          <Card.Body>
            <div className="space-y-3">
              {metrics.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 pb-3 border-b border-border-default last:border-0">
                  <div className={`w-2 h-2 rounded-full mt-1.5 ${
                    activity.severity === 'ERROR' ? 'bg-status-high' :
                    activity.severity === 'WARNING' ? 'bg-status-medium' :
                    'bg-status-low'
                  }`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <Badge variant="info">{activity.type.replace(/_/g, ' ')}</Badge>
                      <span className="text-xs text-text-secondary">
                        {new Date(activity.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-text-primary mt-1">{activity.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card.Body>
        </Card>
      </div>
    </div>
  );
}
