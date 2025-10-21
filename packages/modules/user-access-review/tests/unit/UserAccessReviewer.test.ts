/**
 * Comprehensive Unit Tests for UserAccessReviewer
 */

import { UserAccessReviewer } from '../../src/UserAccessReviewer';
import { IPSConnector, RuleEngine } from '@sap-framework/core';
import { UserAccess, SoDViolation, AnalysisResult, ModuleConfig } from '../../src/types';
import { STANDARD_SOD_RULES } from '../../src/rules/sodRules';

// Mock dependencies
jest.mock('@sap-framework/core', () => ({
  IPSConnector: jest.fn(),
  RuleEngine: jest.fn().mockImplementation(() => ({
    evaluate: jest.fn()
  }))
}));

describe('UserAccessReviewer', () => {
  let mockIpsConnector: jest.Mocked<IPSConnector>;
  let mockRuleEngine: jest.Mocked<RuleEngine>;
  let reviewer: UserAccessReviewer;
  let mockUsers: any[];
  let mockViolations: any[];

  beforeEach(() => {
    // Create mock IPS connector
    mockIpsConnector = {
      getUsers: jest.fn(),
      getUserGroupMemberships: jest.fn(),
    } as any;

    // Create mock users
    mockUsers = [
      {
        id: 'USER001',
        userName: 'john.doe',
        emails: [{ value: 'john.doe@company.com' }],
        active: true,
        groups: [
          { displayName: 'Purchase_Requester' },
          { displayName: 'Purchase_Approver' }  // SoD conflict
        ]
      },
      {
        id: 'USER002',
        userName: 'jane.smith',
        emails: [{ value: 'jane.smith@company.com' }],
        active: true,
        groups: [
          { displayName: 'Invoice_Processor' }
        ]
      },
      {
        id: 'USER003',
        userName: 'bob.wilson',
        emails: [{ value: 'bob.wilson@company.com' }],
        active: false,
        groups: [
          { displayName: 'Payment_Creator' },
          { displayName: 'Payment_Approver' }  // SoD conflict
        ]
      }
    ];

    // Mock framework violations
    mockViolations = [
      {
        id: 'VIO-001',
        rule: {
          id: 'SOD-PROC-001',
          name: 'Purchase Request vs Approval',
          description: 'User cannot both create and approve purchase requests'
        },
        data: {
          userId: 'USER001',
          user: {
            userName: 'john.doe',
            department: 'Finance'
          },
          conflictingRoles: ['Purchase_Requester', 'Purchase_Approver']
        },
        risk: {
          level: 'CRITICAL',
          score: 95
        },
        timestamp: new Date('2024-01-15T10:00:00Z')
      }
    ];

    mockIpsConnector.getUsers.mockResolvedValue(mockUsers);
    mockIpsConnector.getUserGroupMemberships.mockResolvedValue([]);

    // Create reviewer
    reviewer = new UserAccessReviewer(mockIpsConnector);

    // Setup rule engine mock after reviewer creation
    mockRuleEngine = (reviewer as any).ruleEngine;
    mockRuleEngine.evaluate.mockResolvedValue(mockViolations);
  });

  describe('Constructor', () => {
    it('should create reviewer with IPS connector', () => {
      expect(reviewer).toBeInstanceOf(UserAccessReviewer);
    });

    it('should initialize with default config', () => {
      const stats = reviewer.getStats();
      expect(stats.configuration).toBeDefined();
      expect(stats.configuration.dataSource.type).toBe('IPS');
      expect(stats.configuration.analysis.includeInactiveUsers).toBe(false);
    });

    it('should accept custom config', () => {
      const customConfig: Partial<ModuleConfig> = {
        analysis: {
          includeInactiveUsers: true,
          minimumRiskScore: 50,
          customRules: []
        }
      };

      const customReviewer = new UserAccessReviewer(mockIpsConnector, customConfig);
      const stats = customReviewer.getStats();

      expect(stats.configuration.analysis.includeInactiveUsers).toBe(true);
      expect(stats.configuration.analysis.minimumRiskScore).toBe(50);
    });

    it('should merge custom config with defaults', () => {
      const customConfig: Partial<ModuleConfig> = {
        notifications: {
          enabled: false,
          recipients: ['admin@company.com'],
          onlyForCritical: false
        }
      };

      const customReviewer = new UserAccessReviewer(mockIpsConnector, customConfig);
      const stats = customReviewer.getStats();

      expect(stats.configuration.notifications.enabled).toBe(false);
      expect(stats.configuration.notifications.recipients).toEqual(['admin@company.com']);
      expect(stats.configuration.dataSource.type).toBe('IPS'); // Default should still be set
    });
  });

  describe('analyze()', () => {
    it('should run complete analysis successfully', async () => {
      const result = await reviewer.analyze();

      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.violations).toBeInstanceOf(Array);
      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.generatedAt).toBeInstanceOf(Date);
    });

    it('should fetch users from IPS', async () => {
      await reviewer.analyze();

      expect(mockIpsConnector.getUsers).toHaveBeenCalledWith({
        attributes: ['id', 'userName', 'emails', 'active', 'groups'],
        count: 1000
      });
    });

    it('should exclude inactive users by default', async () => {
      await reviewer.analyze();

      // Should process only 2 active users (USER001, USER002)
      expect(mockRuleEngine.evaluate).toHaveBeenCalled();
      const users = mockRuleEngine.evaluate.mock.calls[0][0];
      expect(users.length).toBe(2);
      expect(users.every((u: UserAccess) => u.isActive)).toBe(true);
    });

    it('should include inactive users when configured', async () => {
      const config: Partial<ModuleConfig> = {
        analysis: {
          includeInactiveUsers: true,
          minimumRiskScore: 0,
          customRules: []
        }
      };

      const customReviewer = new UserAccessReviewer(mockIpsConnector, config);
      (customReviewer as any).ruleEngine = mockRuleEngine;

      await customReviewer.analyze();

      const users = mockRuleEngine.evaluate.mock.calls[0][0];
      expect(users.length).toBe(3); // All users including inactive
    });

    it('should convert IPS users to UserAccess format', async () => {
      await reviewer.analyze();

      const users = mockRuleEngine.evaluate.mock.calls[0][0];
      expect(users[0]).toMatchObject({
        userId: 'USER001',
        userName: 'john.doe',
        email: 'john.doe@company.com',
        roles: ['Purchase_Requester', 'Purchase_Approver'],
        isActive: true
      });
    });

    it('should handle users without groups', async () => {
      mockUsers[1].groups = [];
      mockIpsConnector.getUserGroupMemberships.mockResolvedValue([
        { displayName: 'Test_Role' }
      ]);

      await reviewer.analyze();

      expect(mockIpsConnector.getUserGroupMemberships).toHaveBeenCalledWith('USER002');
    });

    it('should handle users with string groups', async () => {
      mockUsers[0].groups = ['Role1', 'Role2'];

      await reviewer.analyze();

      const users = mockRuleEngine.evaluate.mock.calls[0][0];
      expect(users[0].roles).toEqual(['Role1', 'Role2']);
    });

    it('should process users in batches', async () => {
      // Create 100 users to test batching (batch size is 50)
      const manyUsers = Array.from({ length: 100 }, (_, i) => ({
        id: `USER${i}`,
        userName: `user${i}`,
        emails: [{ value: `user${i}@company.com` }],
        active: true,
        groups: [{ displayName: 'Test_Role' }]
      }));

      mockIpsConnector.getUsers.mockResolvedValue(manyUsers);

      await reviewer.analyze();

      const users = mockRuleEngine.evaluate.mock.calls[0][0];
      expect(users.length).toBe(100);
    });

    it('should load standard SoD rules', async () => {
      await reviewer.analyze();

      const rules = mockRuleEngine.evaluate.mock.calls[0][1];
      expect(rules.length).toBeGreaterThan(0);
      expect(rules[0]).toHaveProperty('id');
      expect(rules[0]).toHaveProperty('name');
      expect(rules[0]).toHaveProperty('pattern');
    });

    it('should include custom rules when provided', async () => {
      const customRule = {
        id: 'CUSTOM-001',
        name: 'Custom SoD Rule',
        description: 'Custom conflict',
        conflictingRoles: ['Role_A', 'Role_B'],
        requiresAll: true,
        riskLevel: 'HIGH' as const,
        riskScore: 80,
        category: 'OPERATIONS' as const,
        mitigationStrategies: ['Implement review']
      };

      const config: Partial<ModuleConfig> = {
        analysis: {
          includeInactiveUsers: false,
          minimumRiskScore: 0,
          customRules: [customRule]
        }
      };

      const customReviewer = new UserAccessReviewer(mockIpsConnector, config);
      (customReviewer as any).ruleEngine = mockRuleEngine;

      await customReviewer.analyze();

      const rules = mockRuleEngine.evaluate.mock.calls[0][1];
      expect(rules.some((r: any) => r.id === 'CUSTOM-001')).toBe(true);
    });

    it('should filter rules by minimum risk score', async () => {
      const config: Partial<ModuleConfig> = {
        analysis: {
          includeInactiveUsers: false,
          minimumRiskScore: 80,
          customRules: []
        }
      };

      const customReviewer = new UserAccessReviewer(mockIpsConnector, config);
      (customReviewer as any).ruleEngine = mockRuleEngine;

      await customReviewer.analyze();

      const rules = mockRuleEngine.evaluate.mock.calls[0][1];
      expect(rules.every((r: any) => r.risk.score >= 80)).toBe(true);
    });

    it('should convert framework violations to SoD violations', async () => {
      const result = await reviewer.analyze();

      expect(result.violations[0]).toMatchObject({
        id: 'VIO-001',
        userId: 'USER001',
        userName: 'john.doe',
        conflictingRoles: ['Purchase_Requester', 'Purchase_Approver'],
        riskLevel: 'CRITICAL',
        riskScore: 95,
        ruleName: 'Purchase Request vs Approval',
        status: 'DETECTED'
      });
    });

    it('should calculate summary statistics', async () => {
      const result = await reviewer.analyze();

      expect(result.summary).toMatchObject({
        totalUsers: 2, // Only active users
        usersWithViolations: 1,
        totalViolations: 1,
        criticalViolations: 1,
        highViolations: 0,
        mediumViolations: 0,
        lowViolations: 0
      });
    });

    it('should generate recommendations based on violations', async () => {
      const result = await reviewer.analyze();

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.some(r => r.includes('CRITICAL'))).toBe(true);
    });

    it('should send notifications when enabled', async () => {
      const config: Partial<ModuleConfig> = {
        notifications: {
          enabled: true,
          recipients: ['admin@company.com'],
          onlyForCritical: false
        }
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const customReviewer = new UserAccessReviewer(mockIpsConnector, config);
      (customReviewer as any).ruleEngine = mockRuleEngine;

      await customReviewer.analyze();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Sending notifications'),
        expect.anything()
      );

      consoleSpy.mockRestore();
    });

    it('should skip notifications when disabled', async () => {
      const config: Partial<ModuleConfig> = {
        notifications: {
          enabled: false,
          recipients: [],
          onlyForCritical: true
        }
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const customReviewer = new UserAccessReviewer(mockIpsConnector, config);
      (customReviewer as any).ruleEngine = mockRuleEngine;

      await customReviewer.analyze();

      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Sending notifications'),
        expect.anything()
      );

      consoleSpy.mockRestore();
    });

    it('should skip notifications when onlyForCritical and no critical violations', async () => {
      mockRuleEngine.evaluate.mockResolvedValue([]);

      const config: Partial<ModuleConfig> = {
        notifications: {
          enabled: true,
          recipients: ['admin@company.com'],
          onlyForCritical: true
        }
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const customReviewer = new UserAccessReviewer(mockIpsConnector, config);
      (customReviewer as any).ruleEngine = mockRuleEngine;

      await customReviewer.analyze();

      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Sending notifications'),
        expect.anything()
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Violation Conversion', () => {
    it('should include mitigation actions from rule definition', async () => {
      const result = await reviewer.analyze();

      expect(result.violations[0].mitigationActions).toBeDefined();
      expect(Array.isArray(result.violations[0].mitigationActions)).toBe(true);
    });

    it('should set default department when missing', async () => {
      mockViolations[0].data.user = { userName: 'john.doe' };

      const result = await reviewer.analyze();

      expect(result.violations[0].department).toBe('Unknown');
    });

    it('should handle missing userName', async () => {
      mockViolations[0].data.user = {};

      const result = await reviewer.analyze();

      expect(result.violations[0].userName).toBe('USER001'); // Falls back to userId
    });
  });

  describe('Summary Calculations', () => {
    it('should count users with violations correctly', async () => {
      const multipleViolations = [
        ...mockViolations,
        {
          ...mockViolations[0],
          id: 'VIO-002',
          data: {
            ...mockViolations[0].data,
            userId: 'USER001' // Same user, different violation
          }
        },
        {
          ...mockViolations[0],
          id: 'VIO-003',
          data: {
            ...mockViolations[0].data,
            userId: 'USER002' // Different user
          }
        }
      ];

      mockRuleEngine.evaluate.mockResolvedValue(multipleViolations);

      const result = await reviewer.analyze();

      expect(result.summary.usersWithViolations).toBe(2); // USER001 and USER002
      expect(result.summary.totalViolations).toBe(3);
    });

    it('should categorize violations by risk level', async () => {
      const mixedViolations = [
        {
          ...mockViolations[0],
          risk: { level: 'CRITICAL', score: 95 }
        },
        {
          ...mockViolations[0],
          id: 'VIO-002',
          risk: { level: 'HIGH', score: 75 }
        },
        {
          ...mockViolations[0],
          id: 'VIO-003',
          risk: { level: 'MEDIUM', score: 50 }
        },
        {
          ...mockViolations[0],
          id: 'VIO-004',
          risk: { level: 'LOW', score: 25 }
        }
      ];

      mockRuleEngine.evaluate.mockResolvedValue(mixedViolations);

      const result = await reviewer.analyze();

      expect(result.summary.criticalViolations).toBe(1);
      expect(result.summary.highViolations).toBe(1);
      expect(result.summary.mediumViolations).toBe(1);
      expect(result.summary.lowViolations).toBe(1);
    });
  });

  describe('Recommendations', () => {
    it('should recommend immediate action for critical violations', async () => {
      const result = await reviewer.analyze();

      expect(result.recommendations.some(r => r.includes('CRITICAL'))).toBe(true);
      expect(result.recommendations.some(r => r.includes('Immediate remediation'))).toBe(true);
    });

    it('should recommend mitigation for many high violations', async () => {
      const manyHighViolations = Array.from({ length: 15 }, (_, i) => ({
        ...mockViolations[0],
        id: `VIO-${i}`,
        risk: { level: 'HIGH', score: 80 },
        data: {
          ...mockViolations[0].data,
          userId: `USER${i}`
        }
      }));

      mockRuleEngine.evaluate.mockResolvedValue(manyHighViolations);

      const result = await reviewer.analyze();

      expect(result.recommendations.some(r => r.includes('HIGH'))).toBe(true);
      expect(result.recommendations.some(r => r.includes('mitigation'))).toBe(true);
    });

    it('should recommend role redesign for high violation rate', async () => {
      // Create violations for > 10% of users
      const manyViolations = Array.from({ length: 5 }, (_, i) => ({
        ...mockViolations[0],
        id: `VIO-${i}`,
        data: {
          ...mockViolations[0].data,
          userId: `USER${i}`
        }
      }));

      // With only 2 active users and 5 violations, rate is > 10%
      mockRuleEngine.evaluate.mockResolvedValue(manyViolations);

      const result = await reviewer.analyze();

      expect(result.recommendations.some(r => r.includes('role redesign'))).toBe(true);
    });

    it('should provide no critical recommendations when violations are low', async () => {
      mockRuleEngine.evaluate.mockResolvedValue([]);

      const result = await reviewer.analyze();

      expect(result.recommendations.every(r => !r.includes('CRITICAL'))).toBe(true);
    });
  });

  describe('getStats()', () => {
    it('should return module statistics', () => {
      const stats = reviewer.getStats();

      expect(stats.module).toBe('User Access Review');
      expect(stats.version).toBe('1.0.0');
      expect(stats.rulesLoaded).toBeGreaterThan(0);
      expect(stats.configuration).toBeDefined();
    });

    it('should include custom rules in count', () => {
      const customRules = [
        {
          id: 'CUSTOM-001',
          name: 'Custom Rule',
          description: 'Custom',
          conflictingRoles: ['A', 'B'],
          requiresAll: true,
          riskLevel: 'HIGH' as const,
          riskScore: 80,
          category: 'OPERATIONS' as const,
          mitigationStrategies: []
        }
      ];

      const config: Partial<ModuleConfig> = {
        analysis: {
          includeInactiveUsers: false,
          minimumRiskScore: 0,
          customRules
        }
      };

      const customReviewer = new UserAccessReviewer(mockIpsConnector, config);
      const stats = customReviewer.getStats();

      expect(stats.rulesLoaded).toBe(STANDARD_SOD_RULES.length + 1);
    });
  });

  describe('Error Handling', () => {
    it('should handle IPS connector errors', async () => {
      mockIpsConnector.getUsers.mockRejectedValue(new Error('IPS connection failed'));

      await expect(reviewer.analyze()).rejects.toThrow('IPS connection failed');
    });

    it('should handle rule engine errors', async () => {
      mockRuleEngine.evaluate.mockRejectedValue(new Error('Rule evaluation failed'));

      await expect(reviewer.analyze()).rejects.toThrow('Rule evaluation failed');
    });

    it('should handle users with missing emails', async () => {
      mockUsers[0].emails = [];

      await reviewer.analyze();

      const users = mockRuleEngine.evaluate.mock.calls[0][0];
      expect(users[0].email).toBeUndefined();
    });

    it('should handle users with null groups', async () => {
      mockUsers[0].groups = null;
      mockIpsConnector.getUserGroupMemberships.mockResolvedValue([
        { displayName: 'Fallback_Role' }
      ]);

      await reviewer.analyze();

      expect(mockIpsConnector.getUserGroupMemberships).toHaveBeenCalled();
    });
  });

  describe('Rule Conversion', () => {
    it('should convert SoD rules to framework format', async () => {
      await reviewer.analyze();

      const rules = mockRuleEngine.evaluate.mock.calls[0][1];
      expect(rules[0]).toHaveProperty('id');
      expect(rules[0]).toHaveProperty('name');
      expect(rules[0]).toHaveProperty('description');
      expect(rules[0]).toHaveProperty('pattern');
      expect(rules[0].pattern.type).toBe('SOD');
      expect(rules[0]).toHaveProperty('risk');
      expect(rules[0]).toHaveProperty('metadata');
    });

    it('should calculate effectiveness from risk score', async () => {
      await reviewer.analyze();

      const rules = mockRuleEngine.evaluate.mock.calls[0][1];
      rules.forEach((rule: any) => {
        expect(rule.metadata.effectiveness).toBeGreaterThanOrEqual(0);
        expect(rule.metadata.effectiveness).toBeLessThanOrEqual(1);
      });
    });

    it('should include last updated timestamp', async () => {
      await reviewer.analyze();

      const rules = mockRuleEngine.evaluate.mock.calls[0][1];
      expect(rules[0].metadata.lastUpdated).toBeInstanceOf(Date);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty user list', async () => {
      mockIpsConnector.getUsers.mockResolvedValue([]);

      const result = await reviewer.analyze();

      expect(result.summary.totalUsers).toBe(0);
      expect(result.violations).toEqual([]);
    });

    it('should handle no violations detected', async () => {
      mockRuleEngine.evaluate.mockResolvedValue([]);

      const result = await reviewer.analyze();

      expect(result.summary.totalViolations).toBe(0);
      expect(result.summary.usersWithViolations).toBe(0);
    });

    it('should handle users with empty role lists', async () => {
      mockUsers.forEach(u => u.groups = []);

      await reviewer.analyze();

      const users = mockRuleEngine.evaluate.mock.calls[0][0];
      users.forEach((u: UserAccess) => {
        expect(u.roles).toEqual([]);
      });
    });
  });
});
