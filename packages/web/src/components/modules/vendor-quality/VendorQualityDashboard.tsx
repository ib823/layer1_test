'use client';

import { useState, useEffect } from 'react';
import { VendorQualityTable } from './VendorQualityTable';
import { DuplicateClusterCard } from './DuplicateClusterCard';

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

interface VendorQualityRun {
  id: string;
  runDate: string;
  status: string;
  totalVendors: number;
  issuesFound: number;
  duplicatesFound: number;
  potentialSavings: number;
}

interface AnalysisResults {
  runId: string;
  totalVendors: number;
  issuesFound: number;
  duplicatesFound: number;
  potentialSavings: number;
  qualityIssues: VendorQualityIssue[];
  duplicateClusters: DuplicateCluster[];
  summary: {
    avgQualityScore: number;
    bySeverity: Record<string, number>;
    byIssueType: Record<string, number>;
    topIssues: string[];
  };
}

export function VendorQualityDashboard() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AnalysisResults | null>(null);
  const [historicalRuns, setHistoricalRuns] = useState<VendorQualityRun[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'issues' | 'duplicates'>('issues');

  useEffect(() => {
    loadHistoricalRuns();
  }, []);

  const loadHistoricalRuns = async () => {
    try {
      const response = await fetch('/api/modules/vendor-quality/runs');
      if (!response.ok) throw new Error('Failed to load historical runs');
      const data = await response.json();
      setHistoricalRuns(data.runs || []);
    } catch (err) {
      console.error('Error loading historical runs:', err);
    }
  };

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/modules/vendor-quality/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) throw new Error('Analysis failed');

      const data = await response.json();
      setResults(data);
      await loadHistoricalRuns();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const loadRunResults = async (runId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/modules/vendor-quality/runs/${runId}`);
      if (!response.ok) throw new Error('Failed to load run');
      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Vendor Data Quality</h1>
        <p className="mt-2 text-gray-600">
          Comprehensive vendor master data quality analysis and duplicate detection
        </p>
      </div>

      <div className="mb-6 bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Quality Analysis</h2>
            <p className="text-sm text-gray-600 mt-1">
              Analyze all vendor master data for quality issues and duplicates
            </p>
          </div>
          <button
            onClick={runAnalysis}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Running Analysis...' : 'Run Analysis'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}

      {results && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600 mb-2">Total Vendors</div>
              <div className="text-3xl font-bold text-gray-900">{results.totalVendors.toLocaleString()}</div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600 mb-2">Quality Issues</div>
              <div className="text-3xl font-bold text-orange-600">{results.issuesFound.toLocaleString()}</div>
              <div className="text-sm text-gray-500 mt-1">
                Avg Score: {results.summary.avgQualityScore.toFixed(1)}%
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600 mb-2">Duplicates Found</div>
              <div className="text-3xl font-bold text-red-600">{results.duplicatesFound}</div>
              <div className="text-sm text-gray-500 mt-1">
                In {results.duplicateClusters.length} clusters
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600 mb-2">Potential Savings</div>
              <div className="text-3xl font-bold text-green-600">
                ${results.potentialSavings.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500 mt-1">From deduplication</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex gap-6">
                <button
                  onClick={() => setActiveTab('issues')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'issues'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Quality Issues ({results.qualityIssues.length})
                </button>
                <button
                  onClick={() => setActiveTab('duplicates')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'duplicates'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Duplicate Clusters ({results.duplicateClusters.length})
                </button>
              </nav>
            </div>
          </div>

          {activeTab === 'issues' && results.qualityIssues.length > 0 && (
            <VendorQualityTable issues={results.qualityIssues} />
          )}

          {activeTab === 'duplicates' && results.duplicateClusters.length > 0 && (
            <DuplicateClusterCard clusters={results.duplicateClusters} />
          )}
        </>
      )}

      {/* Historical Runs */}
      {historicalRuns.length > 0 && (
        <div className="mt-8 bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Historical Runs</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Run Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendors</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issues</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duplicates</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Savings</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {historicalRuns.map((run) => (
                  <tr key={run.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(run.runDate).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{run.totalVendors.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600">{run.issuesFound}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">{run.duplicatesFound}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">${run.potentialSavings.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        run.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {run.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                      <button onClick={() => loadRunResults(run.id)} className="hover:text-blue-800 underline">
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!results && !loading && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No analysis results</h3>
          <p className="mt-1 text-sm text-gray-500">Run an analysis to see vendor data quality insights.</p>
        </div>
      )}
    </div>
  );
}
