/**
 * Statistical Outlier Detection for GL Line Items
 *
 * Implements multiple methods for detecting unusual amounts:
 * - Z-Score (Standard Deviation method)
 * - IQR (Interquartile Range method)
 * - MAD (Modified Absolute Deviation method)
 */

import { GLLineItem, StatisticalOutlier, GLAccountStats } from '../types';

/**
 * Calculate mean (average) of an array
 */
export function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Calculate standard deviation
 */
export function calculateStandardDeviation(values: number[], mean?: number): number {
  if (values.length === 0) return 0;

  const avg = mean !== undefined ? mean : calculateMean(values);
  const squaredDiffs = values.map(val => Math.pow(val - avg, 2));
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;

  return Math.sqrt(variance);
}

/**
 * Calculate median
 */
export function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }

  return sorted[mid];
}

/**
 * Calculate quartiles
 */
export function calculateQuartiles(values: number[]): {
  q1: number;
  q2: number;
  q3: number;
  iqr: number;
} {
  if (values.length === 0) {
    return { q1: 0, q2: 0, q3: 0, iqr: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const q2 = calculateMedian(sorted);

  const midIndex = Math.floor(sorted.length / 2);
  const lowerHalf = sorted.slice(0, midIndex);
  const upperHalf = sorted.length % 2 === 0
    ? sorted.slice(midIndex)
    : sorted.slice(midIndex + 1);

  const q1 = calculateMedian(lowerHalf);
  const q3 = calculateMedian(upperHalf);
  const iqr = q3 - q1;

  return { q1, q2, q3, iqr };
}

/**
 * Calculate Modified Absolute Deviation (MAD)
 */
export function calculateMAD(values: number[]): number {
  if (values.length === 0) return 0;

  const median = calculateMedian(values);
  const absoluteDeviations = values.map(val => Math.abs(val - median));
  return calculateMedian(absoluteDeviations);
}

/**
 * Calculate Z-Score for a value
 * Z-Score = (value - mean) / standardDeviation
 */
export function calculateZScore(
  value: number,
  mean: number,
  stdDev: number
): number {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

/**
 * Detect outliers using Z-Score method
 */
export function detectOutliersZScore(
  lineItems: GLLineItem[],
  threshold: number = 3.0
): StatisticalOutlier[] {
  const amounts = lineItems.map(item => Math.abs(item.amount));
  const mean = calculateMean(amounts);
  const stdDev = calculateStandardDeviation(amounts, mean);

  const outliers: StatisticalOutlier[] = [];

  for (const item of lineItems) {
    const absAmount = Math.abs(item.amount);
    const zScore = calculateZScore(absAmount, mean, stdDev);
    const isOutlier = Math.abs(zScore) > threshold;

    if (isOutlier) {
      outliers.push({
        lineItem: item,
        method: 'Z_SCORE',
        score: Math.abs(zScore),
        threshold,
        isOutlier: true,
        deviation: Math.abs(absAmount - mean),
        populationMean: mean,
        populationStd: stdDev
      });
    }
  }

  return outliers.sort((a, b) => b.score - a.score);
}

/**
 * Detect outliers using IQR (Interquartile Range) method
 */
export function detectOutliersIQR(
  lineItems: GLLineItem[],
  multiplier: number = 1.5
): StatisticalOutlier[] {
  const amounts = lineItems.map(item => Math.abs(item.amount));
  const { q1, q3, iqr } = calculateQuartiles(amounts);

  const lowerBound = q1 - (multiplier * iqr);
  const upperBound = q3 + (multiplier * iqr);

  const outliers: StatisticalOutlier[] = [];

  for (const item of lineItems) {
    const absAmount = Math.abs(item.amount);
    const isOutlier = absAmount < lowerBound || absAmount > upperBound;

    if (isOutlier) {
      // Calculate "score" as distance from bounds normalized by IQR
      const deviation = absAmount > upperBound
        ? absAmount - upperBound
        : lowerBound - absAmount;

      const score = iqr > 0 ? deviation / iqr : 0;

      outliers.push({
        lineItem: item,
        method: 'IQR',
        score,
        threshold: multiplier,
        isOutlier: true,
        deviation
      });
    }
  }

  return outliers.sort((a, b) => b.score - a.score);
}

/**
 * Detect outliers using MAD (Modified Absolute Deviation) method
 * More robust to extreme values than Z-Score
 */
export function detectOutliersMAD(
  lineItems: GLLineItem[],
  threshold: number = 3.5
): StatisticalOutlier[] {
  const amounts = lineItems.map(item => Math.abs(item.amount));
  const median = calculateMedian(amounts);
  const mad = calculateMAD(amounts);

  const outliers: StatisticalOutlier[] = [];

  // MAD-based Z-Score = 0.6745 * (value - median) / MAD
  const constantFactor = 0.6745;

  for (const item of lineItems) {
    const absAmount = Math.abs(item.amount);

    if (mad === 0) continue;

    const madZScore = constantFactor * Math.abs(absAmount - median) / mad;
    const isOutlier = madZScore > threshold;

    if (isOutlier) {
      outliers.push({
        lineItem: item,
        method: 'MAD',
        score: madZScore,
        threshold,
        isOutlier: true,
        deviation: Math.abs(absAmount - median)
      });
    }
  }

  return outliers.sort((a, b) => b.score - a.score);
}

/**
 * Calculate comprehensive GL account statistics
 */
export function calculateGLAccountStats(
  lineItems: GLLineItem[],
  glAccount: string
): GLAccountStats {
  if (lineItems.length === 0) {
    return {
      glAccount,
      glAccountName: '',
      totalTransactions: 0,
      totalDebit: 0,
      totalCredit: 0,
      netBalance: 0,
      currency: '',
      averageAmount: 0,
      medianAmount: 0,
      stdDeviation: 0,
      minAmount: 0,
      maxAmount: 0,
      firstQuartile: 0,
      thirdQuartile: 0,
      iqr: 0,
      postingsByDay: {},
      postingsByHour: {},
      topUsers: [],
      topDocumentTypes: []
    };
  }

  // Basic calculations
  const amounts = lineItems.map(item => Math.abs(item.amount));
  const mean = calculateMean(amounts);
  const median = calculateMedian(amounts);
  const stdDev = calculateStandardDeviation(amounts, mean);
  const { q1, q3, iqr } = calculateQuartiles(amounts);

  // Debit/Credit totals
  let totalDebit = 0;
  let totalCredit = 0;

  for (const item of lineItems) {
    if (item.debitCredit === 'DEBIT') {
      totalDebit += item.amount;
    } else {
      totalCredit += item.amount;
    }
  }

  // Postings by day of week
  const postingsByDay: Record<string, number> = {};
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  for (const item of lineItems) {
    const dayIndex = new Date(item.postingDate).getDay();
    const dayName = daysOfWeek[dayIndex];
    postingsByDay[dayName] = (postingsByDay[dayName] || 0) + 1;
  }

  // Postings by hour
  const postingsByHour: Record<string, number> = {};

  for (const item of lineItems) {
    if (item.postingTime) {
      const hour = parseInt(item.postingTime.split(':')[0], 10);
      const hourKey = `${hour}:00`;
      postingsByHour[hourKey] = (postingsByHour[hourKey] || 0) + 1;
    }
  }

  // Top users
  const userCounts = new Map<string, { userId: string; userName: string; count: number }>();

  for (const item of lineItems) {
    if (!userCounts.has(item.userId)) {
      userCounts.set(item.userId, {
        userId: item.userId,
        userName: item.userName,
        count: 0
      });
    }
    userCounts.get(item.userId)!.count++;
  }

  const topUsers = Array.from(userCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map(u => ({ userId: u.userId, userName: u.userName, transactionCount: u.count }));

  // Top document types
  const docTypeCounts = new Map<string, number>();

  for (const item of lineItems) {
    docTypeCounts.set(item.documentType, (docTypeCounts.get(item.documentType) || 0) + 1);
  }

  const topDocumentTypes = Array.from(docTypeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([documentType, count]) => ({ documentType, count }));

  return {
    glAccount,
    glAccountName: lineItems[0].glAccountName,
    totalTransactions: lineItems.length,
    totalDebit,
    totalCredit,
    netBalance: totalDebit - totalCredit,
    currency: lineItems[0].currency,
    averageAmount: mean,
    medianAmount: median,
    stdDeviation: stdDev,
    minAmount: Math.min(...amounts),
    maxAmount: Math.max(...amounts),
    firstQuartile: q1,
    thirdQuartile: q3,
    iqr,
    postingsByDay,
    postingsByHour,
    topUsers,
    topDocumentTypes
  };
}

/**
 * Detect all statistical outliers using the specified method
 */
export function detectStatisticalOutliers(
  lineItems: GLLineItem[],
  method: 'Z_SCORE' | 'IQR' | 'MAD' = 'IQR',
  config?: {
    zScoreThreshold?: number;
    iqrMultiplier?: number;
    madThreshold?: number;
  }
): StatisticalOutlier[] {
  switch (method) {
    case 'Z_SCORE':
      return detectOutliersZScore(lineItems, config?.zScoreThreshold || 3.0);
    case 'IQR':
      return detectOutliersIQR(lineItems, config?.iqrMultiplier || 1.5);
    case 'MAD':
      return detectOutliersMAD(lineItems, config?.madThreshold || 3.5);
    default:
      return detectOutliersIQR(lineItems, config?.iqrMultiplier || 1.5);
  }
}
