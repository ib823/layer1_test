'use client';

import { useState } from 'react';

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

interface ViolationTableProps {
  violations: Violation[];
}

export function ViolationTable({ violations }: ViolationTableProps) {
  const [selectedViolation, setSelectedViolation] = useState<Violation | null>(null);
  const [filterRiskLevel, setFilterRiskLevel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const getRiskBadgeClass = (level: string) => {
    switch (level.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      case 'LOW':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status.toUpperCase()) {
      case 'DETECTED':
        return 'bg-red-100 text-red-800';
      case 'ACKNOWLEDGED':
        return 'bg-yellow-100 text-yellow-800';
      case 'MITIGATED':
        return 'bg-green-100 text-green-800';
      case 'ACCEPTED':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredViolations = violations.filter((violation) => {
    const matchesRiskLevel = filterRiskLevel === 'all' || violation.riskLevel === filterRiskLevel;
    const matchesSearch =
      searchQuery === '' ||
      violation.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      violation.userId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      violation.ruleName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRiskLevel && matchesSearch;
  });

  return (
    <>
      {/* Filters */}
      <div className="mb-4 bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <input
              type="text"
              placeholder="Search by user name, user ID, or rule..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <select
              value={filterRiskLevel}
              onChange={(e) => setFilterRiskLevel(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Risk Levels</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Violation Rule
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Conflicting Roles
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Risk Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Risk Score
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
              {filteredViolations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No violations found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredViolations.map((violation) => (
                  <tr key={violation.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{violation.userName}</div>
                      <div className="text-sm text-gray-500">{violation.userId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {violation.department || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{violation.ruleName}</div>
                      <div className="text-sm text-gray-500 max-w-xs truncate">
                        {violation.ruleDescription}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {violation.conflictingRoles.map((role, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-800"
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRiskBadgeClass(
                          violation.riskLevel
                        )}`}
                      >
                        {violation.riskLevel}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {violation.riskScore}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(
                          violation.status
                        )}`}
                      >
                        {violation.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                      <button
                        onClick={() => setSelectedViolation(violation)}
                        className="hover:text-blue-800 underline"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedViolation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Violation Details</h2>
                <button
                  onClick={() => setSelectedViolation(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">User Information</h3>
                  <div className="mt-2 bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-gray-500">User Name</div>
                        <div className="text-sm font-medium text-gray-900">{selectedViolation.userName}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">User ID</div>
                        <div className="text-sm font-medium text-gray-900">{selectedViolation.userId}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Department</div>
                        <div className="text-sm font-medium text-gray-900">
                          {selectedViolation.department || 'N/A'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Detected At</div>
                        <div className="text-sm font-medium text-gray-900">
                          {new Date(selectedViolation.detectedAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500">Violation Details</h3>
                  <div className="mt-2 bg-gray-50 rounded-lg p-4">
                    <div className="space-y-3">
                      <div>
                        <div className="text-xs text-gray-500">Rule Name</div>
                        <div className="text-sm font-medium text-gray-900">{selectedViolation.ruleName}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Description</div>
                        <div className="text-sm text-gray-900">{selectedViolation.ruleDescription}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-gray-500">Risk Level</div>
                          <span
                            className={`mt-1 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRiskBadgeClass(
                              selectedViolation.riskLevel
                            )}`}
                          >
                            {selectedViolation.riskLevel}
                          </span>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Risk Score</div>
                          <div className="text-sm font-medium text-gray-900 mt-1">
                            {selectedViolation.riskScore}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500">Conflicting Roles</h3>
                  <div className="mt-2 bg-gray-50 rounded-lg p-4">
                    <div className="flex flex-wrap gap-2">
                      {selectedViolation.conflictingRoles.map((role, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-purple-100 text-purple-800"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500">Current Status</h3>
                  <div className="mt-2 bg-gray-50 rounded-lg p-4">
                    <span
                      className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${getStatusBadgeClass(
                        selectedViolation.status
                      )}`}
                    >
                      {selectedViolation.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setSelectedViolation(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  Acknowledge
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
