/**
 * Benford's Law Analysis for Financial Data
 *
 * Benford's Law states that in naturally occurring datasets, the leading digit
 * is more likely to be small. For example, 1 appears as the leading digit about
 * 30.1% of the time, while 9 appears only 4.6% of the time.
 *
 * Deviations from Benford's Law can indicate:
 * - Fraudulent data manipulation
 * - Rounding or estimation
 * - Data entry errors
 * - Psychological bias in number selection
 */

import { GLLineItem, BenfordAnalysisResult, GLAnomaly } from '../types';

/**
 * Expected frequencies for first digit according to Benford's Law
 * P(d) = log10(1 + 1/d) where d is the first digit (1-9)
 */
export const BENFORD_EXPECTED_FREQUENCIES: Record<string, number> = {
  '1': 30.1,
  '2': 17.6,
  '3': 12.5,
  '4': 9.7,
  '5': 7.9,
  '6': 6.7,
  '7': 5.8,
  '8': 5.1,
  '9': 4.6
};

/**
 * Extract first digit from a number
 */
export function getFirstDigit(amount: number): string | null {
  const absAmount = Math.abs(amount);
  if (absAmount === 0) return null;

  // Convert to string and find first non-zero digit
  const numStr = absAmount.toString().replace('.', '');
  for (let i = 0; i < numStr.length; i++) {
    const digit = numStr[i];
    if (digit >= '1' && digit <= '9') {
      return digit;
    }
  }

  return null;
}

/**
 * Calculate first digit distribution for a dataset
 */
export function calculateFirstDigitDistribution(
  lineItems: GLLineItem[]
): Record<string, number> {
  const distribution: Record<string, number> = {
    '1': 0, '2': 0, '3': 0, '4': 0, '5': 0,
    '6': 0, '7': 0, '8': 0, '9': 0
  };

  for (const item of lineItems) {
    const digit = getFirstDigit(item.amount);
    if (digit) {
      distribution[digit]++;
    }
  }

  return distribution;
}

/**
 * Convert counts to percentages
 */
export function toPercentages(
  distribution: Record<string, number>,
  total: number
): Record<string, number> {
  const percentages: Record<string, number> = {};

  for (const digit in distribution) {
    percentages[digit] = total > 0 ? (distribution[digit] / total) * 100 : 0;
  }

  return percentages;
}

/**
 * Calculate Chi-Square statistic
 * Measures how much the observed distribution differs from expected
 *
 * χ² = Σ[(Observed - Expected)² / Expected]
 */
export function calculateChiSquare(
  observed: Record<string, number>,
  expected: Record<string, number>
): number {
  let chiSquare = 0;

  for (const digit in observed) {
    const obs = observed[digit];
    const exp = expected[digit];

    if (exp > 0) {
      chiSquare += Math.pow(obs - exp, 2) / exp;
    }
  }

  return chiSquare;
}

/**
 * Calculate p-value from Chi-Square statistic
 * Using Chi-Square distribution with 8 degrees of freedom (9 digits - 1)
 *
 * This is a simplified approximation. For production, use a proper statistical library.
 */
export function calculatePValue(chiSquare: number, degreesOfFreedom: number = 8): number {
  // Simplified lookup table for Chi-Square critical values (df=8)
  // These represent significance levels
  const criticalValues: Array<{ pValue: number; chiSquare: number }> = [
    { pValue: 0.995, chiSquare: 1.344 },
    { pValue: 0.99, chiSquare: 1.646 },
    { pValue: 0.95, chiSquare: 2.733 },
    { pValue: 0.90, chiSquare: 3.490 },
    { pValue: 0.50, chiSquare: 7.344 },
    { pValue: 0.10, chiSquare: 13.362 },
    { pValue: 0.05, chiSquare: 15.507 },
    { pValue: 0.01, chiSquare: 20.090 },
    { pValue: 0.005, chiSquare: 21.955 }
  ];

  // Find p-value range
  if (chiSquare < criticalValues[0].chiSquare) {
    return 1.0; // Very high p-value, no significant difference
  }

  for (let i = 0; i < criticalValues.length - 1; i++) {
    if (chiSquare >= criticalValues[i].chiSquare && chiSquare < criticalValues[i + 1].chiSquare) {
      // Interpolate p-value
      const x1 = criticalValues[i].chiSquare;
      const x2 = criticalValues[i + 1].chiSquare;
      const y1 = criticalValues[i].pValue;
      const y2 = criticalValues[i + 1].pValue;

      return y1 + ((chiSquare - x1) / (x2 - x1)) * (y2 - y1);
    }
  }

  return 0.001; // Very low p-value, highly significant difference
}

/**
 * Determine severity based on p-value and deviation magnitude
 */
export function determineSeverity(
  pValue: number,
  maxDeviation: number
): BenfordAnalysisResult['severity'] {
  // p-value < 0.001 = extremely significant difference
  // p-value < 0.01 = very significant
  // p-value < 0.05 = significant
  // maxDeviation = largest % difference from expected frequency

  if (pValue < 0.001 && maxDeviation > 10) {
    return 'CRITICAL';
  }

  if (pValue < 0.01 && maxDeviation > 7) {
    return 'HIGH';
  }

  if (pValue < 0.05 && maxDeviation > 5) {
    return 'MEDIUM';
  }

  return 'LOW';
}

