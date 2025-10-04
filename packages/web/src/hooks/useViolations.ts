/**
 * Custom Hook for SoD Violations Data Fetching
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { SoDViolation, FilterOptions } from '@/types';

export function useViolations(tenantId: string, filters?: FilterOptions) {
  return useQuery({
    queryKey: ['violations', tenantId, filters],
    queryFn: async () => {
      const response = await api.getViolations(tenantId, filters);
      return response.data as SoDViolation[];
    },
    enabled: !!tenantId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useViolation(tenantId: string, violationId: string) {
  return useQuery({
    queryKey: ['violation', tenantId, violationId],
    queryFn: async () => {
      const response = await api.getViolationById(tenantId, violationId);
      return response.data as SoDViolation;
    },
    enabled: !!tenantId && !!violationId,
  });
}

export function useRunAnalysis(tenantId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.runAnalysis(tenantId),
    onSuccess: () => {
      // Invalidate and refetch violations after analysis
      queryClient.invalidateQueries({ queryKey: ['violations', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats', tenantId] });
    },
  });
}
