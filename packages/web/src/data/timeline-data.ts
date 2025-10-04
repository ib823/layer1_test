import { TimelineItem } from '@/components/ui/Timeline';

export const mockTimelineData: TimelineItem[] = [
  {
    id: '1',
    timestamp: '2025-01-15 14:30',
    title: 'Critical SoD Violation Detected',
    description: 'User USER001 has conflicting roles: Purchase Order Creator and Payment Approver',
    user: 'System',
    type: 'violation',
    metadata: {
      userId: 'USER001',
      riskLevel: 'CRITICAL',
    },
  },
  {
    id: '2',
    timestamp: '2025-01-15 13:45',
    title: 'Violation Acknowledged',
    description: 'Violation VIO-789 acknowledged by compliance team',
    user: 'Jane Smith',
    type: 'review',
    metadata: {
      violationId: 'VIO-789',
    },
  },
  {
    id: '3',
    timestamp: '2025-01-15 12:20',
    title: 'Access Rights Modified',
    description: 'Removed conflicting role assignment for USER005',
    user: 'Admin',
    type: 'resolution',
    metadata: {
      userId: 'USER005',
      roleRemoved: 'Finance Approver',
    },
  },
  {
    id: '4',
    timestamp: '2025-01-15 11:00',
    title: 'SoD Analysis Completed',
    description: 'Analyzed 1,284 users across 5 business processes',
    user: 'System',
    type: 'system',
    metadata: {
      usersAnalyzed: 1284,
      violationsFound: 45,
    },
  },
  {
    id: '5',
    timestamp: '2025-01-15 09:30',
    title: 'Policy Rules Updated',
    description: 'Added new segregation rule for Vendor Master Management',
    user: 'John Doe',
    type: 'update',
    metadata: {
      ruleId: 'RULE-045',
      ruleName: 'Vendor Master SoD',
    },
  },
  {
    id: '6',
    timestamp: '2025-01-14 16:15',
    title: 'High Risk Violation Resolved',
    description: 'Violation VIO-745 marked as resolved after role reassignment',
    user: 'Sarah Johnson',
    type: 'resolution',
    metadata: {
      violationId: 'VIO-745',
    },
  },
  {
    id: '7',
    timestamp: '2025-01-14 14:00',
    title: 'Manual Review Initiated',
    description: 'Started review process for 12 medium-risk violations',
    user: 'Mike Wilson',
    type: 'review',
    metadata: {
      violationCount: 12,
    },
  },
  {
    id: '8',
    timestamp: '2025-01-14 10:30',
    title: 'New User Role Assignment',
    description: 'USER123 assigned to Finance Department with standard roles',
    user: 'System',
    type: 'system',
    metadata: {
      userId: 'USER123',
      department: 'Finance',
    },
  },
];