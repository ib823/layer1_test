'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Table } from '@/components/ui/Table';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { PageHead } from '@/components/seo/PageHead';
import Link from 'next/link';

interface AuditEvent {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  eventType: string;
  previousState?: string;
  newState: string;
  actor: string;
  actorType: 'USER' | 'SYSTEM' | 'API';
  eventData: any;
  ipAddress?: string;
  requestId?: string;
  occurredAt: string;
}

export default function AuditExplorerPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [actorTypeFilter, setActorTypeFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('7days');

  // Fetch audit events
  const { data: events = [], isLoading } = useQuery<AuditEvent[]>({
    queryKey: ['audit-events', searchTerm, eventTypeFilter, actorTypeFilter, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (eventTypeFilter !== 'all') params.append('eventType', eventTypeFilter);
      if (actorTypeFilter !== 'all') params.append('actorType', actorTypeFilter);
      if (dateRange !== 'all') params.append('dateRange', dateRange);
      if (searchTerm) params.append('search', searchTerm);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/modules/lhdn/audit?${params}`);
      if (!res.ok) throw new Error('Failed to fetch audit events');
      const data = await res.json();
      return data.events || [];
    },
  });

  // Export audit log
  const handleExport = async (format: 'JSON' | 'CSV') => {
    const params = new URLSearchParams();
    if (eventTypeFilter !== 'all') params.append('eventType', eventTypeFilter);
    if (actorTypeFilter !== 'all') params.append('actorType', actorTypeFilter);
    if (dateRange !== 'all') params.append('dateRange', dateRange);
    params.append('format', format);

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/modules/lhdn/audit/export?${params}`);
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString()}.${format.toLowerCase()}`;
    a.click();
  };

  // Configure table columns
  const columns = [
    {
      id: 'occurredAt',
      header: 'Timestamp',
      cell: ({ row }: { row: { original: AuditEvent } }) => {
        const date = new Date(row.original.occurredAt);
        return (
          <div className="flex flex-col">
            <span className="text-sm">{date.toLocaleDateString()}</span>
            <span className="text-xs text-text-secondary">{date.toLocaleTimeString()}</span>
          </div>
        );
      },
    },
    {
      id: 'eventType',
      header: 'Event',
      cell: ({ row }: { row: { original: AuditEvent } }) => (
        <Badge variant="info">{row.original.eventType.replace(/_/g, ' ')}</Badge>
      ),
    },
    {
      id: 'invoice',
      header: 'Invoice',
      cell: ({ row }: { row: { original: AuditEvent } }) => (
        <Link
          href={`/lhdn/invoices/${row.original.invoiceId}`}
          className="text-brand-primary hover:underline"
        >
          {row.original.invoiceNumber}
        </Link>
      ),
    },
    {
      id: 'stateTransition',
      header: 'State Transition',
      cell: ({ row }: { row: { original: AuditEvent } }) =>
        row.original.previousState ? (
          <span className="text-sm">
            {row.original.previousState} → {row.original.newState}
          </span>
        ) : (
          <span className="text-sm">{row.original.newState}</span>
        ),
    },
    {
      id: 'actor',
      header: 'Actor',
      cell: ({ row }: { row: { original: AuditEvent } }) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium">{row.original.actor}</span>
          <Badge variant="low" className="text-xs mt-1 w-fit">
            {row.original.actorType}
          </Badge>
        </div>
      ),
    },
    {
      id: 'ipAddress',
      header: 'IP Address',
      cell: ({ row }: { row: { original: AuditEvent } }) => (
        <span className="text-sm text-text-secondary font-mono">
          {row.original.ipAddress || '-'}
        </span>
      ),
    },
    {
      id: 'requestId',
      header: 'Request ID',
      cell: ({ row }: { row: { original: AuditEvent } }) =>
        row.original.requestId ? (
          <span className="text-xs text-text-secondary font-mono">
            {row.original.requestId.slice(0, 8)}...
          </span>
        ) : (
          <span className="text-text-secondary">-</span>
        ),
    },
  ];

  const stats = {
    total: events.length,
    user: events.filter((e) => e.actorType === 'USER').length,
    system: events.filter((e) => e.actorType === 'SYSTEM').length,
    api: events.filter((e) => e.actorType === 'API').length,
  };

  return (
    <>
      <PageHead
        title="LHDN Audit Explorer"
        description="Immutable audit trail of all LHDN e-Invoice operations and system events"
      />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Breadcrumbs
          items={[
            { label: 'LHDN e-Invoice', href: '/lhdn' },
            { label: 'Audit Explorer' },
          ]}
        />

      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-semibold text-text-primary mb-2">
            Audit Explorer
          </h1>
          <p className="text-text-secondary">
            Immutable audit trail of all LHDN e-Invoice operations
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => handleExport('CSV')}>
            Export CSV
          </Button>
          <Button variant="secondary" onClick={() => handleExport('JSON')}>
            Export JSON
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <Card.Body>
            <span className="text-sm text-text-secondary">Total Events</span>
            <p className="text-3xl font-semibold text-text-primary">{stats.total}</p>
          </Card.Body>
        </Card>
        <Card>
          <Card.Body>
            <span className="text-sm text-text-secondary">User Actions</span>
            <p className="text-3xl font-semibold text-brand-primary">{stats.user}</p>
          </Card.Body>
        </Card>
        <Card>
          <Card.Body>
            <span className="text-sm text-text-secondary">System Events</span>
            <p className="text-3xl font-semibold text-text-primary">{stats.system}</p>
          </Card.Body>
        </Card>
        <Card>
          <Card.Body>
            <span className="text-sm text-text-secondary">API Calls</span>
            <p className="text-3xl font-semibold text-text-primary">{stats.api}</p>
          </Card.Body>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <Card.Body>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <Select value={eventTypeFilter} onChange={(e) => setEventTypeFilter(e.target.value)}>
              <option value="all">All Events</option>
              <option value="CREATED">Created</option>
              <option value="VALIDATED">Validated</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="CN_ISSUED">Credit Note Issued</option>
              <option value="DN_ISSUED">Debit Note Issued</option>
            </Select>

            <Select value={actorTypeFilter} onChange={(e) => setActorTypeFilter(e.target.value)}>
              <option value="all">All Actors</option>
              <option value="USER">User</option>
              <option value="SYSTEM">System</option>
              <option value="API">API</option>
            </Select>

            <Select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
              <option value="today">Today</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="90days">Last 90 Days</option>
              <option value="all">All Time</option>
            </Select>
          </div>
        </Card.Body>
      </Card>

      {/* Events Table */}
      <Card>
        <Card.Body>
          <Table
            data={events}
            columns={columns}
            isLoading={isLoading}
            emptyMessage="No audit events found"
          />
        </Card.Body>
      </Card>
      </div>
    </>
  );
}
