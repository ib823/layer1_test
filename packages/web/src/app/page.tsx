'use client';

import { Table } from '@/components/ui';
import { Badge } from '@/components/ui';
import { ColumnDef } from '@tanstack/react-table';
import { useState } from 'react';

interface SampleViolation {
  id: string;
  userId: string;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  businessProcess: string;
  detectedAt: string;
  status: string;
}

// Sample data
const sampleData: SampleViolation[] = [
  {
    id: '1',
    userId: 'USER001',
    riskLevel: 'CRITICAL',
    businessProcess: 'Purchase Order & Invoice Approval',
    detectedAt: '2025-01-15 10:30',
    status: 'OPEN',
  },
  {
    id: '2',
    userId: 'USER002',
    riskLevel: 'HIGH',
    businessProcess: 'Create Vendor & Process Payment',
    detectedAt: '2025-01-14 15:20',
    status: 'IN_REVIEW',
  },
  {
    id: '3',
    userId: 'USER003',
    riskLevel: 'MEDIUM',
    businessProcess: 'Goods Receipt & Invoice Verification',
    detectedAt: '2025-01-13 09:10',
    status: 'OPEN',
  },
  {
    id: '4',
    userId: 'USER004',
    riskLevel: 'LOW',
    businessProcess: 'Journal Entry & Posting',
    detectedAt: '2025-01-12 14:45',
    status: 'RESOLVED',
  },
  {
    id: '5',
    userId: 'USER005',
    riskLevel: 'CRITICAL',
    businessProcess: 'Bank Account Creation & Payment Run',
    detectedAt: '2025-01-11 11:20',
    status: 'OPEN',
  },
  {
    id: '6',
    userId: 'USER006',
    riskLevel: 'HIGH',
    businessProcess: 'User Master Maintenance & Authorization',
    detectedAt: '2025-01-10 16:30',
    status: 'MITIGATED',
  },
  {
    id: '7',
    userId: 'USER007',
    riskLevel: 'MEDIUM',
    businessProcess: 'Pricing Change & Sales Order',
    detectedAt: '2025-01-09 10:15',
    status: 'OPEN',
  },
  {
    id: '8',
    userId: 'USER008',
    riskLevel: 'LOW',
    businessProcess: 'Material Master & BOM Change',
    detectedAt: '2025-01-08 13:50',
    status: 'IN_REVIEW',
  },
  {
    id: '9',
    userId: 'USER009',
    riskLevel: 'HIGH',
    businessProcess: 'Credit Memo & Customer Master',
    detectedAt: '2025-01-07 09:30',
    status: 'OPEN',
  },
  {
    id: '10',
    userId: 'USER010',
    riskLevel: 'CRITICAL',
    businessProcess: 'Asset Creation & Depreciation Run',
    detectedAt: '2025-01-06 15:40',
    status: 'OPEN',
  },
  {
    id: '11',
    userId: 'USER011',
    riskLevel: 'MEDIUM',
    businessProcess: 'Tax Configuration & Invoice',
    detectedAt: '2025-01-05 11:25',
    status: 'RESOLVED',
  },
  {
    id: '12',
    userId: 'USER012',
    riskLevel: 'LOW',
    businessProcess: 'Delivery & Billing',
    detectedAt: '2025-01-04 14:10',
    status: 'OPEN',
  },
];

// Column definitions
const columns: ColumnDef<SampleViolation>[] = [
  {
    accessorKey: 'userId',
    header: 'User ID',
    enableSorting: true,
  },
  {
    accessorKey: 'businessProcess',
    header: 'Business Process',
    enableSorting: true,
  },
  {
    accessorKey: 'riskLevel',
    header: 'Risk Level',
    enableSorting: true,
    cell: ({ row }) => {
      const level = row.original.riskLevel;
      const variant =
        level === 'CRITICAL'
          ? 'critical'
          : level === 'HIGH'
          ? 'high'
          : level === 'MEDIUM'
          ? 'medium'
          : 'low';
      return <Badge variant={variant}>{level}</Badge>;
    },
  },
  {
    accessorKey: 'detectedAt',
    header: 'Detected At',
    enableSorting: true,
    cell: ({ row }) => row.original.detectedAt,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    enableSorting: true,
  },
];

export default function TableTestPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showEmpty, setShowEmpty] = useState(false);

  return (
    <main style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="text-3xl font-bold" style={{ marginBottom: '0.5rem' }}>
          Table Component Test
        </h1>
        <p className="text-secondary">
          Testing all features: sorting, pagination, loading states, empty states, row clicking, keyboard navigation
        </p>
      </div>

      {/* Controls */}
      <div className="flex gap-md" style={{ marginBottom: '2rem' }}>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => {
            setIsLoading(true);
            setTimeout(() => setIsLoading(false), 2000);
          }}
        >
          Test Loading State (2s)
        </button>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setShowEmpty(!showEmpty)}
        >
          Toggle Empty State
        </button>
      </div>

      {/* Table */}
      <Table
        data={showEmpty ? [] : sampleData}
        columns={columns}
        pageSize={5}
        isLoading={isLoading}
        emptyMessage="No violations found. Try toggling the empty state button above."
        onRowClick={(row) => {
          alert(`Clicked row: ${row.userId} - ${row.businessProcess}`);
        }}
      />

      {/* Test Checklist */}
      <div style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: 'var(--neutral-100)', borderRadius: 'var(--radius-lg)' }}>
        <h2 className="text-xl font-semibold" style={{ marginBottom: '1rem' }}>Test Checklist</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li style={{ marginBottom: '0.5rem' }}>✅ <strong>Sorting:</strong> Click column headers (User ID, Business Process, Risk Level, Detected At, Status)</li>
          <li style={{ marginBottom: '0.5rem' }}>✅ <strong>Pagination:</strong> Navigate using Previous/Next buttons (5 items per page)</li>
          <li style={{ marginBottom: '0.5rem' }}>✅ <strong>Row Clicking:</strong> Click any row to see alert, or press Enter when focused</li>
          <li style={{ marginBottom: '0.5rem' }}>✅ <strong>Keyboard Navigation:</strong> Tab through sortable headers and clickable rows</li>
          <li style={{ marginBottom: '0.5rem' }}>✅ <strong>Loading State:</strong> Click &quot;Test Loading State&quot; button to see skeleton rows</li>
          <li style={{ marginBottom: '0.5rem' }}>✅ <strong>Empty State:</strong> Click &quot;Toggle Empty State&quot; to see empty state with icon</li>
          <li style={{ marginBottom: '0.5rem' }}>✅ <strong>Accessibility:</strong> Check ARIA labels and screen reader support</li>
        </ul>
      </div>
    </main>
  );
}
