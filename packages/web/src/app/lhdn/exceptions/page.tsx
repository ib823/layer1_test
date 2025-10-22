'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Table } from '@/components/ui/Table';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/hooks/useToast';
import { PageHead } from '@/components/seo/PageHead';
import Link from 'next/link';

interface LHDNException {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  tenantId: string;
  companyCode: string;
  status: 'DRAFT' | 'VALIDATED' | 'SUBMITTED' | 'REJECTED' | 'CANCELLED';
  exceptionType: 'VALIDATION_FAILED' | 'SUBMISSION_FAILED' | 'MAPPING_FAILED' | 'REJECTED_BY_LHDN' | 'TIMEOUT';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  errorMessage: string;
  errorDetails: string[];
  sapBillingDocument: string;
  documentType: '01' | '02' | '03' | '04' | '11';
  totalAmount: number;
  currency: string;
  customerName: string;
  retryCount: number;
  maxRetries: number;
  canRetry: boolean;
  assignedTo?: string;
  occurredAt: string;
  lastRetryAt?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
}

export default function ExceptionInboxPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [exceptionTypeFilter, setExceptionTypeFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedExceptions, setSelectedExceptions] = useState<Set<string>>(new Set());
  const [selectedException, setSelectedException] = useState<LHDNException | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRetryModal, setShowRetryModal] = useState(false);
  const [showBulkRetryModal, setShowBulkRetryModal] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const { addToast } = useToast();
  const queryClient = useQueryClient();

  // Fetch exceptions
  const { data: exceptions = [], isLoading } = useQuery<LHDNException[]>({
    queryKey: ['lhdn-exceptions', searchTerm, exceptionTypeFilter, severityFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (exceptionTypeFilter !== 'all') params.append('exceptionType', exceptionTypeFilter);
      if (severityFilter !== 'all') params.append('severity', severityFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchTerm) params.append('search', searchTerm);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/modules/lhdn/exceptions?${params}`);
      if (!res.ok) throw new Error('Failed to fetch exceptions');
      const data = await res.json();
      return data.exceptions || [];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Retry single invoice mutation
  const retryMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/modules/lhdn/exceptions/${id}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolutionNotes: notes }),
      });
      if (!res.ok) throw new Error('Failed to retry');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lhdn-exceptions'] });
      addToast({
        title: 'Retry Initiated',
        message: 'Invoice resubmission has been queued',
        type: 'success',
      });
      setShowRetryModal(false);
      setSelectedException(null);
      setResolutionNotes('');
    },
    onError: (error: Error) => {
      addToast({
        title: 'Retry Failed',
        message: error.message,
        type: 'error',
      });
    },
  });

  // Bulk retry mutation
  const bulkRetryMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/modules/lhdn/exceptions/bulk-retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exceptionIds: ids }),
      });
      if (!res.ok) throw new Error('Failed to bulk retry');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lhdn-exceptions'] });
      addToast({
        title: 'Bulk Retry Initiated',
        message: `${data.queued} invoices queued for retry`,
        type: 'success',
      });
      setShowBulkRetryModal(false);
      setSelectedExceptions(new Set());
    },
    onError: (error: Error) => {
      addToast({
        title: 'Bulk Retry Failed',
        message: error.message,
        type: 'error',
      });
    },
  });

  // Mark as resolved mutation
  const resolveMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/modules/lhdn/exceptions/${id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolutionNotes: notes }),
      });
      if (!res.ok) throw new Error('Failed to resolve');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lhdn-exceptions'] });
      addToast({
        title: 'Exception Resolved',
        message: 'Exception marked as resolved',
        type: 'success',
      });
      setShowDetailsModal(false);
      setSelectedException(null);
      setResolutionNotes('');
    },
    onError: (error: Error) => {
      addToast({
        title: 'Resolve Failed',
        message: error.message,
        type: 'error',
      });
    },
  });

  // Handle row selection
  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedExceptions);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedExceptions(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedExceptions.size === exceptions.length) {
      setSelectedExceptions(new Set());
    } else {
      setSelectedExceptions(new Set(exceptions.map((e) => e.id)));
    }
  };

  // Configure table columns
  const columns = [
    {
      id: 'select',
      header: () => (
        <input
          type="checkbox"
          checked={selectedExceptions.size === exceptions.length && exceptions.length > 0}
          onChange={toggleSelectAll}
          className="rounded border-border-default"
        />
      ),
      cell: ({ row }: { row: { original: LHDNException } }) => (
        <input
          type="checkbox"
          checked={selectedExceptions.has(row.original.id)}
          onChange={() => toggleSelection(row.original.id)}
          className="rounded border-border-default"
        />
      ),
    },
    {
      id: 'severity',
      header: 'Severity',
      accessorFn: (row: LHDNException) => row.severity,
      cell: ({ row }: { row: { original: LHDNException } }) => {
        const variantMap: Record<string, 'critical' | 'high' | 'medium' | 'low'> = {
          CRITICAL: 'critical',
          HIGH: 'high',
          MEDIUM: 'medium',
          LOW: 'low',
        };
        return <Badge variant={variantMap[row.original.severity]}>{row.original.severity}</Badge>;
      },
    },
    {
      id: 'invoice',
      header: 'Invoice',
      accessorFn: (row: LHDNException) => row.invoiceNumber,
      cell: ({ row }: { row: { original: LHDNException } }) => (
        <div className="flex flex-col">
          <Link
            href={`/lhdn/invoices/${row.original.invoiceId}`}
            className="font-medium text-text-primary hover:text-brand-primary transition-colors"
          >
            {row.original.invoiceNumber}
          </Link>
          <span className="text-xs text-text-secondary">
            SAP: {row.original.sapBillingDocument}
          </span>
        </div>
      ),
    },
    {
      id: 'customer',
      header: 'Customer',
      accessorFn: (row: LHDNException) => row.customerName,
      cell: ({ row }: { row: { original: LHDNException } }) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.customerName}</span>
          <span className="text-xs text-text-secondary">
            {row.original.currency} {row.original.totalAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
          </span>
        </div>
      ),
    },
    {
      id: 'exceptionType',
      header: 'Exception Type',
      accessorFn: (row: LHDNException) => row.exceptionType,
      cell: ({ row }: { row: { original: LHDNException } }) => (
        <div className="flex flex-col">
          <span className="font-medium text-sm">
            {row.original.exceptionType.replace(/_/g, ' ')}
          </span>
          <span className="text-xs text-text-secondary line-clamp-1">
            {row.original.errorMessage}
          </span>
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      accessorFn: (row: LHDNException) => row.status,
      cell: ({ row }: { row: { original: LHDNException } }) => {
        const statusColors: Record<string, string> = {
          DRAFT: 'bg-gray-100 text-gray-700',
          VALIDATED: 'bg-blue-100 text-blue-700',
          SUBMITTED: 'bg-yellow-100 text-yellow-700',
          REJECTED: 'bg-red-100 text-red-700',
          CANCELLED: 'bg-gray-100 text-gray-700',
        };
        return (
          <span className={`px-2 py-1 rounded-md text-xs font-medium ${statusColors[row.original.status]}`}>
            {row.original.status}
          </span>
        );
      },
    },
    {
      id: 'retries',
      header: 'Retries',
      accessorFn: (row: LHDNException) => row.retryCount,
      cell: ({ row }: { row: { original: LHDNException } }) => (
        <div className="flex flex-col items-center">
          <span className="text-sm font-medium">
            {row.original.retryCount} / {row.original.maxRetries}
          </span>
          {row.original.canRetry && (
            <Badge variant="info" className="text-xs mt-1">
              Can Retry
            </Badge>
          )}
        </div>
      ),
    },
    {
      id: 'occurredAt',
      header: 'Occurred',
      accessorFn: (row: LHDNException) => new Date(row.occurredAt),
      cell: ({ row }: { row: { original: LHDNException } }) => {
        const date = new Date(row.original.occurredAt);
        const now = new Date();
        const hoursDiff = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

        return (
          <div className="flex flex-col">
            <span className="text-sm">{date.toLocaleDateString()}</span>
            <span className="text-xs text-text-secondary">
              {hoursDiff < 24
                ? `${Math.floor(hoursDiff)}h ago`
                : `${Math.floor(hoursDiff / 24)}d ago`}
            </span>
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }: { row: { original: LHDNException } }) => (
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setSelectedException(row.original);
              setShowDetailsModal(true);
            }}
          >
            Details
          </Button>
          {row.original.canRetry && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setSelectedException(row.original);
                setShowRetryModal(true);
              }}
            >
              Retry
            </Button>
          )}
        </div>
      ),
    },
  ];

  // Stats summary
  const stats = {
    total: exceptions.length,
    critical: exceptions.filter((e) => e.severity === 'CRITICAL').length,
    canRetry: exceptions.filter((e) => e.canRetry).length,
    rejected: exceptions.filter((e) => e.exceptionType === 'REJECTED_BY_LHDN').length,
  };

  return (
    <>
      <PageHead
        title="LHDN Exception Inbox"
        description="Manage and resolve LHDN e-Invoice exceptions, errors, and system failures"
      />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Breadcrumbs
          items={[
            { label: 'LHDN e-Invoice', href: '/lhdn' },
            { label: 'Exception Inbox' },
          ]}
        />

      {/* Header */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-semibold text-text-primary mb-2">
            Exception Inbox
          </h1>
          <p className="text-text-secondary">
            Failed submissions and validation errors requiring attention
          </p>
        </div>
        {selectedExceptions.size > 0 && (
          <Button
            variant="primary"
            onClick={() => setShowBulkRetryModal(true)}
            disabled={!exceptions.some((e) => selectedExceptions.has(e.id) && e.canRetry)}
          >
            Retry Selected ({selectedExceptions.size})
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <Card.Body>
            <div className="flex flex-col">
              <span className="text-sm text-text-secondary mb-1">Total Exceptions</span>
              <span className="text-3xl font-semibold text-text-primary">{stats.total}</span>
            </div>
          </Card.Body>
        </Card>
        <Card>
          <Card.Body>
            <div className="flex flex-col">
              <span className="text-sm text-text-secondary mb-1">Critical</span>
              <span className="text-3xl font-semibold text-status-critical">{stats.critical}</span>
            </div>
          </Card.Body>
        </Card>
        <Card>
          <Card.Body>
            <div className="flex flex-col">
              <span className="text-sm text-text-secondary mb-1">Can Retry</span>
              <span className="text-3xl font-semibold text-brand-primary">{stats.canRetry}</span>
            </div>
          </Card.Body>
        </Card>
        <Card>
          <Card.Body>
            <div className="flex flex-col">
              <span className="text-sm text-text-secondary mb-1">LHDN Rejected</span>
              <span className="text-3xl font-semibold text-status-high">{stats.rejected}</span>
            </div>
          </Card.Body>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <Card.Body>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-1">
              <Input
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Exception Type Filter */}
            <Select
              value={exceptionTypeFilter}
              onChange={(e) => setExceptionTypeFilter(e.target.value)}
              className="w-full"
            >
              <option value="all">All Exception Types</option>
              <option value="VALIDATION_FAILED">Validation Failed</option>
              <option value="SUBMISSION_FAILED">Submission Failed</option>
              <option value="MAPPING_FAILED">Mapping Failed</option>
              <option value="REJECTED_BY_LHDN">Rejected by LHDN</option>
              <option value="TIMEOUT">Timeout</option>
            </Select>

            {/* Severity Filter */}
            <Select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full"
            >
              <option value="all">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </Select>

            {/* Status Filter */}
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full"
            >
              <option value="all">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="VALIDATED">Validated</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="REJECTED">Rejected</option>
            </Select>
          </div>

          {/* Active Filters Summary */}
          {(exceptionTypeFilter !== 'all' || severityFilter !== 'all' || statusFilter !== 'all' || searchTerm) && (
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <span className="text-sm text-text-secondary">Active filters:</span>
              {searchTerm && (
                <Badge variant="info">
                  Search: {searchTerm}
                  <button onClick={() => setSearchTerm('')} className="ml-2 hover:text-text-primary">
                    ×
                  </button>
                </Badge>
              )}
              {exceptionTypeFilter !== 'all' && (
                <Badge variant="info">
                  Type: {exceptionTypeFilter.replace(/_/g, ' ')}
                  <button
                    onClick={() => setExceptionTypeFilter('all')}
                    className="ml-2 hover:text-text-primary"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {severityFilter !== 'all' && (
                <Badge variant="info">
                  Severity: {severityFilter}
                  <button
                    onClick={() => setSeverityFilter('all')}
                    className="ml-2 hover:text-text-primary"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {statusFilter !== 'all' && (
                <Badge variant="info">
                  Status: {statusFilter}
                  <button
                    onClick={() => setStatusFilter('all')}
                    className="ml-2 hover:text-text-primary"
                  >
                    ×
                  </button>
                </Badge>
              )}
              <button
                onClick={() => {
                  setSearchTerm('');
                  setExceptionTypeFilter('all');
                  setSeverityFilter('all');
                  setStatusFilter('all');
                }}
                className="text-sm text-brand-primary hover:underline"
              >
                Clear all
              </button>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Exceptions Table */}
      <Card>
        <Card.Body>
          <Table
            data={exceptions}
            columns={columns}
            isLoading={isLoading}
            emptyMessage="No exceptions found. All invoices are processing successfully!"
          />
        </Card.Body>
      </Card>

      {/* Exception Details Modal */}
      {selectedException && (
        <Modal
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedException(null);
            setResolutionNotes('');
          }}
          title="Exception Details"
          size="lg"
        >
          <div className="space-y-4">
            {/* Invoice Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-text-secondary">Invoice Number</label>
                <p className="text-text-primary font-medium">{selectedException.invoiceNumber}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-text-secondary">SAP Document</label>
                <p className="text-text-primary font-medium">{selectedException.sapBillingDocument}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-text-secondary">Customer</label>
                <p className="text-text-primary">{selectedException.customerName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-text-secondary">Amount</label>
                <p className="text-text-primary font-medium">
                  {selectedException.currency} {selectedException.totalAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* Error Details */}
            <div>
              <label className="text-sm font-medium text-text-secondary">Error Message</label>
              <p className="text-text-primary mt-1 p-3 bg-surface-secondary rounded-md">
                {selectedException.errorMessage}
              </p>
            </div>

            {selectedException.errorDetails && selectedException.errorDetails.length > 0 && (
              <div>
                <label className="text-sm font-medium text-text-secondary">Error Details</label>
                <ul className="mt-1 space-y-1">
                  {selectedException.errorDetails.map((detail, i) => (
                    <li key={i} className="text-sm text-text-primary p-2 bg-surface-secondary rounded-md">
                      • {detail}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Resolution Notes */}
            <div>
              <label className="text-sm font-medium text-text-secondary">Resolution Notes</label>
              <textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                className="w-full mt-1 p-2 border border-border-default rounded-md resize-none"
                rows={3}
                placeholder="Add notes about how this exception was resolved..."
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedException(null);
                  setResolutionNotes('');
                }}
              >
                Close
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  if (resolutionNotes.trim()) {
                    resolveMutation.mutate({
                      id: selectedException.id,
                      notes: resolutionNotes,
                    });
                  } else {
                    addToast({
                      title: 'Resolution Notes Required',
                      message: 'Please provide notes before marking as resolved',
                      type: 'error',
                    });
                  }
                }}
                disabled={resolveMutation.isPending}
              >
                {resolveMutation.isPending ? 'Resolving...' : 'Mark as Resolved'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Retry Modal */}
      {selectedException && (
        <Modal
          isOpen={showRetryModal}
          onClose={() => {
            setShowRetryModal(false);
            setSelectedException(null);
            setResolutionNotes('');
          }}
          title="Retry Invoice Submission"
        >
          <div className="space-y-4">
            <p className="text-text-secondary">
              Are you sure you want to retry submission for invoice{' '}
              <span className="font-medium text-text-primary">{selectedException.invoiceNumber}</span>?
            </p>

            <div>
              <label className="text-sm font-medium text-text-secondary">Notes (Optional)</label>
              <textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                className="w-full mt-1 p-2 border border-border-default rounded-md resize-none"
                rows={2}
                placeholder="Add notes about retry attempt..."
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowRetryModal(false);
                  setSelectedException(null);
                  setResolutionNotes('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  retryMutation.mutate({
                    id: selectedException.id,
                    notes: resolutionNotes || undefined,
                  });
                }}
                disabled={retryMutation.isPending}
              >
                {retryMutation.isPending ? 'Retrying...' : 'Retry Now'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Bulk Retry Modal */}
      <Modal
        isOpen={showBulkRetryModal}
        onClose={() => setShowBulkRetryModal(false)}
        title="Bulk Retry"
      >
        <div className="space-y-4">
          <p className="text-text-secondary">
            Are you sure you want to retry{' '}
            <span className="font-medium text-text-primary">{selectedExceptions.size}</span>{' '}
            selected invoices?
          </p>

          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setShowBulkRetryModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                const retryableIds = exceptions
                  .filter((e) => selectedExceptions.has(e.id) && e.canRetry)
                  .map((e) => e.id);
                bulkRetryMutation.mutate(retryableIds);
              }}
              disabled={bulkRetryMutation.isPending}
            >
              {bulkRetryMutation.isPending ? 'Retrying...' : 'Retry All'}
            </Button>
          </div>
        </div>
      </Modal>
      </div>
    </>
  );
}
