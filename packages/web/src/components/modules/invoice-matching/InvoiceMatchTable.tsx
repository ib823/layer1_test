'use client';

import { useState } from 'react';
import { TableWithColumnToggle, ColumnConfig } from '@/components/ui/TableWithColumnToggle';
import { ColumnDef } from '@tanstack/react-table';

interface InvoiceMatchResult {
  id: string;
  invoiceNumber: string;
  poNumber?: string;
  grNumber?: string;
  matchStatus: 'matched' | 'partial' | 'unmatched';
  matchScore: number;
  discrepancies: any;
  amounts: any;
  vendorId?: string;
  vendorName?: string;
}

interface InvoiceMatchTableProps {
  results: InvoiceMatchResult[];
}

/**
 * Invoice Match Results Table
 *
 * Displays detailed matching results with filtering and sorting capabilities.
 * Now enhanced with column toggle functionality.
 */
export function InvoiceMatchTable({ results }: InvoiceMatchTableProps) {
  const [filter, setFilter] = useState<'all' | 'matched' | 'partial' | 'unmatched'>('all');
  const [sortBy, setSortBy] = useState<'matchScore' | 'invoiceNumber'>('matchScore');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Filter results
  const filteredResults = results.filter((result) => {
    if (filter === 'all') return true;
    return result.matchStatus === filter;
  });

  // Sort results
  const sortedResults = [...filteredResults].sort((a, b) => {
    const multiplier = sortOrder === 'asc' ? 1 : -1;
    if (sortBy === 'matchScore') {
      return (a.matchScore - b.matchScore) * multiplier;
    } else {
      return a.invoiceNumber.localeCompare(b.invoiceNumber) * multiplier;
    }
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      matched: 'bg-green-100 text-green-800',
      partial: 'bg-yellow-100 text-yellow-800',
      unmatched: 'bg-red-100 text-red-800',
    };
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  };

  const getScoreColor = (score: number) => {
    if (score >= 95) return 'text-green-600';
    if (score >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Define column configurations for TableWithColumnToggle
  const columnConfigs: ColumnConfig<InvoiceMatchResult>[] = [
    {
      column: {
        id: 'invoiceNumber',
        accessorKey: 'invoiceNumber',
        header: 'Invoice Number',
        cell: (info) => (
          <span className="text-sm font-medium text-gray-900">{info.getValue()}</span>
        ),
      } as ColumnDef<InvoiceMatchResult, any>,
      defaultVisible: true,
      priority: 1, // Critical
      category: 'Data',
    },
    {
      column: {
        id: 'poNumber',
        accessorKey: 'poNumber',
        header: 'PO Number',
        cell: (info) => (
          <span className="text-sm text-gray-500">{info.getValue() || '-'}</span>
        ),
      } as ColumnDef<InvoiceMatchResult, any>,
      defaultVisible: true,
      priority: 2, // Important
      category: 'Data',
    },
    {
      column: {
        id: 'grNumber',
        accessorKey: 'grNumber',
        header: 'GR Number',
        cell: (info) => (
          <span className="text-sm text-gray-500">{info.getValue() || '-'}</span>
        ),
      } as ColumnDef<InvoiceMatchResult, any>,
      defaultVisible: true,
      priority: 2, // Important
      category: 'Data',
    },
    {
      column: {
        id: 'vendor',
        accessorKey: 'vendorName',
        header: 'Vendor',
        cell: (info) => {
          const result = info.row.original;
          return (
            <div className="text-sm">
              <div className="text-gray-900">{result.vendorName || '-'}</div>
              {result.vendorId && (
                <div className="text-xs text-gray-500">{result.vendorId}</div>
              )}
            </div>
          );
        },
      } as ColumnDef<InvoiceMatchResult, any>,
      defaultVisible: true,
      priority: 2, // Important
      category: 'Data',
    },
    {
      column: {
        id: 'matchStatus',
        accessorKey: 'matchStatus',
        header: 'Match Status',
        cell: (info) => {
          const status = info.getValue();
          return (
            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(status)}`}>
              {status}
            </span>
          );
        },
      } as ColumnDef<InvoiceMatchResult, any>,
      defaultVisible: true,
      priority: 1, // Critical
      category: 'Data',
    },
    {
      column: {
        id: 'matchScore',
        accessorKey: 'matchScore',
        header: 'Match Score',
        cell: (info) => {
          const score = info.getValue();
          return (
            <span className={`text-sm font-semibold ${getScoreColor(score)}`}>
              {score.toFixed(1)}%
            </span>
          );
        },
      } as ColumnDef<InvoiceMatchResult, any>,
      defaultVisible: true,
      priority: 1, // Critical
      category: 'Data',
    },
    {
      column: {
        id: 'discrepancies',
        accessorKey: 'discrepancies',
        header: 'Discrepancies',
        cell: (info) => {
          const discrepancies = info.getValue();
          if (discrepancies && Object.keys(discrepancies).length > 0) {
            return (
              <div className="space-y-1 text-sm text-gray-500">
                {Object.entries(discrepancies).map(([key, value]) => (
                  <div key={key} className="text-xs">
                    <span className="font-medium">{key}:</span> {JSON.stringify(value)}
                  </div>
                ))}
              </div>
            );
          }
          return <span className="text-sm text-gray-400">None</span>;
        },
      } as ColumnDef<InvoiceMatchResult, any>,
      defaultVisible: true,
      priority: 3, // Nice to have
      category: 'Data',
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Filters */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Filter by Status:</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All ({results.length})</option>
              <option value="matched">
                Matched ({results.filter((r) => r.matchStatus === 'matched').length})
              </option>
              <option value="partial">
                Partial ({results.filter((r) => r.matchStatus === 'partial').length})
              </option>
              <option value="unmatched">
                Unmatched ({results.filter((r) => r.matchStatus === 'unmatched').length})
              </option>
            </select>
          </div>

          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="matchScore">Match Score</option>
              <option value="invoiceNumber">Invoice Number</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-2 border border-gray-300 rounded-md hover:bg-gray-50"
              title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Table with Column Toggle */}
      {sortedResults.length === 0 ? (
        <div className="p-12 text-center">
          <p className="text-gray-500">No results found for the selected filter.</p>
        </div>
      ) : (
        <>
          <TableWithColumnToggle
            data={sortedResults}
            columns={columnConfigs}
            pageSize={50}
            isLoading={false}
            emptyMessage="No results found for the selected filter."
            tableId="invoice-matching"
            showColumnPicker={true}
            className="invoice-match-table"
          />

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{sortedResults.length}</span> of{' '}
              <span className="font-medium">{results.length}</span> results
            </p>
          </div>
        </>
      )}
    </div>
  );
}
