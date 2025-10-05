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
import Link from 'next/link';

interface Violation {
  id: string;
  userId: string;
  userName: string;
  department: string;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  violationType: string;
  description: string;
  conflictingRoles: string[];
  detectedAt: string;
  status: 'open' | 'in_review' | 'resolved' | 'acknowledged';
}

export default function ViolationsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');

  // Fetch violations
  const { data: violations = [], isLoading } = useQuery<Violation[]>({
    queryKey: ['violations', searchTerm, riskFilter, statusFilter, departmentFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (riskFilter !== 'all') params.append('riskLevel', riskFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (departmentFilter !== 'all') params.append('department', departmentFilter);
      if (searchTerm) params.append('search', searchTerm);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/modules/sod/violations?${params}`);
      if (!res.ok) throw new Error('Failed to fetch violations');
      const data = await res.json();
      return data.violations || [];
    },
  });

  // Extract unique departments for filter
  const departments = Array.from(new Set(violations.map((v) => v.department)));

  // Configure table columns
  const columns = [
    {
      id: 'userName',
      header: 'User',
      accessorFn: (row: Violation) => row.userName,
      cell: ({ row }: any) => (
        <div className="flex flex-col">
          <Link
            href={`/users/${row.original.userId}`}
            className="font-medium text-text-primary hover:text-brand-primary transition-colors"
          >
            {row.original.userName}
          </Link>
          <span className="text-xs text-text-secondary">{row.original.userId}</span>
        </div>
      ),
    },
    {
      id: 'department',
      header: 'Department',
      accessorFn: (row: Violation) => row.department,
    },
    {
      id: 'violationType',
      header: 'Violation Type',
      accessorFn: (row: Violation) => row.violationType,
      cell: ({ row }: any) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.violationType}</span>
          <span className="text-xs text-text-secondary">
            {row.original.conflictingRoles.join(' + ')}
          </span>
        </div>
      ),
    },
    {
      id: 'riskLevel',
      header: 'Risk',
      accessorFn: (row: Violation) => row.riskLevel,
      cell: ({ row }: any) => (
        <Badge variant={row.original.riskLevel.toLowerCase()}>
          {row.original.riskLevel}
        </Badge>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      accessorFn: (row: Violation) => row.status,
      cell: ({ row }: any) => {
        const statusColors: Record<string, string> = {
          open: 'bg-status-high/10 text-status-high',
          in_review: 'bg-status-medium/10 text-status-medium',
          resolved: 'bg-status-low/10 text-status-low',
          acknowledged: 'bg-text-secondary/10 text-text-secondary',
        };
        return (
          <span className={`px-2 py-1 rounded-md text-xs font-medium ${statusColors[row.original.status]}`}>
            {row.original.status.replace('_', ' ')}
          </span>
        );
      },
    },
    {
      id: 'detectedAt',
      header: 'Detected',
      accessorFn: (row: Violation) => new Date(row.detectedAt),
      cell: ({ row }: any) => {
        const date = new Date(row.original.detectedAt);
        return (
          <div className="flex flex-col">
            <span className="text-sm">{date.toLocaleDateString()}</span>
            <span className="text-xs text-text-secondary">
              {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }: any) => (
        <Link href={`/violations/${row.original.id}`}>
          <Button variant="secondary" size="sm">
            View Details
          </Button>
        </Link>
      ),
    },
  ];

  // Stats summary
  const stats = {
    total: violations.length,
    critical: violations.filter((v) => v.riskLevel === 'CRITICAL').length,
    high: violations.filter((v) => v.riskLevel === 'HIGH').length,
    open: violations.filter((v) => v.status === 'open').length,
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <Breadcrumbs items={[{ label: 'Violations' }]} />

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-text-primary mb-2">
          SoD Violations
        </h1>
        <p className="text-text-secondary">
          Segregation of Duties conflicts detected across your organization
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <Card.Body>
            <div className="flex flex-col">
              <span className="text-sm text-text-secondary mb-1">Total Violations</span>
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
              <span className="text-sm text-text-secondary mb-1">High Risk</span>
              <span className="text-3xl font-semibold text-status-high">{stats.high}</span>
            </div>
          </Card.Body>
        </Card>
        <Card>
          <Card.Body>
            <div className="flex flex-col">
              <span className="text-sm text-text-secondary mb-1">Open</span>
              <span className="text-3xl font-semibold text-status-medium">{stats.open}</span>
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
                placeholder="Search violations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Risk Level Filter */}
            <Select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="w-full"
            >
              <option value="all">All Risk Levels</option>
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
              <option value="open">Open</option>
              <option value="in_review">In Review</option>
              <option value="resolved">Resolved</option>
              <option value="acknowledged">Acknowledged</option>
            </Select>

            {/* Department Filter */}
            <Select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full"
            >
              <option value="all">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </Select>
          </div>

          {/* Active Filters Summary */}
          {(riskFilter !== 'all' || statusFilter !== 'all' || departmentFilter !== 'all' || searchTerm) && (
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <span className="text-sm text-text-secondary">Active filters:</span>
              {searchTerm && (
                <Badge variant="info">
                  Search: {searchTerm}
                  <button
                    onClick={() => setSearchTerm('')}
                    className="ml-2 hover:text-text-primary"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {riskFilter !== 'all' && (
                <Badge variant="info">
                  Risk: {riskFilter}
                  <button
                    onClick={() => setRiskFilter('all')}
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
              {departmentFilter !== 'all' && (
                <Badge variant="info">
                  Department: {departmentFilter}
                  <button
                    onClick={() => setDepartmentFilter('all')}
                    className="ml-2 hover:text-text-primary"
                  >
                    ×
                  </button>
                </Badge>
              )}
              <button
                onClick={() => {
                  setSearchTerm('');
                  setRiskFilter('all');
                  setStatusFilter('all');
                  setDepartmentFilter('all');
                }}
                className="text-sm text-brand-primary hover:underline"
              >
                Clear all
              </button>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Violations Table */}
      <Card>
        <Card.Body>
          <Table
            data={violations}
            columns={columns}
            isLoading={isLoading}
            emptyMessage="No violations found matching your filters"
          />
        </Card.Body>
      </Card>
    </div>
  );
}
