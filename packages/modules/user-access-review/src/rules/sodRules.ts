import { Rule, SoDPattern } from '@sap-framework/services';

export const SOD_RULES: Rule[] = [
  {
    id: 'SOD-001',
    name: 'Create & Approve Journal Entries',
    description: 'User cannot both create and approve journal entries',
    pattern: {
      type: 'SOD',
      definition: {
        conflictingRoles: ['FI-GL_POSTING_CREATE', 'FI-GL_POSTING_APPROVE'],
        requiresAll: true,
        userIdField: 'userId',
        rolesField: 'roles'
      } as SoDPattern
    },
    risk: {
      level: 'CRITICAL',
      score: 95
    },
    actions: {
      immediate: ['NOTIFY_MANAGER', 'NOTIFY_SECURITY'],
      escalation: ['ESCALATE_TO_AUDIT']
    }
  },
  // Add all 25 rules here...
];