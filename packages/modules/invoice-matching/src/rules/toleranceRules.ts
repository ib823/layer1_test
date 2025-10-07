/**
 * Standard Tolerance Rules for Three-Way Matching
 * Based on common industry practices and SAP best practices
 */

import { ToleranceRule } from '../types';

/**
 * Default tolerance rules following industry standards:
 * - Price variance: ±5% (common in manufacturing/retail)
 * - Quantity variance: ±2% (tighter control for inventory)
 * - Tax variance: ±1% (strict for compliance)
 * - Total amount: ±5% (overall invoice tolerance)
 */
export const STANDARD_TOLERANCE_RULES: ToleranceRule[] = [
  {
    ruleId: 'TOL-001',
    name: 'Price Variance - Standard',
    field: 'PRICE',
    thresholdType: 'PERCENTAGE',
    thresholdValue: 5.0, // ±5%
    requiresApproval: true,
    enabled: true,
  },
  {
    ruleId: 'TOL-002',
    name: 'Price Variance - Critical (Absolute)',
    field: 'PRICE',
    thresholdType: 'ABSOLUTE',
    thresholdValue: 10000, // $10,000 absolute difference
    requiresApproval: true,
    enabled: true,
  },
  {
    ruleId: 'TOL-003',
    name: 'Quantity Variance - Standard',
    field: 'QUANTITY',
    thresholdType: 'PERCENTAGE',
    thresholdValue: 2.0, // ±2%
    requiresApproval: true,
    enabled: true,
  },
  {
    ruleId: 'TOL-004',
    name: 'Quantity Variance - High Volume',
    field: 'QUANTITY',
    thresholdType: 'ABSOLUTE',
    thresholdValue: 100, // 100 units absolute difference
    requiresApproval: true,
    enabled: true,
  },
  {
    ruleId: 'TOL-005',
    name: 'Tax Variance - Standard',
    field: 'TAX',
    thresholdType: 'PERCENTAGE',
    thresholdValue: 1.0, // ±1%
    requiresApproval: true,
    enabled: true,
  },
  {
    ruleId: 'TOL-006',
    name: 'Total Amount Variance - Standard',
    field: 'TOTAL',
    thresholdType: 'PERCENTAGE',
    thresholdValue: 5.0, // ±5%
    requiresApproval: true,
    enabled: true,
  },
  {
    ruleId: 'TOL-007',
    name: 'Total Amount Variance - Large Invoice',
    field: 'TOTAL',
    thresholdType: 'ABSOLUTE',
    thresholdValue: 50000, // $50,000 absolute difference
    requiresApproval: true,
    enabled: true,
  },
];

/**
 * Strict tolerance rules for high-risk industries (pharma, defense, finance)
 */
export const STRICT_TOLERANCE_RULES: ToleranceRule[] = [
  {
    ruleId: 'TOL-STRICT-001',
    name: 'Price Variance - Strict',
    field: 'PRICE',
    thresholdType: 'PERCENTAGE',
    thresholdValue: 2.0, // ±2%
    requiresApproval: true,
    enabled: true,
  },
  {
    ruleId: 'TOL-STRICT-002',
    name: 'Quantity Variance - Strict',
    field: 'QUANTITY',
    thresholdType: 'PERCENTAGE',
    thresholdValue: 1.0, // ±1%
    requiresApproval: true,
    enabled: true,
  },
  {
    ruleId: 'TOL-STRICT-003',
    name: 'Tax Variance - Strict',
    field: 'TAX',
    thresholdType: 'PERCENTAGE',
    thresholdValue: 0.5, // ±0.5%
    requiresApproval: true,
    enabled: true,
  },
  {
    ruleId: 'TOL-STRICT-004',
    name: 'Total Amount Variance - Strict',
    field: 'TOTAL',
    thresholdType: 'PERCENTAGE',
    thresholdValue: 2.0, // ±2%
    requiresApproval: true,
    enabled: true,
  },
];

/**
 * Relaxed tolerance rules for low-risk, high-volume operations
 */
