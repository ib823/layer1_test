import {
  STANDARD_SOD_RULES,
  getRulesByCategory,
  getRulesByRiskLevel,
  getCriticalRules,
} from '../../src/rules/sodRules';

describe('SoD Rules', () => {
  describe('STANDARD_SOD_RULES', () => {
    it('should contain rule definitions', () => {
      expect(STANDARD_SOD_RULES).toBeDefined();
      expect(STANDARD_SOD_RULES.length).toBeGreaterThan(0);
    });

    it('should have valid rule structure', () => {
      STANDARD_SOD_RULES.forEach(rule => {
        expect(rule).toHaveProperty('id');
        expect(rule).toHaveProperty('name');
        expect(rule).toHaveProperty('description');
        expect(rule).toHaveProperty('conflictingRoles');
        expect(rule).toHaveProperty('requiresAll');
        expect(rule).toHaveProperty('riskLevel');
        expect(rule).toHaveProperty('riskScore');
        expect(rule).toHaveProperty('category');
        expect(rule).toHaveProperty('regulatoryReference');
        expect(rule).toHaveProperty('mitigationStrategies');
      });
    });

    it('should have unique rule IDs', () => {
      const ids = STANDARD_SOD_RULES.map(rule => rule.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have valid risk levels', () => {
      const validRiskLevels = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
      STANDARD_SOD_RULES.forEach(rule => {
        expect(validRiskLevels).toContain(rule.riskLevel);
      });
    });

    it('should have valid categories', () => {
      const validCategories = [
        'FINANCIAL',
        'SECURITY',
        'PROCUREMENT',
        'HR',
        'OPERATIONS',
      ];
      STANDARD_SOD_RULES.forEach(rule => {
        expect(validCategories).toContain(rule.category);
      });
    });

    it('should have at least 2 conflicting roles', () => {
      STANDARD_SOD_RULES.forEach(rule => {
        expect(rule.conflictingRoles.length).toBeGreaterThanOrEqual(2);
      });
    });

    it('should have risk scores between 0 and 100', () => {
      STANDARD_SOD_RULES.forEach(rule => {
        expect(rule.riskScore).toBeGreaterThanOrEqual(0);
        expect(rule.riskScore).toBeLessThanOrEqual(100);
      });
    });

    it('should have mitigation strategies', () => {
      STANDARD_SOD_RULES.forEach(rule => {
        expect(rule.mitigationStrategies.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getRulesByCategory', () => {
    it('should return rules for FINANCIAL category', () => {
      const financialRules = getRulesByCategory('FINANCIAL');
      expect(financialRules.length).toBeGreaterThan(0);
      financialRules.forEach(rule => {
        expect(rule.category).toBe('FINANCIAL');
      });
    });

    it('should return rules for SECURITY category', () => {
      const securityRules = getRulesByCategory('SECURITY');
      expect(securityRules.length).toBeGreaterThan(0);
      securityRules.forEach(rule => {
        expect(rule.category).toBe('SECURITY');
      });
    });

    it('should return empty array for category with no rules', () => {
      const rules = getRulesByCategory('OPERATIONS');
      expect(Array.isArray(rules)).toBe(true);
    });
  });

  describe('getRulesByRiskLevel', () => {
    it('should return CRITICAL risk level rules', () => {
      const criticalRules = getRulesByRiskLevel('CRITICAL');
      expect(criticalRules.length).toBeGreaterThan(0);
      criticalRules.forEach(rule => {
        expect(rule.riskLevel).toBe('CRITICAL');
      });
    });

    it('should return HIGH risk level rules', () => {
      const highRules = getRulesByRiskLevel('HIGH');
      highRules.forEach(rule => {
        expect(rule.riskLevel).toBe('HIGH');
      });
    });

    it('should return MEDIUM risk level rules', () => {
      const mediumRules = getRulesByRiskLevel('MEDIUM');
      mediumRules.forEach(rule => {
        expect(rule.riskLevel).toBe('MEDIUM');
      });
    });

    it('should return LOW risk level rules', () => {
      const lowRules = getRulesByRiskLevel('LOW');
      lowRules.forEach(rule => {
        expect(rule.riskLevel).toBe('LOW');
      });
    });
  });

  describe('getCriticalRules', () => {
    it('should return only CRITICAL rules', () => {
      const criticalRules = getCriticalRules();
      expect(criticalRules.length).toBeGreaterThan(0);
      criticalRules.forEach(rule => {
        expect(rule.riskLevel).toBe('CRITICAL');
      });
    });

    it('should match getRulesByRiskLevel("CRITICAL")', () => {
      const criticalRules1 = getCriticalRules();
      const criticalRules2 = getRulesByRiskLevel('CRITICAL');
      expect(criticalRules1).toEqual(criticalRules2);
    });
  });

  describe('Risk score alignment', () => {
    it('should have CRITICAL rules with risk score >= 90', () => {
      const criticalRules = getRulesByRiskLevel('CRITICAL');
      criticalRules.forEach(rule => {
        expect(rule.riskScore).toBeGreaterThanOrEqual(90);
      });
    });

    it('should have HIGH rules with risk score between 70-89', () => {
      const highRules = getRulesByRiskLevel('HIGH');
      highRules.forEach(rule => {
        expect(rule.riskScore).toBeGreaterThanOrEqual(70);
        expect(rule.riskScore).toBeLessThan(90);
      });
    });
  });
});
