/**
 * Custom Hook for Tenant Data
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Tenant } from '@/types';

export function useTenant(tenantId: string) {
  return useQuery({
    queryKey: ['tenant', tenantId],
    queryFn: async () => {
      const response = await api.getTenant(tenantId);
      return response.data as Tenant;
    },
    enabled: !!tenantId,
  });
}

export function useCreateTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (companyName: string) => api.createTenant(companyName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
  });
}
