/**
 * Tests for Tolerance Rules Module
 */

import {
  checkTolerance,
  getRulesByField,
  validateAllTolerances,
  STANDARD_TOLERANCE_RULES,
  STRICT_TOLERANCE_RULES,
  RELAXED_TOLERANCE_RULES,
} from '../../src/rules/toleranceRules';
import { ToleranceRule } from '../../src/types';

describe('Tolerance Rules', () => {
  describe('checkTolerance()', () => {
    const percentageRule: ToleranceRule = {
      ruleId: 'TEST-001',
      name: 'Test Percentage Rule',
      field: 'PRICE',
      thresholdType: 'PERCENTAGE',
      thresholdValue: 5.0,
      requiresApproval: true,
      enabled: true,
    };

    const absoluteRule: ToleranceRule = {
      ruleId: 'TEST-002',
      name: 'Test Absolute Rule',
      field: 'PRICE',
      thresholdType: 'ABSOLUTE',
      thresholdValue: 1000,
      requiresApproval: true,
      enabled: true,
    };

    it('should pass when percentage variance is within threshold', () => {
      const result = checkTolerance(100, 104, percentageRule); // 4% variance
      expect(result.exceeded).toBe(false);
      expect(result.variance).toBeCloseTo(4.0);
      expect(result.exceededBy).toBe(0);
    });

    it('should fail when percentage variance exceeds threshold', () => {
      const result = checkTolerance(100, 107, percentageRule); // 7% variance
      expect(result.exceeded).toBe(true);
      expect(result.variance).toBeCloseTo(7.0);
      expect(result.exceededBy).toBeCloseTo(2.0);
    });

    it('should pass when absolute variance is within threshold', () => {
      const result = checkTolerance(10000, 10800, absoluteRule); // 800 absolute difference
      expect(result.exceeded).toBe(false);
      expect(result.variance).toBe(800);
      expect(result.exceededBy).toBe(0);
    });

    it('should fail when absolute variance exceeds threshold', () => {
      const result = checkTolerance(10000, 11500, absoluteRule); // 1500 absolute difference
      expect(result.exceeded).toBe(true);
      expect(result.variance).toBe(1500);
      expect(result.exceededBy).toBe(500);
    });

    it('should handle negative variance correctly', () => {
      const result = checkTolerance(100, 93, percentageRule); // -7% variance (absolute 7%)
      expect(result.exceeded).toBe(true);
      expect(result.variance).toBeCloseTo(7.0);
    });

    it('should handle zero expected value edge case', () => {
      // This would cause division by zero for percentage, implementation should handle gracefully
      const result = checkTolerance(0, 10, percentageRule);
      expect(result.exceeded).toBe(true); // Any variance from 0 should exceed
    });
  });

  describe('getRulesByField()', () => {
    it('should return only rules for specified field', () => {
      const priceRules = getRulesByField(STANDARD_TOLERANCE_RULES, 'PRICE');
      expect(priceRules.length).toBeGreaterThan(0);
      expect(priceRules.every((r) => r.field === 'PRICE')).toBe(true);
    });

    it('should return only enabled rules', () => {
      const rules: ToleranceRule[] = [
        {
          ruleId: 'ENABLED-1',
          name: 'Enabled Rule',
          field: 'PRICE',
          thresholdType: 'PERCENTAGE',
          thresholdValue: 5.0,
          requiresApproval: true,
          enabled: true,
        },
        {
          ruleId: 'DISABLED-1',
          name: 'Disabled Rule',
          field: 'PRICE',
          thresholdType: 'PERCENTAGE',
          thresholdValue: 10.0,
          requiresApproval: true,
          enabled: false,
        },
      ];

      const result = getRulesByField(rules, 'PRICE');
      expect(result.length).toBe(1);
      expect(result[0].ruleId).toBe('ENABLED-1');
    });

    it('should return empty array for field with no rules', () => {
      const customRules: ToleranceRule[] = [
        {
          ruleId: 'PRICE-1',
          name: 'Price Rule',
          field: 'PRICE',
          thresholdType: 'PERCENTAGE',
          thresholdValue: 5.0,
          requiresApproval: true,
          enabled: true,
        },
      ];

      const result = getRulesByField(customRules, 'TAX');
      expect(result.length).toBe(0);
    });
  });

  describe('validateAllTolerances()', () => {
    const mockPO = {
      unitPrice: 100,
      orderedQuantity: 50,
      taxAmount: 500,
      orderedValue: 5500,
    };

    const mockInvoice = {
      invoicedAmount: 5000,
      invoicedQuantity: 50,
      taxAmount: 500,
      totalAmount: 5500,
    };

    it('should pass when all tolerances are within thresholds', () => {
      const result = validateAllTolerances(mockPO, mockInvoice, STANDARD_TOLERANCE_RULES);
      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should detect price tolerance violation', () => {
      const invalidInvoice = {
        ...mockInvoice,
        invoicedAmount: 6000, // Unit price = 120 (20% variance)
      };

      const result = validateAllTolerances(mockPO, invalidInvoice, STANDARD_TOLERANCE_RULES);
      expect(result.valid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations.some((v) => v.rule.field === 'PRICE')).toBe(true);
    });

    it('should detect quantity tolerance violation', () => {
      const invalidInvoice = {
        ...mockInvoice,
        invoicedQuantity: 60, // 20% more than ordered
      };

      const result = validateAllTolerances(mockPO, invalidInvoice, STANDARD_TOLERANCE_RULES);
      expect(result.valid).toBe(false);
      expect(result.violations.some((v) => v.rule.field === 'QUANTITY')).toBe(true);
    });

    it('should detect tax tolerance violation', () => {
      const invalidInvoice = {
        ...mockInvoice,
        taxAmount: 600, // 20% more than expected
      };

      const result = validateAllTolerances(mockPO, invalidInvoice, STANDARD_TOLERANCE_RULES);
      expect(result.valid).toBe(false);
      expect(result.violations.some((v) => v.rule.field === 'TAX')).toBe(true);
    });

    it('should detect total amount tolerance violation', () => {
      const invalidInvoice = {
        ...mockInvoice,
        totalAmount: 6500, // ~18% more than ordered value
      };

      const result = validateAllTolerances(mockPO, invalidInvoice, STANDARD_TOLERANCE_RULES);
      expect(result.valid).toBe(false);
      expect(result.violations.some((v) => v.rule.field === 'TOTAL')).toBe(true);
    });

    it('should detect multiple violations', () => {
      const invalidInvoice = {
        invoicedAmount: 6000, // Price violation
        invoicedQuantity: 60, // Quantity violation
        taxAmount: 600, // Tax violation
        totalAmount: 6600, // Total violation
      };

      const result = validateAllTolerances(mockPO, invalidInvoice, STANDARD_TOLERANCE_RULES);
      expect(result.valid).toBe(false);
      // Should detect violations in price, quantity, tax, and total (at least 3)
      expect(result.violations.length).toBeGreaterThanOrEqual(3);
    });

    it('should respect custom tolerance rules', () => {
      const strictRules: ToleranceRule[] = [
        {
          ruleId: 'STRICT-001',
          name: 'Very Strict Price Rule',
          field: 'PRICE',
          thresholdType: 'PERCENTAGE',
          thresholdValue: 1.0, // Only 1% tolerance
          requiresApproval: true,
          enabled: true,
        },
      ];

      const slightlyOffInvoice = {
        ...mockInvoice,
        invoicedAmount: 5100, // Unit price = 102 (2% variance)
      };

      const result = validateAllTolerances(mockPO, slightlyOffInvoice, strictRules);
      expect(result.valid).toBe(false);
      expect(result.violations[0].rule.ruleId).toBe('STRICT-001');
    });
  });

  describe('Pre-defined Rule Sets', () => {
    it('STANDARD_TOLERANCE_RULES should have appropriate thresholds', () => {
      expect(STANDARD_TOLERANCE_RULES.length).toBeGreaterThan(0);

      const priceRules = STANDARD_TOLERANCE_RULES.filter((r) => r.field === 'PRICE');
      expect(priceRules.length).toBeGreaterThan(0);

      const quantityRules = STANDARD_TOLERANCE_RULES.filter((r) => r.field === 'QUANTITY');
      expect(quantityRules.length).toBeGreaterThan(0);

      const taxRules = STANDARD_TOLERANCE_RULES.filter((r) => r.field === 'TAX');
      expect(taxRules.length).toBeGreaterThan(0);

      const totalRules = STANDARD_TOLERANCE_RULES.filter((r) => r.field === 'TOTAL');
      expect(totalRules.length).toBeGreaterThan(0);
    });

    it('STRICT_TOLERANCE_RULES should have tighter thresholds than standard', () => {
      const standardPrice = STANDARD_TOLERANCE_RULES.find(
        (r) => r.field === 'PRICE' && r.thresholdType === 'PERCENTAGE'
      );
      const strictPrice = STRICT_TOLERANCE_RULES.find(
        (r) => r.field === 'PRICE' && r.thresholdType === 'PERCENTAGE'
      );

      expect(strictPrice).toBeDefined();
      expect(standardPrice).toBeDefined();
      expect(strictPrice!.thresholdValue).toBeLessThan(standardPrice!.thresholdValue);
    });

    it('RELAXED_TOLERANCE_RULES should have looser thresholds than standard', () => {
      const standardPrice = STANDARD_TOLERANCE_RULES.find(
        (r) => r.field === 'PRICE' && r.thresholdType === 'PERCENTAGE'
      );
      const relaxedPrice = RELAXED_TOLERANCE_RULES.find(
        (r) => r.field === 'PRICE' && r.thresholdType === 'PERCENTAGE'
      );

      expect(relaxedPrice).toBeDefined();
      expect(standardPrice).toBeDefined();
      expect(relaxedPrice!.thresholdValue).toBeGreaterThan(standardPrice!.thresholdValue);
    });

    it('all pre-defined rules should have unique IDs', () => {
      const allRules = [
        ...STANDARD_TOLERANCE_RULES,
        ...STRICT_TOLERANCE_RULES,
        ...RELAXED_TOLERANCE_RULES,
      ];

      const ruleIds = allRules.map((r) => r.ruleId);
      const uniqueIds = new Set(ruleIds);

      expect(uniqueIds.size).toBe(ruleIds.length);
    });
  });
});
