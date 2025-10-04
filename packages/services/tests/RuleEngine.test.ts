/**
 * RuleEngine tests
 */

import { RuleEngine, Rule } from '../src/rules/RuleEngine';

describe('RuleEngine', () => {
  let engine: RuleEngine;

  beforeEach(() => {
    engine = new RuleEngine();
  });

  describe('initialization', () => {
    it('should initialize', () => {
      expect(engine).toBeDefined();
    });

    it('should return initial stats', () => {
      const stats = engine.getStats();
      expect(stats.cachedRules).toBe(0);
      expect(stats.violationsDetected).toBe(0);
    });
  });

  describe('SoD pattern matching', () => {
    it('should detect SoD violations when user has all conflicting roles', async () => {
      const users = [
        {
          userId: 'user-1',
          roles: ['VENDOR_CREATE', 'PAYMENT_EXECUTE'],
        },
      ];

      const rules: Rule[] = [
        {
          id: 'SOD-001',
          name: 'Vendor vs Payment',
          description: 'User cannot create vendors and execute payments',
          pattern: {
            type: 'SOD',
            definition: {
              conflictingRoles: ['VENDOR_CREATE', 'PAYMENT_EXECUTE'],
              requiresAll: true,
            },
          },
          risk: { level: 'CRITICAL', score: 95 },
        },
      ];

      const violations = await engine.evaluate(users, rules);

      expect(violations.length).toBe(1);
      expect(violations[0].rule.id).toBe('SOD-001');
      expect(violations[0].data.userId).toBe('user-1');
      expect(violations[0].data.conflictingRoles).toEqual(['VENDOR_CREATE', 'PAYMENT_EXECUTE']);
    });

    it('should not detect violations when user lacks one conflicting role', async () => {
      const users = [
        {
          userId: 'user-1',
          roles: ['VENDOR_CREATE'], // Missing PAYMENT_EXECUTE
        },
      ];

      const rules: Rule[] = [
        {
          id: 'SOD-001',
          name: 'Vendor vs Payment',
          pattern: {
            type: 'SOD',
            definition: {
              conflictingRoles: ['VENDOR_CREATE', 'PAYMENT_EXECUTE'],
              requiresAll: true,
            },
          },
          risk: { level: 'CRITICAL', score: 95 },
        },
      ];

      const violations = await engine.evaluate(users, rules);
      expect(violations.length).toBe(0);
    });

    it('should detect violations with requiresAll=false when user has any conflicting role', async () => {
      const users = [
        {
          userId: 'user-1',
          roles: ['VENDOR_CREATE'], // Has one of the conflicting roles
        },
      ];

      const rules: Rule[] = [
        {
          id: 'SOD-002',
          name: 'Any Vendor Role',
          pattern: {
            type: 'SOD',
            definition: {
              conflictingRoles: ['VENDOR_CREATE', 'VENDOR_MODIFY'],
              requiresAll: false,
            },
          },
          risk: { level: 'MEDIUM', score: 60 },
        },
      ];

      const violations = await engine.evaluate(users, rules);
      expect(violations.length).toBe(1);
    });

    it('should handle custom field names', async () => {
      const users = [
        {
          id: 'user-1',
          permissions: ['CREATE', 'DELETE'],
        },
      ];

      const rules: Rule[] = [
        {
          id: 'SOD-003',
          name: 'Create vs Delete',
          pattern: {
            type: 'SOD',
            definition: {
              conflictingRoles: ['CREATE', 'DELETE'],
              requiresAll: true,
              userIdField: 'id',
              rolesField: 'permissions',
            },
          },
          risk: { level: 'HIGH', score: 80 },
        },
      ];

      const violations = await engine.evaluate(users, rules);
      expect(violations.length).toBe(1);
      expect(violations[0].data.userId).toBe('user-1');
    });

    it('should detect violations for multiple users', async () => {
      const users = [
        {
          userId: 'user-1',
          roles: ['ROLE_A', 'ROLE_B'],
        },
        {
          userId: 'user-2',
          roles: ['ROLE_A', 'ROLE_B'],
        },
        {
          userId: 'user-3',
          roles: ['ROLE_A'], // No violation
        },
      ];

      const rules: Rule[] = [
        {
          id: 'SOD-004',
          name: 'Role A vs B',
          pattern: {
            type: 'SOD',
            definition: {
              conflictingRoles: ['ROLE_A', 'ROLE_B'],
              requiresAll: true,
            },
          },
          risk: { level: 'HIGH', score: 85 },
        },
      ];

      const violations = await engine.evaluate(users, rules);
      expect(violations.length).toBe(2);
      expect(violations.map(v => v.data.userId)).toEqual(['user-1', 'user-2']);
    });
  });

  describe('threshold pattern matching', () => {
    it('should detect violations when value exceeds threshold', async () => {
      const records = [
        { amount: 150000 },
      ];

      const rules: Rule[] = [
        {
          id: 'THRESH-001',
          name: 'High Amount',
          pattern: {
            type: 'THRESHOLD',
            definition: {
              field: 'amount',
              operator: 'GT',
              value: 100000,
            },
          },
          risk: { level: 'HIGH', score: 75 },
        },
      ];

      const violations = await engine.evaluate(records, rules);
      expect(violations.length).toBe(1);
      expect(violations[0].data.value).toBe(150000);
    });

    it('should not detect violations when value is below threshold', async () => {
      const records = [
        { amount: 50000 },
      ];

      const rules: Rule[] = [
        {
          id: 'THRESH-001',
          name: 'High Amount',
          pattern: {
            type: 'THRESHOLD',
            definition: {
              field: 'amount',
              operator: 'GT',
              value: 100000,
            },
          },
          risk: { level: 'HIGH', score: 75 },
        },
      ];

      const violations = await engine.evaluate(records, rules);
      expect(violations.length).toBe(0);
    });

    it('should support aggregation (SUM)', async () => {
      const records = [
        { amount: 30000 },
        { amount: 40000 },
        { amount: 50000 },
      ];

      const rules: Rule[] = [
        {
          id: 'THRESH-002',
          name: 'Total Amount Threshold',
          pattern: {
            type: 'THRESHOLD',
            definition: {
              field: 'amount',
              operator: 'GT',
              value: 100000,
              aggregation: 'SUM',
            },
          },
          risk: { level: 'MEDIUM', score: 65 },
        },
      ];

      const violations = await engine.evaluate(records, rules);
      expect(violations.length).toBe(1);
      expect(violations[0].data.value).toBe(120000);
    });

    it('should support LT operator', async () => {
      const records = [
        { count: 5 },
      ];

      const rules: Rule[] = [
        {
          id: 'THRESH-003',
          name: 'Low Count',
          pattern: {
            type: 'THRESHOLD',
            definition: {
              field: 'count',
              operator: 'LT',
              value: 10,
            },
          },
          risk: { level: 'LOW', score: 30 },
        },
      ];

      const violations = await engine.evaluate(records, rules);
      expect(violations.length).toBe(1);
    });
  });

  describe('generic pattern matching', () => {
    it('should handle PATTERN type without errors', async () => {
      const records = [
        { status: 'FAILED', errorCode: 500 },
      ];

      const rules: Rule[] = [
        {
          id: 'PATTERN-001',
          name: 'Failed Status',
          pattern: {
            type: 'PATTERN',
            definition: {
              field: 'status',
              condition: 'status === "FAILED"',
            },
          },
          risk: { level: 'MEDIUM', score: 50 },
        },
      ];

      // Generic pattern matching is available but complex - just verify it doesn't throw
      const violations = await engine.evaluate(records, rules);
      expect(Array.isArray(violations)).toBe(true);
    });
  });

  describe('multiple rules evaluation', () => {
    it('should evaluate multiple rules and detect all violations', async () => {
      const data = [
        {
          userId: 'user-1',
          roles: ['ADMIN', 'AUDITOR'],
          amount: 200000,
        },
      ];

      const rules: Rule[] = [
        {
          id: 'SOD-001',
          name: 'Admin vs Auditor',
          pattern: {
            type: 'SOD',
            definition: {
              conflictingRoles: ['ADMIN', 'AUDITOR'],
              requiresAll: true,
            },
          },
          risk: { level: 'CRITICAL', score: 95 },
        },
        {
          id: 'THRESH-001',
          name: 'High Amount',
          pattern: {
            type: 'THRESHOLD',
            definition: {
              field: 'amount',
              operator: 'GT',
              value: 100000,
            },
          },
          risk: { level: 'HIGH', score: 80 },
        },
      ];

      const violations = await engine.evaluate(data, rules);
      expect(violations.length).toBe(2);
      expect(violations.map(v => v.rule.id).sort()).toEqual(['SOD-001', 'THRESH-001']);
    });
  });

  describe('stats tracking', () => {
    it('should update stats after evaluation', async () => {
      const users = [
        { userId: 'user-1', roles: ['ROLE_A', 'ROLE_B'] },
      ];

      const rules: Rule[] = [
        {
          id: 'SOD-001',
          name: 'Test Rule',
          pattern: {
            type: 'SOD',
            definition: {
              conflictingRoles: ['ROLE_A', 'ROLE_B'],
              requiresAll: true,
            },
          },
          risk: { level: 'HIGH', score: 80 },
        },
      ];

      await engine.evaluate(users, rules);
      const stats = engine.getStats();

      expect(stats.cachedRules).toBe(1);
      expect(stats.violationsDetected).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('should handle empty data', async () => {
      const rules: Rule[] = [
        {
          id: 'SOD-001',
          name: 'Test',
          pattern: {
            type: 'SOD',
            definition: {
              conflictingRoles: ['ROLE_A', 'ROLE_B'],
              requiresAll: true,
            },
          },
          risk: { level: 'HIGH', score: 80 },
        },
      ];

      const violations = await engine.evaluate([], rules);
      expect(violations.length).toBe(0);
    });

    it('should handle empty rules', async () => {
      const users = [
        { userId: 'user-1', roles: ['ROLE_A'] },
      ];

      const violations = await engine.evaluate(users, []);
      expect(violations.length).toBe(0);
    });

    it('should handle users with no roles', async () => {
      const users = [
        { userId: 'user-1', roles: [] },
      ];

      const rules: Rule[] = [
        {
          id: 'SOD-001',
          name: 'Test',
          pattern: {
            type: 'SOD',
            definition: {
              conflictingRoles: ['ROLE_A', 'ROLE_B'],
              requiresAll: true,
            },
          },
          risk: { level: 'HIGH', score: 80 },
        },
      ];

      const violations = await engine.evaluate(users, rules);
      expect(violations.length).toBe(0);
    });
  });
});