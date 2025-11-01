'use client';

import { useState } from 'react';
import { TableWithColumnToggle, ColumnConfig } from '@/components/ui/TableWithColumnToggle';
import { ColumnDef } from '@tanstack/react-table';

interface VendorQualityIssue {
  id: string;
  vendorId: string;
  vendorName: string;
  issueType: string;
  severity: 'high' | 'medium' | 'low';
  fieldName?: string;
  currentValue?: string;
  suggestedValue?: string;
  description: string;
  qualityScore: number;
  status: string;
}

interface VendorQualityTableProps {
  issues: VendorQualityIssue[];
}

/**
 * Vendor Quality Issues Table
 *
 * Displays vendor data quality issues with filtering and sorting capabilities.
 * Now enhanced with column toggle functionality.
 */
export function VendorQualityTable({ issues }: VendorQualityTableProps) {
  const [severityFilter, setSeverityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'qualityScore' | 'severity'>('qualityScore');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const issueTypes = Array.from(new Set(issues.map((i) => i.issueType)));

  const filteredIssues = issues.filter((issue) => {
    if (severityFilter !== 'all' && issue.severity !== severityFilter) return false;
    if (typeFilter !== 'all' && issue.issueType !== typeFilter) return false;
    return true;
  });

  const sortedIssues = [...filteredIssues].sort((a, b) => {
    const multiplier = sortOrder === 'asc' ? 1 : -1;
    if (sortBy === 'qualityScore') {
      return (a.qualityScore - b.qualityScore) * multiplier;
    } else {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      return (severityOrder[a.severity] - severityOrder[b.severity]) * multiplier;
    }
  });

  const getSeverityBadge = (severity: string) => {
    const styles = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-orange-100 text-orange-800',
      low: 'bg-yellow-100 text-yellow-800',
    };
    return styles[severity as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Define column configurations for TableWithColumnToggle
  const columnConfigs: ColumnConfig<VendorQualityIssue>[] = [
    {
      column: {
        id: 'vendor',
        accessorKey: 'vendorName',
        header: 'Vendor',
        cell: (info) => {
          const issue = info.row.original;
          return (
            <div>
              <div className="text-sm font-medium text-gray-900">{issue.vendorName}</div>
              <div className="text-xs text-gray-500">{issue.vendorId}</div>
            </div>
          );
        },
      } as ColumnDef<VendorQualityIssue, any>,
      defaultVisible: true,
      priority: 1, // Critical
      category: 'Data',
    },
    {
      column: {
        id: 'issueType',
        accessorKey: 'issueType',
        header: 'Issue Type',
        cell: (info) => (
          <span className="text-sm text-gray-700 capitalize">
            {info.getValue().replace('_', ' ')}
          </span>
        ),
      } as ColumnDef<VendorQualityIssue, any>,
      defaultVisible: true,
      priority: 1, // Critical
      category: 'Data',
    },
    {
      column: {
        id: 'severity',
        accessorKey: 'severity',
        header: 'Severity',
        cell: (info) => {
          const severity = info.getValue();
          return (
            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getSeverityBadge(severity)}`}>
              {severity.toUpperCase()}
            </span>
          );
        },
      } as ColumnDef<VendorQualityIssue, any>,
      defaultVisible: true,
      priority: 1, // Critical
      category: 'Data',
    },
    {
      column: {
        id: 'fieldName',
        accessorKey: 'fieldName',
        header: 'Field',
        cell: (info) => (
          <span className="text-sm text-gray-500">{info.getValue() || '-'}</span>
        ),
      } as ColumnDef<VendorQualityIssue, any>,
      defaultVisible: true,
      priority: 2, // Important
      category: 'Data',
    },
    {
      column: {
        id: 'currentValue',
        accessorKey: 'currentValue',
        header: 'Current Value',
        cell: (info) => (
          <span className="text-sm text-gray-500">{info.getValue() || '-'}</span>
        ),
      } as ColumnDef<VendorQualityIssue, any>,
      defaultVisible: true,
      priority: 3, // Nice to have
      category: 'Data',
    },
    {
      column: {
        id: 'suggestedValue',
        accessorKey: 'suggestedValue',
        header: 'Suggested',
        cell: (info) => (
          <span className="text-sm text-green-600">{info.getValue() || '-'}</span>
        ),
      } as ColumnDef<VendorQualityIssue, any>,
      defaultVisible: true,
      priority: 3, // Nice to have
      category: 'Data',
    },
    {
      column: {
        id: 'qualityScore',
        accessorKey: 'qualityScore',
        header: 'Quality Score',
        cell: (info) => {
          const score = info.getValue();
          return (
            <span className={`text-sm font-semibold ${getScoreColor(score)}`}>
              {score.toFixed(0)}%
            </span>
          );
        },
      } as ColumnDef<VendorQualityIssue, any>,
      defaultVisible: true,
      priority: 1, // Critical
      category: 'Data',
    },
    {
      column: {
        id: 'status',
        accessorKey: 'status',
        header: 'Status',
        cell: (info) => {
          const status = info.getValue();
          return (
            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
              status === 'open' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
            }`}>
              {status}
            </span>
          );
        },
      } as ColumnDef<VendorQualityIssue, any>,
      defaultVisible: true,
      priority: 2, // Important
      category: 'Data',
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Filters */}
      <div className="p-6 border-b border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All ({issues.length})</option>
              <option value="high">High ({issues.filter((i) => i.severity === 'high').length})</option>
              <option value="medium">Medium ({issues.filter((i) => i.severity === 'medium').length})</option>
              <option value="low">Low ({issues.filter((i) => i.severity === 'low').length})</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Issue Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              {issueTypes.map((type) => (
                <option key={type} value={type}>
                  {type.replace('_', ' ').charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="qualityScore">Quality Score</option>
                <option value="severity">Severity</option>
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
      </div>

      {/* Enhanced Table with Column Toggle */}
      {sortedIssues.length === 0 ? (
        <div className="p-12 text-center">
          <p className="text-gray-500">No issues found for the selected filters.</p>
        </div>
      ) : (
        <>
          <TableWithColumnToggle
            data={sortedIssues}
            columns={columnConfigs}
            pageSize={50}
            isLoading={false}
            emptyMessage="No issues found for the selected filters."
            tableId="vendor-quality"
            showColumnPicker={true}
            className="vendor-quality-table"
          />

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{sortedIssues.length}</span> of{' '}
              <span className="font-medium">{issues.length}</span> issues
            </p>
          </div>
        </>
      )}
    </div>
  );
}
