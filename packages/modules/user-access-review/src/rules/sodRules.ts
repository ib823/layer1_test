/**
 * Standard Segregation of Duties Rules
 */

import { SoDRuleDefinition } from '../types';

export const STANDARD_SOD_RULES: SoDRuleDefinition[] = [
  {
    id: 'SOD-FIN-001',
    name: 'Vendor Master Creation vs Payment Execution',
    description: 'User cannot both create vendors and execute payments',
    conflictingRoles: ['VENDOR_CREATE', 'PAYMENT_EXECUTE'],
    requiresAll: true,
    riskLevel: 'CRITICAL',
    riskScore: 95,
    category: 'FINANCIAL',
    regulatoryReference: 'SOX Section 404',
    mitigationStrategies: [
      'Implement dual authorization for vendor creation',
      'Route high-value payments through approval workflow'
    ]
  },
  {
    id: 'SOD-FIN-002',
    name: 'Journal Entry Creation vs Approval',
    description: 'User cannot both create and approve journal entries',
    conflictingRoles: ['GL_JOURNAL_CREATE', 'GL_JOURNAL_APPROVE'],
    requiresAll: true,
    riskLevel: 'CRITICAL',
    riskScore: 98,
    category: 'FINANCIAL',
    regulatoryReference: 'SOX Section 404',
    mitigationStrategies: [
      'Enforce maker-checker process',
      'Implement journal entry approval limits'
    ]
  },
  {
    id: 'SOD-SEC-001',
    name: 'User Creation vs Role Assignment',
    description: 'User cannot both create users and assign roles',
    conflictingRoles: ['USER_CREATE', 'ROLE_ASSIGN'],
    requiresAll: true,
    riskLevel: 'CRITICAL',
    riskScore: 94,
    category: 'SECURITY',
    regulatoryReference: 'ISO 27001',
    mitigationStrategies: [
      'Implement access request workflow',
      'Separate user provisioning from role assignment'
    ]
  }
];

export function getRulesByCategory(category: SoDRuleDefinition['category']): SoDRuleDefinition[] {
  return STANDARD_SOD_RULES.filter(rule => rule.category === category);
}

export function getRulesByRiskLevel(riskLevel: SoDRuleDefinition['riskLevel']): SoDRuleDefinition[] {
  return STANDARD_SOD_RULES.filter(rule => rule.riskLevel === riskLevel);
}

export function getCriticalRules(): SoDRuleDefinition[] {
  return getRulesByRiskLevel('CRITICAL');
}