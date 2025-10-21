'use client';

interface TopAnomalousAccount {
  glAccount: string;
  anomalyCount: number;
  avgRiskScore: number;
}

interface RiskHeatmapProps {
  accounts: TopAnomalousAccount[];
}

/**
 * Risk Heatmap Component
 *
 * Visual representation of the riskiest GL accounts using a heatmap visualization.
 */
export function RiskHeatmap({ accounts }: RiskHeatmapProps) {
  // Calculate max values for normalization
  const maxCount = Math.max(...accounts.map((a) => a.anomalyCount));
  const maxScore = Math.max(...accounts.map((a) => a.avgRiskScore));

  // Get color based on risk score
  const getRiskColor = (score: number): string => {
    const intensity = Math.round((score / 100) * 9); // 0-9 intensity
    const colors = [
      'bg-green-50',   // 0-10
      'bg-green-100',  // 10-20
      'bg-yellow-100', // 20-30
      'bg-yellow-200', // 30-40
      'bg-orange-100', // 40-50
      'bg-orange-200', // 50-60
      'bg-orange-300', // 60-70
      'bg-red-200',    // 70-80
      'bg-red-300',    // 80-90
      'bg-red-400',    // 90-100
    ];
    return colors[intensity] || 'bg-gray-100';
  };

  const getTextColor = (score: number): string => {
    if (score >= 70) return 'text-red-900';
    if (score >= 50) return 'text-orange-900';
    if (score >= 30) return 'text-yellow-900';
    return 'text-green-900';
  };

  // Calculate cell size based on anomaly count (relative sizing)
  const getCellSize = (count: number): string => {
    const ratio = count / maxCount;
    if (ratio >= 0.8) return 'col-span-2 row-span-2';
    if (ratio >= 0.5) return 'col-span-2';
    return '';
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Legend */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Risk Score</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">Low</span>
            <div className="flex gap-1">
              <div className="w-8 h-4 bg-green-100 border border-gray-200"></div>
              <div className="w-8 h-4 bg-yellow-200 border border-gray-200"></div>
              <div className="w-8 h-4 bg-orange-300 border border-gray-200"></div>
              <div className="w-8 h-4 bg-red-400 border border-gray-200"></div>
            </div>
            <span className="text-xs text-gray-600">High</span>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Size = Anomaly Count</h3>
          <p className="text-xs text-gray-600">Larger cells = more anomalies</p>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 auto-rows-fr">
        {accounts.map((account) => {
          const color = getRiskColor(account.avgRiskScore);
          const textColor = getTextColor(account.avgRiskScore);
          const size = getCellSize(account.anomalyCount);

          return (
            <div
              key={account.glAccount}
              className={`${color} ${size} border border-gray-300 rounded p-3 hover:shadow-lg transition-shadow cursor-pointer group relative`}
              title={`GL Account: ${account.glAccount}\nAnomalies: ${account.anomalyCount}\nAvg Risk Score: ${account.avgRiskScore.toFixed(1)}`}
            >
              <div className={`${textColor} space-y-1`}>
                <div className="text-xs font-mono font-semibold truncate">
                  {account.glAccount}
                </div>
                <div className="text-xs">
                  <span className="font-medium">{account.anomalyCount}</span>
                  <span className="text-gray-600 text-[10px]"> anomalies</span>
                </div>
                <div className="text-xs font-bold">
                  {account.avgRiskScore.toFixed(0)}
                </div>
              </div>

              {/* Tooltip on hover */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 rounded transition-all pointer-events-none"></div>
              <div className="hidden group-hover:block absolute top-full left-0 mt-2 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10 whitespace-nowrap">
                <div><strong>GL Account:</strong> {account.glAccount}</div>
                <div><strong>Anomalies:</strong> {account.anomalyCount}</div>
                <div><strong>Avg Risk Score:</strong> {account.avgRiskScore.toFixed(1)}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Table */}
      <div className="mt-6 border-t border-gray-200 pt-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Account Details</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  GL Account
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Anomaly Count
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Risk Score
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Risk Level
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {accounts.map((account) => (
                <tr key={account.glAccount} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm font-mono text-gray-900">
                    {account.glAccount}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900">
                    {account.anomalyCount}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    <span className={`font-semibold ${getTextColor(account.avgRiskScore)}`}>
                      {account.avgRiskScore.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        account.avgRiskScore >= 80
                          ? 'bg-red-100 text-red-800'
                          : account.avgRiskScore >= 60
                          ? 'bg-orange-100 text-orange-800'
                          : account.avgRiskScore >= 40
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {account.avgRiskScore >= 80
                        ? 'Critical'
                        : account.avgRiskScore >= 60
                        ? 'High'
                        : account.avgRiskScore >= 40
                        ? 'Medium'
                        : 'Low'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
