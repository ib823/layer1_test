'use client';

import { useState, useEffect } from 'react';
import { AnomalyTable } from './AnomalyTable';
import { RiskHeatmap } from './RiskHeatmap';

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

interface GLAnomalyRun {
  id: string;
  fiscalYear: string;
  fiscalPeriod?: string;
  runDate: string;
  status: string;
  totalTransactions: number;
  anomaliesFound: number;
}

interface AnalysisResults {
  runId: string;
  totalTransactions: number;
  anomaliesFound: number;
  anomalies: GLAnomaly[];
  summary: {
    byDetectionMethod: Record<string, number>;
    byRiskLevel: Record<string, number>;
    topAnomalousAccounts: Array<{
      glAccount: string;
      anomalyCount: number;
      avgRiskScore: number;
    }>;
  };
}

/**
 * GL Anomaly Detection Dashboard
 *
 * Main dashboard component for the GL Anomaly Detection module.
 * Provides comprehensive anomaly detection and risk analysis capabilities.
 */
export function GLAnomalyDashboard() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AnalysisResults | null>(null);
  const [historicalRuns, setHistoricalRuns] = useState<GLAnomalyRun[]>([]);
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear().toString());
  const [fiscalPeriod, setFiscalPeriod] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Generate fiscal year options
  const currentYear = new Date().getFullYear();
  const fiscalYearOptions = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

  // Generate fiscal period options (001-012)
  const fiscalPeriodOptions = Array.from({ length: 12 }, (_, i) =>
    (i + 1).toString().padStart(3, '0')
  );

  useEffect(() => {
    loadHistoricalRuns();
  }, []);

  const loadHistoricalRuns = async () => {
    try {
      const response = await fetch('/api/modules/gl-anomaly/runs');
      if (!response.ok) throw new Error('Failed to load historical runs');
      const data = await response.json();
      setHistoricalRuns(data.runs || []);
    } catch (err) {
      console.error('Error loading historical runs:', err);
    }
  };

  const runDetection = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/modules/gl-anomaly/detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fiscalYear,
          fiscalPeriod: fiscalPeriod || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Detection failed');
      }

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
      const response = await fetch(`/api/modules/gl-anomaly/runs/${runId}`);
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
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">GL Anomaly Detection</h1>
        <p className="mt-2 text-gray-600">
          Advanced anomaly detection using Benford's Law, statistical analysis, and behavioral patterns
        </p>
      </div>

      {/* Controls */}
      <div className="mb-6 bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fiscal Year
            </label>
            <select
              value={fiscalYear}
              onChange={(e) => setFiscalYear(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            >
              {fiscalYearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fiscal Period (Optional)
            </label>
            <select
              value={fiscalPeriod}
              onChange={(e) => setFiscalPeriod(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            >
              <option value="">All Periods</option>
              {fiscalPeriodOptions.map((period) => (
                <option key={period} value={period}>
                  Period {period}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={runDetection}
              disabled={loading}
              className="w-full px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Running Detection...
                </span>
              ) : (
                'Run Detection'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
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

      {/* Summary Statistics */}
      {results && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600 mb-2">Total Transactions</div>
              <div className="text-3xl font-bold text-gray-900">{results.totalTransactions.toLocaleString()}</div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600 mb-2">Anomalies Found</div>
              <div className="text-3xl font-bold text-red-600">{results.anomaliesFound.toLocaleString()}</div>
              <div className="text-sm text-gray-500 mt-1">
                {((results.anomaliesFound / results.totalTransactions) * 100).toFixed(2)}% of transactions
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600 mb-2">Critical Anomalies</div>
              <div className="text-3xl font-bold text-purple-600">
                {results.summary.byRiskLevel.critical || 0}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                High: {results.summary.byRiskLevel.high || 0}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600 mb-2">Detection Methods</div>
              <div className="text-3xl font-bold text-blue-600">
                {Object.keys(results.summary.byDetectionMethod).length}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                Active methods
              </div>
            </div>
          </div>

          {/* Risk Heatmap */}
          {results.summary.topAnomalousAccounts && results.summary.topAnomalousAccounts.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Risk Heatmap - Top Anomalous Accounts</h2>
              <RiskHeatmap accounts={results.summary.topAnomalousAccounts} />
            </div>
          )}

          {/* Detection Method Breakdown */}
          <div className="mb-8 bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Anomalies by Detection Method</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(results.summary.byDetectionMethod).map(([method, count]) => (
                <div key={method} className="border border-gray-200 rounded-lg p-4">
                  <div className="text-sm text-gray-600 capitalize">
                    {method.replace('_', ' ')}
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">{count}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Anomalies Table */}
          {results.anomalies && results.anomalies.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Detected Anomalies</h2>
              <AnomalyTable anomalies={results.anomalies} />
            </div>
          )}
        </>
      )}

      {/* Historical Runs */}
      {historicalRuns.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Historical Detection Runs</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Run Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fiscal Year
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transactions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Anomalies
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {historicalRuns.map((run) => (
                  <tr key={run.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(run.runDate).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {run.fiscalYear}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {run.fiscalPeriod || 'All'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {run.totalTransactions.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                      {run.anomaliesFound}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        run.status === 'completed' ? 'bg-green-100 text-green-800' :
                        run.status === 'running' ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {run.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                      <button
                        onClick={() => loadRunResults(run.id)}
                        className="hover:text-blue-800 underline"
                      >
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

      {/* Empty State */}
      {!results && !loading && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No detection results</h3>
          <p className="mt-1 text-sm text-gray-500">
            Select a fiscal year and period, then run detection to see results.
          </p>
        </div>
      )}
    </div>
  );
}
