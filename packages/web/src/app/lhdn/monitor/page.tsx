'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Table } from '@/components/ui/Table';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { PageHead } from '@/components/seo/PageHead';
import Link from 'next/link';

interface SubmissionQueueItem {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  sapBillingDocument: string;
  jobType: 'SUBMIT_INVOICE' | 'QUERY_STATUS' | 'CANCEL_INVOICE' | 'SUBMIT_CN' | 'SUBMIT_DN';
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  priority: number;
  attemptCount: number;
  maxAttempts: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  nextRetryAt?: string;
  errorMessage?: string;
  processingTimeMs?: number;
}

export default function SubmissionMonitorPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [jobTypeFilter, setJobTypeFilter] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch queue items
  const { data: queueItems = [], isLoading } = useQuery<SubmissionQueueItem[]>({
    queryKey: ['submission-queue', statusFilter, jobTypeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (jobTypeFilter !== 'all') params.append('jobType', jobTypeFilter);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/modules/lhdn/queue?${params}`);
      if (!res.ok) throw new Error('Failed to fetch queue');
      const data = await res.json();
      return data.items || [];
    },
    refetchInterval: autoRefresh ? 5000 : false, // Refresh every 5 seconds if enabled
  });

  // Configure table columns
  const columns = [
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }: { row: { original: SubmissionQueueItem } }) => {
        const statusColors: Record<string, string> = {
          PENDING: 'bg-gray-100 text-gray-700',
          PROCESSING: 'bg-blue-100 text-blue-700',
          COMPLETED: 'bg-green-100 text-green-700',
          FAILED: 'bg-red-100 text-red-700',
        };
        return (
          <span className={`px-2 py-1 rounded-md text-xs font-medium ${statusColors[row.original.status]}`}>
            {row.original.status}
          </span>
        );
      },
    },
    {
      id: 'invoice',
      header: 'Invoice',
      cell: ({ row }: { row: { original: SubmissionQueueItem } }) => (
        <div className="flex flex-col">
          <Link
            href={`/lhdn/invoices/${row.original.invoiceId}`}
            className="font-medium text-brand-primary hover:underline"
          >
            {row.original.invoiceNumber}
          </Link>
          <span className="text-xs text-text-secondary">SAP: {row.original.sapBillingDocument}</span>
        </div>
      ),
    },
    {
      id: 'jobType',
      header: 'Job Type',
      cell: ({ row }: { row: { original: SubmissionQueueItem } }) => (
        <Badge variant="info">{row.original.jobType.replace(/_/g, ' ')}</Badge>
      ),
    },
    {
      id: 'priority',
      header: 'Priority',
      cell: ({ row }: { row: { original: SubmissionQueueItem } }) => (
        <span className="text-sm">{row.original.priority}</span>
      ),
    },
    {
      id: 'attempts',
      header: 'Attempts',
      cell: ({ row }: { row: { original: SubmissionQueueItem } }) => (
        <span className="text-sm">
          {row.original.attemptCount} / {row.original.maxAttempts}
        </span>
      ),
    },
    {
      id: 'timing',
      header: 'Timing',
      cell: ({ row }: { row: { original: SubmissionQueueItem } }) => {
        const created = new Date(row.original.createdAt);
        const now = new Date();
        const ageMinutes = Math.floor((now.getTime() - created.getTime()) / 60000);

        return (
          <div className="flex flex-col text-xs">
            <span>Age: {ageMinutes}m</span>
            {row.original.processingTimeMs && (
              <span className="text-text-secondary">
                Proc: {row.original.processingTimeMs}ms
              </span>
            )}
            {row.original.nextRetryAt && (
              <span className="text-status-medium">
                Retry: {new Date(row.original.nextRetryAt).toLocaleTimeString()}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: 'error',
      header: 'Error',
      cell: ({ row }: { row: { original: SubmissionQueueItem } }) =>
        row.original.errorMessage ? (
          <span className="text-xs text-status-high line-clamp-2">{row.original.errorMessage}</span>
        ) : (
          <span className="text-xs text-text-secondary">-</span>
        ),
    },
  ];

  const stats = {
    total: queueItems.length,
    pending: queueItems.filter((i) => i.status === 'PENDING').length,
    processing: queueItems.filter((i) => i.status === 'PROCESSING').length,
    completed: queueItems.filter((i) => i.status === 'COMPLETED').length,
    failed: queueItems.filter((i) => i.status === 'FAILED').length,
  };

  return (
    <>
      <PageHead
        title="LHDN Submission Monitor"
        description="Real-time monitoring of LHDN e-Invoice submission queue and processing status"
      />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Breadcrumbs
          items={[
            { label: 'LHDN e-Invoice', href: '/lhdn' },
            { label: 'Submission Monitor' },
          ]}
        />

      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-semibold text-text-primary mb-2">
            Submission Monitor
          </h1>
          <p className="text-text-secondary">
            Real-time monitoring of LHDN submission queue
          </p>
        </div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="rounded border-border-default"
          />
          <span className="text-sm text-text-primary">Auto-refresh (5s)</span>
        </label>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <Card>
          <Card.Body>
            <span className="text-sm text-text-secondary">Total</span>
            <p className="text-3xl font-semibold text-text-primary">{stats.total}</p>
          </Card.Body>
        </Card>
        <Card>
          <Card.Body>
            <span className="text-sm text-text-secondary">Pending</span>
            <p className="text-3xl font-semibold text-gray-700">{stats.pending}</p>
          </Card.Body>
        </Card>
        <Card>
          <Card.Body>
            <span className="text-sm text-text-secondary">Processing</span>
            <p className="text-3xl font-semibold text-blue-700">{stats.processing}</p>
          </Card.Body>
        </Card>
        <Card>
          <Card.Body>
            <span className="text-sm text-text-secondary">Completed</span>
            <p className="text-3xl font-semibold text-status-low">{stats.completed}</p>
          </Card.Body>
        </Card>
        <Card>
          <Card.Body>
            <span className="text-sm text-text-secondary">Failed</span>
            <p className="text-3xl font-semibold text-status-high">{stats.failed}</p>
          </Card.Body>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <Card.Body>
          <div className="grid grid-cols-2 gap-4">
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="PROCESSING">Processing</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
            </Select>

            <Select value={jobTypeFilter} onChange={(e) => setJobTypeFilter(e.target.value)}>
              <option value="all">All Job Types</option>
              <option value="SUBMIT_INVOICE">Submit Invoice</option>
              <option value="QUERY_STATUS">Query Status</option>
              <option value="CANCEL_INVOICE">Cancel Invoice</option>
              <option value="SUBMIT_CN">Submit Credit Note</option>
              <option value="SUBMIT_DN">Submit Debit Note</option>
            </Select>
          </div>
        </Card.Body>
      </Card>

      {/* Queue Table */}
      <Card>
        <Card.Body>
          <Table
            data={queueItems}
            columns={columns}
            isLoading={isLoading}
            emptyMessage="Queue is empty"
          />
        </Card.Body>
      </Card>
      </div>
    </>
  );
}
