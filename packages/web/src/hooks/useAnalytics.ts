import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

interface TrendData { month: string; violations: number; resolved: number; in_progress: number; }
interface RiskData { name: string; value: number; }
interface DepartmentData { department: string; violations: number; avg_risk_score: number; critical_count: number; high_count: number; }
interface ViolationType { type: string; count: number; percentage: number; }
interface ComplianceScore { score: number; total_violations: number; resolved: number; critical_open: number; high_open: number; }

export function useAnalyticsTrends(months: number = 6) {
  return useQuery<{ data: TrendData[] }>({
    queryKey: ['analytics', 'trends', months],
    queryFn: () => apiClient.get(`/api/analytics/trends?months=${months}`),
    staleTime: 5 * 60 * 1000,
  });
}

export function useRiskDistribution() {
  return useQuery<{ data: RiskData[]; total: number }>({
    queryKey: ['analytics', 'risk-distribution'],
    queryFn: () => apiClient.get('/api/analytics/risk-distribution'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useDepartmentBreakdown() {
  return useQuery<{ data: DepartmentData[] }>({
    queryKey: ['analytics', 'department-breakdown'],
    queryFn: () => apiClient.get('/api/analytics/department-breakdown'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useTopViolationTypes() {
  return useQuery<{ data: ViolationType[] }>({
    queryKey: ['analytics', 'violation-types'],
    queryFn: () => apiClient.get('/api/analytics/top-violation-types'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useComplianceScore() {
  return useQuery<{ data: ComplianceScore }>({
    queryKey: ['analytics', 'compliance-score'],
    queryFn: () => apiClient.get('/api/analytics/compliance-score'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAnalytics(months: number = 6) {
  const trends = useAnalyticsTrends(months);
  const riskDistribution = useRiskDistribution();
  const departmentBreakdown = useDepartmentBreakdown();
  const violationTypes = useTopViolationTypes();
  const complianceScore = useComplianceScore();

  return {
    trends, riskDistribution, departmentBreakdown, violationTypes, complianceScore,
    isLoading: trends.isLoading || riskDistribution.isLoading || departmentBreakdown.isLoading || violationTypes.isLoading || complianceScore.isLoading,
    error: trends.error || riskDistribution.error || departmentBreakdown.error || violationTypes.error || complianceScore.error,
  };
}
