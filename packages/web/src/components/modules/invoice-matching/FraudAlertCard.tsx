'use client';

import { useState } from 'react';

interface FraudAlert {
  id: string;
  alertType: string;
  severity: 'high' | 'medium' | 'low';
  invoiceNumber: string;
  description: string;
  evidence: any;
  status: string;
}

interface FraudAlertCardProps {
  alerts: FraudAlert[];
}

/**
 * Fraud Alert Card Component
 *
 * Displays fraud detection alerts with severity indicators and evidence details.
 */
export function FraudAlertCard({ alerts }: FraudAlertCardProps) {
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  const filteredAlerts = alerts.filter((alert) => {
    if (severityFilter === 'all') return true;
    return alert.severity === severityFilter;
  });

  const getSeverityColor = (severity: string) => {
    const colors = {
      high: 'bg-red-100 text-red-800 border-red-200',
      medium: 'bg-orange-100 text-orange-800 border-orange-200',
      low: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    };
    return colors[severity as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getSeverityIcon = (severity: string) => {
    if (severity === 'high') {
      return (
        <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
      );
    }
    if (severity === 'medium') {
      return (
        <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
          clipRule="evenodd"
        />
      </svg>
    );
  };

  const getAlertTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      duplicate: 'Duplicate Invoice',
      pattern: 'Suspicious Pattern',
      outlier: 'Outlier Detected',
      threshold: 'Threshold Violation',
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center gap-4 mb-4">
        <label className="text-sm font-medium text-gray-700">Filter by Severity:</label>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value as any)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All ({alerts.length})</option>
          <option value="high">High ({alerts.filter((a) => a.severity === 'high').length})</option>
          <option value="medium">
            Medium ({alerts.filter((a) => a.severity === 'medium').length})
          </option>
          <option value="low">Low ({alerts.filter((a) => a.severity === 'low').length})</option>
        </select>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {filteredAlerts.map((alert) => (
          <div
            key={alert.id}
            className={`border rounded-lg overflow-hidden ${getSeverityColor(alert.severity)}`}
          >
            {/* Alert Header */}
            <div
              className="p-4 cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setExpandedAlert(expandedAlert === alert.id ? null : alert.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  {getSeverityIcon(alert.severity)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{getAlertTypeLabel(alert.alertType)}</h3>
                      <span className="px-2 py-1 text-xs font-medium rounded">
                        {alert.severity.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm mt-1">{alert.description}</p>
                    <p className="text-xs mt-2">
                      <span className="font-medium">Invoice:</span> {alert.invoiceNumber}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      alert.status === 'open'
                        ? 'bg-white bg-opacity-50'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {alert.status}
                  </span>
                  <svg
                    className={`w-5 h-5 transition-transform ${
                      expandedAlert === alert.id ? 'transform rotate-180' : ''
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
            </div>

            {/* Expanded Evidence Details */}
            {expandedAlert === alert.id && (
              <div className="px-4 pb-4 pt-2 border-t bg-white bg-opacity-50">
                <h4 className="font-medium text-sm mb-2">Evidence:</h4>
                <div className="bg-white bg-opacity-70 rounded p-3">
                  <pre className="text-xs overflow-x-auto">
                    {JSON.stringify(alert.evidence, null, 2)}
                  </pre>
                </div>
                <div className="mt-3 flex gap-2">
                  <button className="px-3 py-1 bg-white rounded text-sm hover:bg-opacity-80 transition-colors">
                    Investigate
                  </button>
                  <button className="px-3 py-1 bg-white rounded text-sm hover:bg-opacity-80 transition-colors">
                    Mark as False Positive
                  </button>
                  <button className="px-3 py-1 bg-white rounded text-sm hover:bg-opacity-80 transition-colors">
                    Assign
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredAlerts.length === 0 && (
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
          <h3 className="mt-2 text-sm font-medium text-gray-900">No fraud alerts</h3>
          <p className="mt-1 text-sm text-gray-500">
            {severityFilter === 'all'
              ? 'No fraud alerts detected in this analysis.'
              : `No ${severityFilter} severity alerts found.`}
          </p>
        </div>
      )}
    </div>
  );
}
