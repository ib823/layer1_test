'use client';

import { useState } from 'react';

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

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Invoice Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                PO Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                GR Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vendor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Match Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Match Score
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Discrepancies
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedResults.map((result) => (
              <tr key={result.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {result.invoiceNumber}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {result.poNumber || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {result.grNumber || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div>
                    <div className="text-gray-900">{result.vendorName || '-'}</div>
                    {result.vendorId && (
                      <div className="text-xs text-gray-500">{result.vendorId}</div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(
                      result.matchStatus
                    )}`}
                  >
                    {result.matchStatus}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`font-semibold ${getScoreColor(result.matchScore)}`}>
                    {result.matchScore.toFixed(1)}%
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {result.discrepancies && Object.keys(result.discrepancies).length > 0 ? (
                    <div className="space-y-1">
                      {Object.entries(result.discrepancies).map(([key, value]) => (
                        <div key={key} className="text-xs">
                          <span className="font-medium">{key}:</span> {JSON.stringify(value)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-400">None</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination or Empty State */}
      {sortedResults.length === 0 && (
        <div className="p-12 text-center">
          <p className="text-gray-500">No results found for the selected filter.</p>
        </div>
      )}

      {sortedResults.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-700">
            Showing <span className="font-medium">{sortedResults.length}</span> of{' '}
            <span className="font-medium">{results.length}</span> results
          </p>
        </div>
      )}
    </div>
  );
}
