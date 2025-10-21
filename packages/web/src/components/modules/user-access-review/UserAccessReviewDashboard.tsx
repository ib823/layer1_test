'use client';

import { useState, useEffect } from 'react';
import { UserAccessTable } from './UserAccessTable';
import { ViolationTable } from './ViolationTable';

interface UserAccess {
  userId: string;
  userName: string;
  email?: string;
  roles: string[];
  department?: string;
  isActive: boolean;
  violationCount?: number;
}

interface Violation {
  id: string;
  userId: string;
  userName: string;
  department: string;
  conflictingRoles: string[];
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  riskScore: number;
  ruleName: string;
  ruleDescription: string;
  detectedAt: string;
  status: string;
}

interface AnalysisResults {
  summary: {
    totalUsers: number;
    usersWithViolations: number;
    totalViolations: number;
    criticalViolations: number;
    highViolations: number;
    mediumViolations: number;
    lowViolations: number;
  };
  violations: Violation[];
  users?: UserAccess[];
  recommendations: string[];
  generatedAt: string;
}

/**
 * User Access Review Dashboard
 *
 * Main dashboard component for the User Access Review module.
 * Provides comprehensive user access analysis and SoD violation detection.
 */
export function UserAccessReviewDashboard() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AnalysisResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'violations' | 'users'>('violations');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [minimumRiskScore, setMinimumRiskScore] = useState(50);

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/modules/user-access-review/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          includeInactiveUsers: includeInactive,
          minimumRiskScore: minimumRiskScore,
        }),
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level.toUpperCase()) {
      case 'CRITICAL':
        return 'text-red-600';
      case 'HIGH':
        return 'text-orange-600';
      case 'MEDIUM':
        return 'text-yellow-600';
      case 'LOW':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">User Access Review</h1>
        <p className="mt-2 text-gray-600">
          Comprehensive user access analysis and Segregation of Duties (SoD) violation detection
        </p>
      </div>

      {/* Controls */}
      <div className="mb-6 bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Minimum Risk Score
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={minimumRiskScore}
              onChange={(e) => setMinimumRiskScore(parseInt(e.target.value) || 0)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
            <p className="mt-1 text-xs text-gray-500">
              Filter violations by risk score (0-100)
            </p>
          </div>

          <div>
            <label className="flex items-center mt-7 cursor-pointer">
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(e) => setIncludeInactive(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                disabled={loading}
              />
              <span className="ml-2 text-sm font-medium text-gray-700">
                Include inactive users
              </span>
            </label>
            <p className="mt-1 text-xs text-gray-500 ml-6">
              Analyze all users including deactivated accounts
            </p>
          </div>

          <div className="flex items-end">
            <button
              onClick={runAnalysis}
              disabled={loading}
              className="w-full px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
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
              <div className="text-sm font-medium text-gray-600 mb-2">Total Users</div>
              <div className="text-3xl font-bold text-gray-900">{results.summary.totalUsers.toLocaleString()}</div>
              <div className="text-sm text-gray-500 mt-1">
                Active accounts analyzed
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600 mb-2">Total Violations</div>
              <div className="text-3xl font-bold text-red-600">{results.summary.totalViolations.toLocaleString()}</div>
              <div className="text-sm text-gray-500 mt-1">
                {results.summary.usersWithViolations} users affected
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600 mb-2">Critical Violations</div>
              <div className="text-3xl font-bold text-purple-600">
                {results.summary.criticalViolations}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                High: {results.summary.highViolations}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600 mb-2">Compliance Score</div>
              <div className="text-3xl font-bold text-green-600">
                {((1 - results.summary.usersWithViolations / results.summary.totalUsers) * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500 mt-1">
                Users without violations
              </div>
            </div>
          </div>

          {/* Recommendations */}
          {results.recommendations && results.recommendations.length > 0 && (
            <div className="mb-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-yellow-900 mb-3">Recommendations</h2>
              <ul className="space-y-2">
                {results.recommendations.map((recommendation, index) => (
                  <li key={index} className="text-sm text-yellow-800 flex items-start gap-2">
                    <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <span>{recommendation}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Risk Level Breakdown */}
          <div className="mb-8 bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Violations by Risk Level</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="text-sm text-gray-600">Critical</div>
                <div className={`text-2xl font-bold mt-1 ${getRiskColor('CRITICAL')}`}>
                  {results.summary.criticalViolations}
                </div>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="text-sm text-gray-600">High</div>
                <div className={`text-2xl font-bold mt-1 ${getRiskColor('HIGH')}`}>
                  {results.summary.highViolations}
                </div>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="text-sm text-gray-600">Medium</div>
                <div className={`text-2xl font-bold mt-1 ${getRiskColor('MEDIUM')}`}>
                  {results.summary.mediumViolations}
                </div>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="text-sm text-gray-600">Low</div>
                <div className={`text-2xl font-bold mt-1 ${getRiskColor('LOW')}`}>
                  {results.summary.lowViolations}
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('violations')}
                  className={`${
                    activeTab === 'violations'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                >
                  Violations ({results.violations.length})
                </button>
                {results.users && (
                  <button
                    onClick={() => setActiveTab('users')}
                    className={`${
                      activeTab === 'users'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                  >
                    Users ({results.users.length})
                  </button>
                )}
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'violations' && results.violations.length > 0 && (
            <div className="mb-8">
              <ViolationTable violations={results.violations} />
            </div>
          )}

          {activeTab === 'users' && results.users && results.users.length > 0 && (
            <div className="mb-8">
              <UserAccessTable users={results.users} />
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {!results && !loading && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No analysis results</h3>
          <p className="mt-1 text-sm text-gray-500">
            Configure your analysis parameters and run to see user access violations.
          </p>
        </div>
      )}
    </div>
  );
}
