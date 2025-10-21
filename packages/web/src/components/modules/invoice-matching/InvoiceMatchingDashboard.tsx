'use client';

import { useState, useEffect } from 'react';
import { InvoiceMatchTable } from './InvoiceMatchTable';
import { FraudAlertCard } from './FraudAlertCard';

interface InvoiceMatchRun {
  id: string;
  runDate: string;
  totalInvoices: number;
  matchedInvoices: number;
  unmatchedInvoices: number;
  fraudAlertsCount: number;
  status: string;
}

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

interface FraudAlert {
  id: string;
  alertType: string;
  severity: 'high' | 'medium' | 'low';
  invoiceNumber: string;
  description: string;
  evidence: any;
  status: string;
}

interface AnalysisResults {
  runId: string;
  totalInvoices: number;
  matchedInvoices: number;
  unmatchedInvoices: number;
  partialMatches: number;
  fraudAlertsCount: number;
  matchResults: InvoiceMatchResult[];
  fraudAlerts: FraudAlert[];
  summary: {
    matchRate: number;
    avgMatchScore: number;
    criticalAlerts: number;
  };
}

/**
 * Invoice Matching Dashboard
 *
 * Main dashboard component for the Invoice Matching module.
 * Provides comprehensive matching analysis and fraud detection capabilities.
 */
export function InvoiceMatchingDashboard() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AnalysisResults | null>(null);
  const [historicalRuns, setHistoricalRuns] = useState<InvoiceMatchRun[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('30'); // days
  const [error, setError] = useState<string | null>(null);

  // Load historical runs on mount
  useEffect(() => {
    loadHistoricalRuns();
  }, []);

  const loadHistoricalRuns = async () => {
    try {
      const response = await fetch('/api/modules/invoice-matching/runs');
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
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(selectedPeriod));

      const response = await fetch('/api/modules/invoice-matching/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fromDate: startDate.toISOString(),
          toDate: endDate.toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const data = await response.json();
      setResults(data);
      await loadHistoricalRuns(); // Refresh historical runs
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const loadRunResults = async (runId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/modules/invoice-matching/runs/${runId}`);
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
        <h1 className="text-3xl font-bold text-gray-900">Invoice Matching</h1>
        <p className="mt-2 text-gray-600">
          Three-way matching analysis and fraud detection for invoices, purchase orders, and goods receipts
        </p>
      </div>

      {/* Controls */}
      <div className="mb-6 bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Analysis Period
            </label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="60">Last 60 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={runAnalysis}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Running Analysis...
                </span>
              ) : (
                'Run Analysis'
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
              <div className="text-sm font-medium text-gray-600 mb-2">Total Invoices</div>
              <div className="text-3xl font-bold text-gray-900">{results.totalInvoices.toLocaleString()}</div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600 mb-2">Matched</div>
              <div className="text-3xl font-bold text-green-600">{results.matchedInvoices.toLocaleString()}</div>
              <div className="text-sm text-gray-500 mt-1">
                {((results.matchedInvoices / results.totalInvoices) * 100).toFixed(1)}% match rate
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600 mb-2">Unmatched</div>
              <div className="text-3xl font-bold text-red-600">{results.unmatchedInvoices.toLocaleString()}</div>
              <div className="text-sm text-gray-500 mt-1">
                {((results.unmatchedInvoices / results.totalInvoices) * 100).toFixed(1)}% unmatched
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600 mb-2">Fraud Alerts</div>
              <div className="text-3xl font-bold text-orange-600">{results.fraudAlertsCount}</div>
              <div className="text-sm text-gray-500 mt-1">
                {results.summary.criticalAlerts} critical
              </div>
            </div>
          </div>

          {/* Fraud Alerts Section */}
          {results.fraudAlerts && results.fraudAlerts.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Fraud Alerts</h2>
              <FraudAlertCard alerts={results.fraudAlerts} />
            </div>
          )}

          {/* Match Results Table */}
          {results.matchResults && results.matchResults.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Match Results</h2>
              <InvoiceMatchTable results={results.matchResults} />
            </div>
          )}
        </>
      )}

      {/* Historical Runs */}
      {historicalRuns.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Historical Runs</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Run Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Invoices
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Matched
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unmatched
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fraud Alerts
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
                      {run.totalInvoices.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                      {run.matchedInvoices.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                      {run.unmatchedInvoices.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600">
                      {run.fraudAlertsCount}
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No analysis results</h3>
          <p className="mt-1 text-sm text-gray-500">
            Select a period and run an analysis to see results.
          </p>
        </div>
      )}
    </div>
  );
}
