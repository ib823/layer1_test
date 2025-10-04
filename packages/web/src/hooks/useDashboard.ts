/**
 * Custom Hook for Dashboard Data
 */
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { DashboardStats } from '@/types';

export function useDashboardStats(tenantId: string) {
  return useQuery({
    queryKey: ['dashboard-stats', tenantId],
    queryFn: async () => {
      // Mock implementation - replace with actual API endpoint
      const response = await api.getTenant(tenantId);

      // For now, return mock data
      // TODO: Replace with actual dashboard stats endpoint
      return {
        totalViolations: 247,
        criticalIssues: 45,
        usersAnalyzed: 1284,
        complianceScore: 94,
        trends: {
          violations: 12,
          critical: 5,
          users: 8,
          compliance: 2,
        },
      } as DashboardStats;
    },
    enabled: !!tenantId,
    refetchInterval: 60000, // Refresh every minute
  });
}
