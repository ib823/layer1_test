'use client';

import { useState } from 'react';
import { TableWithColumnToggle, ColumnConfig } from '@/components/ui/TableWithColumnToggle';
import { ColumnDef } from '@tanstack/react-table';

interface GLAnomaly {
  id: string;
  documentNumber: string;
  lineItem?: string;
  glAccount: string;
  amount: number;
  postingDate: string;
  detectionMethod: string;
  riskScore: number;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  evidence: any;
  status: string;
}

interface AnomalyTableProps {
  anomalies: GLAnomaly[];
}

/**
 * GL Anomaly Table Component
 *
 * Displays detected anomalies with filtering, sorting, and detail viewing capabilities.
 */
export function AnomalyTable({ anomalies }: AnomalyTableProps) {
  const [riskFilter, setRiskFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'riskScore' | 'amount' | 'postingDate'>('riskScore');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [expandedAnomaly, setExpandedAnomaly] = useState<string | null>(null);

  // Get unique detection methods
  const detectionMethods = Array.from(new Set(anomalies.map((a) => a.detectionMethod)));

  // Filter anomalies
  const filteredAnomalies = anomalies.filter((anomaly) => {
    if (riskFilter !== 'all' && anomaly.riskLevel !== riskFilter) return false;
    if (methodFilter !== 'all' && anomaly.detectionMethod !== methodFilter) return false;
    return true;
  });

  // Sort anomalies
  const sortedAnomalies = [...filteredAnomalies].sort((a, b) => {
    const multiplier = sortOrder === 'asc' ? 1 : -1;
    if (sortBy === 'riskScore') {
      return (a.riskScore - b.riskScore) * multiplier;
    } else if (sortBy === 'amount') {
      return (a.amount - b.amount) * multiplier;
    } else {
      return (new Date(a.postingDate).getTime() - new Date(b.postingDate).getTime()) * multiplier;
    }
  });

  const getRiskBadge = (level: string) => {
    const styles = {
      critical: 'bg-purple-100 text-purple-800 border-purple-200',
      high: 'bg-red-100 text-red-800 border-red-200',
      medium: 'bg-orange-100 text-orange-800 border-orange-200',
      low: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    };
    return styles[level as keyof typeof styles] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 80) return 'text-red-600';
    if (score >= 60) return 'text-orange-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-green-600';
  };

  // Define column configurations for TableWithColumnToggle
  const columnConfigs: ColumnConfig<GLAnomaly>[] = [
    {
      column: {
        id: 'documentNumber',
        accessorKey: 'documentNumber',
        header: 'Document',
        cell: (info) => {
          const anomaly = info.row.original;
          return (
            <div>
              <div className="text-sm font-medium text-gray-900">{anomaly.documentNumber}</div>
              {anomaly.lineItem && (
                <div className="text-xs text-gray-500">Line: {anomaly.lineItem}</div>
              )}
            </div>
          );
        },
      } as ColumnDef<GLAnomaly, any>,
      defaultVisible: true,
      priority: 1, // Critical
      category: 'Data',
    },
    {
      column: {
        id: 'glAccount',
        accessorKey: 'glAccount',
        header: 'GL Account',
        cell: (info) => (
          <span className="text-sm text-gray-900">{info.getValue()}</span>
        ),
      } as ColumnDef<GLAnomaly, any>,
      defaultVisible: true,
      priority: 1, // Critical
      category: 'Data',
    },
    {
      column: {
        id: 'amount',
        accessorKey: 'amount',
        header: 'Amount',
        cell: (info) => (
          <span className="text-sm text-gray-900">
            ${info.getValue().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        ),
      } as ColumnDef<GLAnomaly, any>,
      defaultVisible: true,
      priority: 2, // Important
      category: 'Data',
    },
    {
      column: {
        id: 'postingDate',
        accessorKey: 'postingDate',
        header: 'Posting Date',
        cell: (info) => (
          <span className="text-sm text-gray-500">
            {new Date(info.getValue()).toLocaleDateString()}
          </span>
        ),
      } as ColumnDef<GLAnomaly, any>,
      defaultVisible: true,
      priority: 2, // Important
      category: 'Data',
    },
    {
      column: {
        id: 'detectionMethod',
        accessorKey: 'detectionMethod',
        header: 'Detection Method',
        cell: (info) => (
          <span className="text-sm text-gray-700 capitalize">
            {info.getValue().replace('_', ' ')}
          </span>
        ),
      } as ColumnDef<GLAnomaly, any>,
      defaultVisible: true,
      priority: 2, // Important
      category: 'Data',
    },
    {
      column: {
        id: 'riskLevel',
        accessorKey: 'riskLevel',
        header: 'Risk Level',
        cell: (info) => {
          const level = info.getValue();
          return (
            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded border ${getRiskBadge(level)}`}>
              {level.toUpperCase()}
            </span>
          );
        },
      } as ColumnDef<GLAnomaly, any>,
      defaultVisible: true,
      priority: 1, // Critical
      category: 'Data',
    },
    {
      column: {
        id: 'riskScore',
        accessorKey: 'riskScore',
        header: 'Risk Score',
        cell: (info) => {
          const score = info.getValue();
          return (
            <span className={`text-sm font-semibold ${getRiskScoreColor(score)}`}>
              {score.toFixed(1)}
            </span>
          );
        },
      } as ColumnDef<GLAnomaly, any>,
      defaultVisible: true,
      priority: 1, // Critical
      category: 'Data',
    },
    {
      column: {
        id: 'details',
        header: 'Details',
        cell: (info) => {
          const anomaly = info.row.original;
          return (
            <button
              onClick={() => setExpandedAnomaly(expandedAnomaly === anomaly.id ? null : anomaly.id)}
              className="text-blue-600 hover:text-blue-800 underline text-sm"
            >
              {expandedAnomaly === anomaly.id ? 'Hide' : 'Show'}
            </button>
          );
        },
      } as ColumnDef<GLAnomaly, any>,
      defaultVisible: true,
      priority: 1, // Always visible
      category: 'Actions',
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Filters */}
      <div className="p-6 border-b border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Risk Level</label>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All ({anomalies.length})</option>
              <option value="critical">
                Critical ({anomalies.filter((a) => a.riskLevel === 'critical').length})
              </option>
              <option value="high">
                High ({anomalies.filter((a) => a.riskLevel === 'high').length})
              </option>
              <option value="medium">
                Medium ({anomalies.filter((a) => a.riskLevel === 'medium').length})
              </option>
              <option value="low">
                Low ({anomalies.filter((a) => a.riskLevel === 'low').length})
              </option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Detection Method</label>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Methods</option>
              {detectionMethods.map((method) => (
                <option key={method} value={method}>
                  {method.replace('_', ' ').charAt(0).toUpperCase() + method.slice(1).replace('_', ' ')}
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
                <option value="riskScore">Risk Score</option>
                <option value="amount">Amount</option>
                <option value="postingDate">Posting Date</option>
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
      {sortedAnomalies.length === 0 ? (
        <div className="p-12 text-center">
          <p className="text-gray-500">No anomalies found for the selected filters.</p>
        </div>
      ) : (
        <>
          <TableWithColumnToggle
            data={sortedAnomalies}
            columns={columnConfigs}
            pageSize={50}
            isLoading={false}
            emptyMessage="No anomalies found for the selected filters."
            tableId="gl-anomaly-detection"
            showColumnPicker={true}
            className="anomaly-table"
          />

          {/* Expanded Details Section */}
          {expandedAnomaly && sortedAnomalies.find(a => a.id === expandedAnomaly) && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-sm text-gray-900 mb-1">Description:</h4>
                  <p className="text-sm text-gray-700">
                    {sortedAnomalies.find(a => a.id === expandedAnomaly)?.description}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-gray-900 mb-1">Evidence:</h4>
                  <pre className="text-xs bg-white rounded p-3 overflow-x-auto border border-gray-200">
                    {JSON.stringify(sortedAnomalies.find(a => a.id === expandedAnomaly)?.evidence, null, 2)}
                  </pre>
                </div>
                <div className="flex gap-2 pt-2">
                  <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                    Investigate
                  </button>
                  <button className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300">
                    Mark as False Positive
                  </button>
                  <button className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300">
                    Assign
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{sortedAnomalies.length}</span> of{' '}
              <span className="font-medium">{anomalies.length}</span> anomalies
            </p>
          </div>
        </>
      )}
    </div>
  );
}
