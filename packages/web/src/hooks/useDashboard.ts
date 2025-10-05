import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

interface DashboardKPIs {
  total: number; critical: number; open_count: number; users: number;
  prev_total: number; score: number; trend: number;
}

export function useDashboardKPIs() {
  return useQuery<{ data: DashboardKPIs }>({
    queryKey: ['dashboard', 'kpis'],
    queryFn: () => apiClient.get('/api/dashboard/kpis'),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}
