"use strict";
/**
 * Standard Segregation of Duties Rules
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.STANDARD_SOD_RULES = void 0;
exports.getRulesByCategory = getRulesByCategory;
exports.getRulesByRiskLevel = getRulesByRiskLevel;
exports.getCriticalRules = getCriticalRules;
exports.STANDARD_SOD_RULES = [
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
function getRulesByCategory(category) {
    return exports.STANDARD_SOD_RULES.filter(rule => rule.category === category);
}
function getRulesByRiskLevel(riskLevel) {
    return exports.STANDARD_SOD_RULES.filter(rule => rule.riskLevel === riskLevel);
}
function getCriticalRules() {
    return getRulesByRiskLevel('CRITICAL');
}
//# sourceMappingURL=sodRules.js.map