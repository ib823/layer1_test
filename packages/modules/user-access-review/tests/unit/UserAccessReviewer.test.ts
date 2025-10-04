import { UserAccessReviewer } from '../../src/UserAccessReviewer';
import { IPSConnector } from '@sap-framework/core';
import { RuleEngine } from '@sap-framework/services';
import { STANDARD_SOD_RULES } from '../../src/rules/sodRules';

// Mock dependencies
jest.mock('@sap-framework/core');
jest.mock('@sap-framework/services');

describe('UserAccessReviewer', () => {
  let reviewer: UserAccessReviewer;
  let mockIPSConnector: jest.Mocked<IPSConnector>;

  beforeEach(() => {
    // Create mock IPS connector
    mockIPSConnector = {
      getUsers: jest.fn(),
      getUserGroupMemberships: jest.fn(),
    } as any;

    // Create reviewer instance
    reviewer = new UserAccessReviewer(mockIPSConnector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      const stats = reviewer.getStats();

      expect(stats.module).toBe('User Access Review');
      expect(stats.version).toBe('1.0.0');
      expect(stats.rulesLoaded).toBe(STANDARD_SOD_RULES.length);
    });

    it('should accept custom configuration', () => {
      const customReviewer = new UserAccessReviewer(mockIPSConnector, {
        analysis: {
          includeInactiveUsers: true,
          minimumRiskScore: 50,
          customRules: [],
        },
      });

      const stats = customReviewer.getStats();
      expect(stats.configuration.analysis.includeInactiveUsers).toBe(true);
      expect(stats.configuration.analysis.minimumRiskScore).toBe(50);
    });
  });

  describe('getStats', () => {
    it('should return module statistics', () => {
      const stats = reviewer.getStats();

      expect(stats).toHaveProperty('module');
      expect(stats).toHaveProperty('version');
      expect(stats).toHaveProperty('rulesLoaded');
      expect(stats).toHaveProperty('configuration');
      expect(stats.rulesLoaded).toBeGreaterThan(0);
    });

    it('should include custom rules in count', () => {
      const customRules = [
        {
          id: 'CUSTOM-001',
          name: 'Custom Rule',
          description: 'Test custom rule',
          category: 'FINANCIAL' as const,
          conflictingRoles: ['ROLE_A', 'ROLE_B'],
          requiresAll: true,
          riskLevel: 'HIGH' as const,
          riskScore: 80,
          regulatoryReference: 'CUSTOM-REG',
          mitigationStrategies: ['Strategy 1'],
        },
      ];

      const customReviewer = new UserAccessReviewer(mockIPSConnector, {
        analysis: {
          customRules,
          includeInactiveUsers: false,
          minimumRiskScore: 0,
        },
      });

      const stats = customReviewer.getStats();
      expect(stats.rulesLoaded).toBe(STANDARD_SOD_RULES.length + 1);
    });
  });
});