/**
 * Perform Benford's Law analysis on GL line items
 */
export function analyzeBenfordsLaw(
  lineItems: GLLineItem[],
  glAccount: string,
  significanceLevel: number = 0.05
): BenfordAnalysisResult {
  // Calculate first digit distribution
  const firstDigitCounts = calculateFirstDigitDistribution(lineItems);
  const total = Object.values(firstDigitCounts).reduce((sum, count) => sum + count, 0);

  // Convert to percentages
  const actualDistribution = toPercentages(firstDigitCounts, total);

  // Calculate Chi-Square statistic
  const chiSquareStatistic = calculateChiSquare(actualDistribution, BENFORD_EXPECTED_FREQUENCIES);

  // Calculate p-value
  const pValue = calculatePValue(chiSquareStatistic);

  // Check if anomalous
  const isAnomalous = pValue < significanceLevel;

  // Find maximum deviation
  const deviations = Object.keys(actualDistribution).map(digit =>
    Math.abs(actualDistribution[digit] - BENFORD_EXPECTED_FREQUENCIES[digit])
  );
  const maxDeviation = Math.max(...deviations);

  // Determine severity
  const severity = isAnomalous ? determineSeverity(pValue, maxDeviation) : 'LOW';

  return {
    glAccount,
    totalTransactions: total,
    firstDigitDistribution: firstDigitCounts,
    expectedDistribution: BENFORD_EXPECTED_FREQUENCIES,
    actualDistribution,
    chiSquareStatistic,
    pValue,
    isAnomalous,
    severity
  };
}

/**
 * Convert Benford analysis to GL anomaly
 */
export function benfordResultToAnomaly(
  result: BenfordAnalysisResult,
  lineItems: GLLineItem[]
): GLAnomaly | null {
  if (!result.isAnomalous) {
    return null;
  }

  // Find the digit with the largest deviation
  const deviations = Object.keys(result.actualDistribution).map(digit => ({
    digit,
    expected: result.expectedDistribution[digit],
    actual: result.actualDistribution[digit],
    deviation: Math.abs(result.actualDistribution[digit] - result.expectedDistribution[digit])
  }));

  deviations.sort((a, b) => b.deviation - a.deviation);
  const largestDeviation = deviations[0];

  // Create anomaly description
  const description = `GL account ${result.glAccount} shows significant deviation from Benford's Law. ` +
    `Digit ${largestDeviation.digit} appears ${largestDeviation.actual.toFixed(1)}% of the time ` +
    `(expected: ${largestDeviation.expected}%). Chi-Square: ${result.chiSquareStatistic.toFixed(2)}, ` +
    `p-value: ${result.pValue.toFixed(4)}`;

  // Calculate anomaly score (0-100)
  const score = Math.min(100, (1 - result.pValue) * 100);

  return {
    anomalyId: `BENFORD-${result.glAccount}-${Date.now()}`,
    glAccount: result.glAccount,
    glAccountName: lineItems[0]?.glAccountName || '',
    lineItems,
    anomalyType: 'BENFORD_LAW_VIOLATION',
    severity: result.severity,
    score,
    detectedAt: new Date(),
    description,
    details: {
      confidence: Math.min(100, (1 - result.pValue) * 100),
      evidence: {
        chiSquareStatistic: result.chiSquareStatistic,
        pValue: result.pValue,
        totalTransactions: result.totalTransactions,
        largestDeviation: {
          digit: largestDeviation.digit,
          expected: largestDeviation.expected,
          actual: largestDeviation.actual,
          deviation: largestDeviation.deviation
        },
        fullDistribution: result.actualDistribution
      }
    },
    recommendation: result.severity === 'CRITICAL' || result.severity === 'HIGH'
      ? 'URGENT: Investigate for potential fraud or systematic data manipulation'
      : 'Review transaction patterns for data quality issues or unusual behavior',
    status: 'OPEN'
  };
}

/**
 * Analyze multiple GL accounts for Benford's Law compliance
 */
export function analyzeBenfordsLawBatch(
  lineItems: GLLineItem[],
  minTransactions: number = 100,
  significanceLevel: number = 0.05
): BenfordAnalysisResult[] {
  // Group by GL account
  const accountGroups = new Map<string, GLLineItem[]>();

  for (const item of lineItems) {
    if (!accountGroups.has(item.glAccount)) {
      accountGroups.set(item.glAccount, []);
    }
    accountGroups.get(item.glAccount)!.push(item);
  }

  // Analyze each account
  const results: BenfordAnalysisResult[] = [];

  for (const [glAccount, items] of accountGroups) {
    // Skip accounts with too few transactions
    if (items.length < minTransactions) {
      continue;
    }

    const result = analyzeBenfordsLaw(items, glAccount, significanceLevel);
    results.push(result);
  }

  // Sort by severity and p-value
  return results.sort((a, b) => {
    const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
    if (severityDiff !== 0) return severityDiff;
    return a.pValue - b.pValue; // Lower p-value = more significant
  });
}
