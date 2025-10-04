'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { StatusBadge } from '@/components/admin/StatusBadge';

interface Connector {
  name: string;
  type: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'DEGRADED' | 'ERROR';
  lastHealthCheck: string;
  circuitBreaker?: {
    state: string;
    failureCount: number;
  };
}

export default function ConnectorsPage() {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadConnectors();
    const interval = setInterval(loadConnectors, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, []);

  async function loadConnectors() {
    const response = await api.getConnectorStatus();
    if (response.success && response.data) {
      setConnectors(Array.isArray(response.data) ? response.data : []);
      setError(null);
    } else {
      setError(response.error || 'Failed to load connectors');
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading connectors...</p>
        </div>
      </div>
    );
  }

  const healthyCount = connectors.filter(c => c.status === 'CONNECTED').length;
  const totalCount = connectors.length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🔌 SAP Connectors
        </h1>
        <p className="text-gray-600">
          Monitor all SAP system connections across tenants
        </p>
      </div>

      {/* Overall Status */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Overall Status
            </h2>
            <div className="flex items-center gap-2">
              {healthyCount === totalCount ? (
                <StatusBadge status="CONNECTED" size="lg" />
              ) : (
                <StatusBadge status="DEGRADED" size="lg" />
              )}
              <span className="text-2xl font-bold">
                {healthyCount}/{totalCount} Healthy
              </span>
            </div>
          </div>
          <div className="text-right text-sm text-gray-500">
            Auto-refresh: Every 5 seconds
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">⚠️ {error}</p>
        </div>
      )}

      {/* Connectors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {connectors.map((connector, index) => (
          <Link
            key={index}
            href={`/admin/connectors/${encodeURIComponent(connector.name)}`}
            className="block"
          >
            <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 cursor-pointer">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-xs text-gray-500 uppercase mb-1">
                    {connector.type}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {connector.name}
                  </h3>
                </div>
                <StatusBadge status={connector.status} />
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Check:</span>
                  <span className="font-medium">
                    {new Date(connector.lastHealthCheck).toLocaleTimeString()}
                  </span>
                </div>

                {connector.circuitBreaker && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Circuit Breaker:</span>
                    <span className={`font-medium ${
                      connector.circuitBreaker.state === 'OPEN' 
                        ? 'text-red-600' 
                        : 'text-green-600'
                    }`}>
                      {connector.circuitBreaker.state}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-blue-600 text-sm font-medium">
                  View Details →
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Empty State */}
      {connectors.length === 0 && !loading && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">🔌</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No Connectors Found
          </h3>
          <p className="text-gray-600">
            No SAP connectors are currently configured.
          </p>
        </div>
      )}
    </div>
  );
}