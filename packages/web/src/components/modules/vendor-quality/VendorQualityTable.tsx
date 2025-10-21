'use client';

import { useState } from 'react';

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

  return (
    <div className="bg-white rounded-lg shadow">
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
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issue Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Field</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Value</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Suggested</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quality Score</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedIssues.map((issue) => (
              <tr key={issue.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{issue.vendorName}</div>
                  <div className="text-xs text-gray-500">{issue.vendorId}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 capitalize">
                  {issue.issueType.replace('_', ' ')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getSeverityBadge(issue.severity)}`}>
                    {issue.severity.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{issue.fieldName || '-'}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{issue.currentValue || '-'}</td>
                <td className="px-6 py-4 text-sm text-green-600">{issue.suggestedValue || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`font-semibold ${getScoreColor(issue.qualityScore)}`}>
                    {issue.qualityScore.toFixed(0)}%
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    issue.status === 'open' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {issue.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sortedIssues.length === 0 && (
        <div className="p-12 text-center">
          <p className="text-gray-500">No issues found for the selected filters.</p>
        </div>
      )}

      {sortedIssues.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-700">
            Showing <span className="font-medium">{sortedIssues.length}</span> of{' '}
            <span className="font-medium">{issues.length}</span> issues
          </p>
        </div>
      )}
    </div>
  );
}
