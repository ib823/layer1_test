'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Table } from '@/components/ui/Table';
import { Tabs } from '@/components/ui/Tabs';
import { PageHead } from '@/components/seo/PageHead';
import Link from 'next/link';

interface UserDetail {
  userId: string;
  userName: string;
  email: string;
  department: string;
  manager: string;
  status: 'active' | 'inactive';
  lastLogin: string;
  roles: Array<{
    id: string;
    name: string;
    description: string;
    assignedAt: string;
  }>;
  violations: Array<{
    id: string;
    violationType: string;
    riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    status: string;
    detectedAt: string;
  }>;
  permissions: Array<{
    id: string;
    name: string;
    type: string;
    source: string; // Role name that grants this permission
  }>;
  riskScore: number; // 0-100
}

export default function UserDetailPage() {
  const params = useParams();

  // Fetch user details
  const { data: user, isLoading } = useQuery<UserDetail>({
    queryKey: ['user', params.id],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/${params.id}`);
      if (!res.ok) throw new Error('Failed to fetch user');
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-surface-secondary rounded w-1/3"></div>
          <div className="h-64 bg-surface-secondary rounded"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Card>
          <Card.Body>
            <p className="text-center text-text-secondary">User not found</p>
          </Card.Body>
        </Card>
      </div>
    );
  }

  // Roles table columns
  type RoleRow = { id: string; name: string; description?: string; assignedAt: string };

  const roleColumns = [
    {
      id: 'name',
      header: 'Role Name',
      accessorFn: (row: RoleRow) => row.name,
      cell: ({ row }: { row: { original: RoleRow } }) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.name}</span>
          <span className="text-xs text-text-secondary">{row.original.id}</span>
        </div>
      ),
    },
    {
      id: 'description',
      header: 'Description',
      accessorFn: (row: RoleRow) => row.description,
    },
    {
      id: 'assignedAt',
      header: 'Assigned Date',
      accessorFn: (row: RoleRow) => new Date(row.assignedAt),
      cell: ({ row }: { row: { original: RoleRow } }) => new Date(row.original.assignedAt).toLocaleDateString(),
    },
  ];

  // Violations table columns
  type ViolationRow = { id: string; violationType: string; riskLevel: string; status: string; detectedAt: string };

  const violationColumns = [
    {
      id: 'violationType',
      header: 'Violation Type',
      accessorFn: (row: ViolationRow) => row.violationType,
    },
    {
      id: 'riskLevel',
      header: 'Risk',
      accessorFn: (row: ViolationRow) => row.riskLevel,
      cell: ({ row }: { row: { original: ViolationRow } }) => (
        <Badge variant={row.original.riskLevel.toLowerCase() as 'high' | 'medium' | 'low'}>
          {row.original.riskLevel}
        </Badge>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      accessorFn: (row: ViolationRow) => row.status,
    },
    {
      id: 'detectedAt',
      header: 'Detected',
      accessorFn: (row: ViolationRow) => new Date(row.detectedAt),
      cell: ({ row }: { row: { original: ViolationRow } }) => new Date(row.original.detectedAt).toLocaleDateString(),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }: { row: { original: ViolationRow } }) => (
        <Link href={`/violations/${row.original.id}`} className="text-brand-primary hover:underline text-sm">
          View Details
        </Link>
      ),
    },
  ];

  // Permissions table columns
  type PermissionRow = { name: string; type: string; source: string };

  const permissionColumns = [
    {
      id: 'name',
      header: 'Permission',
      accessorFn: (row: PermissionRow) => row.name,
    },
    {
      id: 'type',
      header: 'Type',
      accessorFn: (row: PermissionRow) => row.type,
      cell: ({ row }: { row: { original: PermissionRow } }) => (
        <Badge variant="info">{row.original.type}</Badge>
      ),
    },
    {
      id: 'source',
      header: 'Granted By',
      accessorFn: (row: PermissionRow) => row.source,
      cell: ({ row }: { row: { original: PermissionRow } }) => (
        <span className="text-sm text-text-secondary">{row.original.source}</span>
      ),
    },
  ];

  // Risk level based on score
  const getRiskLevel = (score: number): { level: string; color: string } => {
    if (score >= 80) return { level: 'CRITICAL', color: 'text-status-critical' };
    if (score >= 60) return { level: 'HIGH', color: 'text-status-high' };
    if (score >= 40) return { level: 'MEDIUM', color: 'text-status-medium' };
    return { level: 'LOW', color: 'text-status-low' };
  };

  const riskLevel = getRiskLevel(user.riskScore);

  return (
    <>
      <PageHead
        title={`User Profile - ${user.userName}`}
        description="Detailed user profile with roles, permissions, violations, and risk assessment"
      />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-sm text-text-secondary">
          <Link href="/users" className="hover:text-brand-primary transition-colors">
            Users
          </Link>
          <span>/</span>
          <span className="text-text-primary">{user.userName}</span>
        </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-text-primary mb-2">
              {user.userName}
            </h1>
            <p className="text-text-secondary">{user.email}</p>
          </div>
          <Badge variant={user.status === 'active' ? 'low' : 'medium'}>
            {user.status.toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <Card.Body>
            <div className="flex flex-col">
              <span className="text-sm text-text-secondary mb-1">Department</span>
              <span className="text-lg font-semibold text-text-primary">{user.department}</span>
            </div>
          </Card.Body>
        </Card>
        <Card>
          <Card.Body>
            <div className="flex flex-col">
              <span className="text-sm text-text-secondary mb-1">Manager</span>
              <span className="text-lg font-semibold text-text-primary">{user.manager}</span>
            </div>
          </Card.Body>
        </Card>
        <Card>
          <Card.Body>
            <div className="flex flex-col">
              <span className="text-sm text-text-secondary mb-1">Risk Score</span>
              <span className={`text-lg font-semibold ${riskLevel.color}`}>
                {user.riskScore}/100 ({riskLevel.level})
              </span>
            </div>
          </Card.Body>
        </Card>
        <Card>
          <Card.Body>
            <div className="flex flex-col">
              <span className="text-sm text-text-secondary mb-1">Active Violations</span>
              <span className="text-lg font-semibold text-status-high">
                {user.violations.filter(v => v.status === 'open').length}
              </span>
            </div>
          </Card.Body>
        </Card>
      </div>

      {/* User Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2">
          <Card.Header>
            <h2 className="text-lg font-semibold">User Information</h2>
          </Card.Header>
          <Card.Body>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-text-secondary">User ID</span>
                <p className="font-medium font-mono text-sm">{user.userId}</p>
              </div>
              <div>
                <span className="text-sm text-text-secondary">Email</span>
                <p className="font-medium">{user.email}</p>
              </div>
              <div>
                <span className="text-sm text-text-secondary">Department</span>
                <p className="font-medium">{user.department}</p>
              </div>
              <div>
                <span className="text-sm text-text-secondary">Manager</span>
                <p className="font-medium">{user.manager}</p>
              </div>
              <div>
                <span className="text-sm text-text-secondary">Status</span>
                <p className="font-medium">{user.status}</p>
              </div>
              <div>
                <span className="text-sm text-text-secondary">Last Login</span>
                <p className="font-medium">{new Date(user.lastLogin).toLocaleString()}</p>
              </div>
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Header>
            <h2 className="text-lg font-semibold">Access Summary</h2>
          </Card.Header>
          <Card.Body className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-border">
              <span className="text-text-secondary">Total Roles</span>
              <span className="text-2xl font-semibold text-text-primary">{user.roles.length}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-border">
              <span className="text-text-secondary">Total Permissions</span>
              <span className="text-2xl font-semibold text-text-primary">{user.permissions.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-text-secondary">Total Violations</span>
              <span className="text-2xl font-semibold text-status-high">{user.violations.length}</span>
            </div>
          </Card.Body>
        </Card>
      </div>

      {/* Tabs for Roles, Violations, Permissions */}
      <Tabs
        tabs={[
          {
            id: 'roles',
            label: 'Assigned Roles',
            content: (
              <Card>
                <Card.Body>
                  <Table
                    data={user.roles}
                    columns={roleColumns}
                    emptyMessage="No roles assigned"
                  />
                </Card.Body>
              </Card>
            ),
          },
          {
            id: 'violations',
            label: 'SoD Violations',
            content: (
              <Card>
                <Card.Body>
                  <Table
                    data={user.violations}
                    columns={violationColumns}
                    emptyMessage="No violations detected"
                  />
                </Card.Body>
              </Card>
            ),
          },
          {
            id: 'permissions',
            label: 'Effective Permissions',
            content: (
              <Card>
                <Card.Body>
                  <Table
                    data={user.permissions}
                    columns={permissionColumns}
                    emptyMessage="No permissions granted"
                  />
                </Card.Body>
              </Card>
            ),
          },
        ]}
      />
      </div>
    </>
  );
}