export const RELAXED_TOLERANCE_RULES: ToleranceRule[] = [
  {
    ruleId: 'TOL-RELAX-001',
    name: 'Price Variance - Relaxed',
    field: 'PRICE',
    thresholdType: 'PERCENTAGE',
    thresholdValue: 10.0, // ±10%
    requiresApproval: false,
    enabled: true,
  },
  {
    ruleId: 'TOL-RELAX-002',
    name: 'Quantity Variance - Relaxed',
    field: 'QUANTITY',
    thresholdType: 'PERCENTAGE',
    thresholdValue: 5.0, // ±5%
    requiresApproval: false,
    enabled: true,
  },
  {
    ruleId: 'TOL-RELAX-003',
    name: 'Tax Variance - Relaxed',
    field: 'TAX',
    thresholdType: 'PERCENTAGE',
    thresholdValue: 2.0, // ±2%
    requiresApproval: false,
    enabled: true,
  },
  {
    ruleId: 'TOL-RELAX-004',
    name: 'Total Amount Variance - Relaxed',
    field: 'TOTAL',
    thresholdType: 'PERCENTAGE',
    thresholdValue: 10.0, // ±10%
    requiresApproval: false,
    enabled: true,
  },
];

/**
 * Check if variance exceeds tolerance threshold
 */
export function checkTolerance(
  expectedValue: number,
  actualValue: number,
  rule: ToleranceRule
): { exceeded: boolean; variance: number; exceededBy: number } {
  const absoluteVariance = Math.abs(actualValue - expectedValue);

  if (rule.thresholdType === 'PERCENTAGE') {
    const percentageVariance = (absoluteVariance / expectedValue) * 100;
    const exceeded = percentageVariance > rule.thresholdValue;
    const exceededBy = exceeded ? percentageVariance - rule.thresholdValue : 0;

    return {
      exceeded,
      variance: percentageVariance,
      exceededBy,
    };
  } else {
    // ABSOLUTE
    const exceeded = absoluteVariance > rule.thresholdValue;
    const exceededBy = exceeded ? absoluteVariance - rule.thresholdValue : 0;

    return {
      exceeded,
      variance: absoluteVariance,
      exceededBy,
    };
  }
}

/**
 * Get tolerance rules by field type
 */
export function getRulesByField(
  rules: ToleranceRule[],
  field: ToleranceRule['field']
): ToleranceRule[] {
  return rules.filter(r => r.field === field && r.enabled);
}

/**
 * Validate if all tolerance rules are satisfied
 */
export function validateAllTolerances(
  po: { unitPrice: number; orderedQuantity: number; taxAmount: number; orderedValue: number },
  invoice: { invoicedAmount: number; invoicedQuantity: number; taxAmount: number; totalAmount: number },
  rules: ToleranceRule[]
): { valid: boolean; violations: Array<{ rule: ToleranceRule; variance: number; exceededBy: number }> } {
  const violations: Array<{ rule: ToleranceRule; variance: number; exceededBy: number }> = [];

  // Check price tolerance
  const priceRules = getRulesByField(rules, 'PRICE');
  for (const rule of priceRules) {
    const result = checkTolerance(po.unitPrice, invoice.invoicedAmount / invoice.invoicedQuantity, rule);
    if (result.exceeded) {
      violations.push({ rule, variance: result.variance, exceededBy: result.exceededBy });
    }
  }

  // Check quantity tolerance
  const quantityRules = getRulesByField(rules, 'QUANTITY');
  for (const rule of quantityRules) {
    const result = checkTolerance(po.orderedQuantity, invoice.invoicedQuantity, rule);
    if (result.exceeded) {
      violations.push({ rule, variance: result.variance, exceededBy: result.exceededBy });
    }
  }

  // Check tax tolerance
  const taxRules = getRulesByField(rules, 'TAX');
  for (const rule of taxRules) {
    const result = checkTolerance(po.taxAmount, invoice.taxAmount, rule);
    if (result.exceeded) {
      violations.push({ rule, variance: result.variance, exceededBy: result.exceededBy });
    }
  }

  // Check total amount tolerance
  const totalRules = getRulesByField(rules, 'TOTAL');
  for (const rule of totalRules) {
    const result = checkTolerance(po.orderedValue, invoice.totalAmount, rule);
    if (result.exceeded) {
      violations.push({ rule, variance: result.variance, exceededBy: result.exceededBy });
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}
