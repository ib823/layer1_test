'use client';

import { useState } from 'react';

interface DuplicateCluster {
  id: string;
  clusterSize: number;
  vendorIds: string[];
  vendorNames: string[];
  similarityScore: number;
  matchFields: string[];
  estimatedSavings: number;
  recommendedAction: string;
  status: string;
}

interface DuplicateClusterCardProps {
  clusters: DuplicateCluster[];
}

export function DuplicateClusterCard({ clusters }: DuplicateClusterCardProps) {
  const [expandedCluster, setExpandedCluster] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'merged' | 'ignored'>('all');

  const filteredClusters = clusters.filter((cluster) => {
    if (statusFilter === 'all') return true;
    return cluster.status === statusFilter;
  });

  const sortedClusters = [...filteredClusters].sort(
    (a, b) => b.estimatedSavings - a.estimatedSavings
  );

  const getSimilarityColor = (score: number) => {
    if (score >= 90) return 'text-red-600';
    if (score >= 75) return 'text-orange-600';
    return 'text-yellow-600';
  };

  const getSimilarityBadge = (score: number) => {
    if (score >= 90) return 'bg-red-100 text-red-800';
    if (score >= 75) return 'bg-orange-100 text-orange-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 mb-4">
        <label className="text-sm font-medium text-gray-700">Filter by Status:</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All ({clusters.length})</option>
          <option value="pending">
            Pending ({clusters.filter((c) => c.status === 'pending').length})
          </option>
          <option value="merged">
            Merged ({clusters.filter((c) => c.status === 'merged').length})
          </option>
          <option value="ignored">
            Ignored ({clusters.filter((c) => c.status === 'ignored').length})
          </option>
        </select>
      </div>

      <div className="space-y-3">
        {sortedClusters.map((cluster) => (
          <div key={cluster.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
            <div
              className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() =>
                setExpandedCluster(expandedCluster === cluster.id ? null : cluster.id)
              }
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900">
                      Cluster #{cluster.id.slice(0, 8)}
                    </h3>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${getSimilarityBadge(
                        cluster.similarityScore
                      )}`}
                    >
                      {cluster.similarityScore.toFixed(0)}% Match
                    </span>
                    <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">
                      {cluster.clusterSize} Vendors
                    </span>
                  </div>

                  <div className="text-sm text-gray-700 mb-2">
                    <span className="font-medium">Matched Fields:</span>{' '}
                    {cluster.matchFields.join(', ')}
                  </div>

                  <div className="flex items-center gap-6 text-sm">
                    <div>
                      <span className="text-gray-600">Est. Savings:</span>{' '}
                      <span className="font-semibold text-green-600">
                        ${cluster.estimatedSavings.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Status:</span>{' '}
                      <span
                        className={`font-medium ${
                          cluster.status === 'pending'
                            ? 'text-blue-600'
                            : cluster.status === 'merged'
                            ? 'text-green-600'
                            : 'text-gray-600'
                        }`}
                      >
                        {cluster.status.charAt(0).toUpperCase() + cluster.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>

                <svg
                  className={`w-5 h-5 text-gray-500 transition-transform ${
                    expandedCluster === cluster.id ? 'transform rotate-180' : ''
                  }`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>

            {expandedCluster === cluster.id && (
              <div className="px-4 pb-4 pt-2 border-t border-gray-200 bg-gray-50">
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-sm text-gray-900 mb-2">Vendor IDs:</h4>
                    <div className="flex flex-wrap gap-2">
                      {cluster.vendorIds.map((id, idx) => (
                        <span
                          key={id}
                          className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono"
                        >
                          {id}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm text-gray-900 mb-2">Vendor Names:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {cluster.vendorNames.map((name, idx) => (
                        <li key={idx} className="text-sm text-gray-700">
                          {name}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm text-gray-900 mb-1">
                      Recommended Action:
                    </h4>
                    <p className="text-sm text-gray-700">{cluster.recommendedAction}</p>
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-gray-300">
                    <button className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700">
                      Merge Vendors
                    </button>
                    <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                      Review Details
                    </button>
                    <button className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300">
                      Mark as False Positive
                    </button>
                    <button className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300">
                      Ignore
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {sortedClusters.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No duplicate clusters</h3>
          <p className="mt-1 text-sm text-gray-500">
            {statusFilter === 'all'
              ? 'No duplicate clusters detected.'
              : `No ${statusFilter} clusters found.`}
          </p>
        </div>
      )}
    </div>
  );
}
