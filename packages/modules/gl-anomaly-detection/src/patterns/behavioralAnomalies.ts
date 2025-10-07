/**
 * Behavioral Anomaly Detection Patterns
 *
 * Detects unusual patterns in GL posting behavior:
 * - After-hours postings
 * - Weekend postings
 * - Same-day reversals
 * - Round number patterns
 * - Duplicate entries
 * - Velocity anomalies
 */

import { GLLineItem, GLAnomaly, VelocityAnomaly, UserBehaviorPattern } from '../types';

/**
 * Check if posting was made after hours
 */
export function isAfterHours(
  postingDate: Date,
  postingTime: string | undefined,
  afterHoursStart: number = 19,
  afterHoursEnd: number = 7
): boolean {
  if (!postingTime) return false;

  const hour = parseInt(postingTime.split(':')[0], 10);

  // After hours is between afterHoursStart (e.g., 7 PM) and afterHoursEnd (e.g., 7 AM)
  if (afterHoursStart > afterHoursEnd) {
    // Spans midnight (e.g., 19:00 to 07:00)
    return hour >= afterHoursStart || hour < afterHoursEnd;
  } else {
    // Doesn't span midnight
    return hour >= afterHoursStart && hour < afterHoursEnd;
  }
}

/**
 * Check if posting was made on weekend
 */
export function isWeekend(postingDate: Date): boolean {
  const dayOfWeek = new Date(postingDate).getDay();
  return dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
}

/**
 * Detect after-hours postings
 */
export function detectAfterHoursPostings(
  lineItems: GLLineItem[],
  afterHoursStart: number = 19,
  afterHoursEnd: number = 7
): GLAnomaly[] {
  const afterHoursItems = lineItems.filter(item =>
    isAfterHours(item.postingDate, item.postingTime, afterHoursStart, afterHoursEnd)
  );

  if (afterHoursItems.length === 0) {
    return [];
  }

  // Group by user
  const byUser = new Map<string, GLLineItem[]>();
  for (const item of afterHoursItems) {
    if (!byUser.has(item.userId)) {
      byUser.set(item.userId, []);
    }
    byUser.get(item.userId)!.push(item);
  }

  const anomalies: GLAnomaly[] = [];

  for (const [userId, items] of byUser) {
    const totalAmount = items.reduce((sum, item) => sum + Math.abs(item.amount), 0);

    // Severity based on count and amount
    let severity: GLAnomaly['severity'] = 'LOW';
    if (items.length > 20 || totalAmount > 100000) {
      severity = 'CRITICAL';
    } else if (items.length > 10 || totalAmount > 50000) {
      severity = 'HIGH';
    } else if (items.length > 5 || totalAmount > 10000) {
      severity = 'MEDIUM';
    }

    anomalies.push({
      anomalyId: `AFTER_HOURS-${userId}-${Date.now()}`,
      glAccount: items[0].glAccount,
      glAccountName: items[0].glAccountName,
      lineItems: items,
      anomalyType: 'AFTER_HOURS_POSTING',
      severity,
      score: Math.min(100, items.length * 5),
      detectedAt: new Date(),
      description: `User ${items[0].userName} made ${items.length} posting(s) after hours (total: ${totalAmount.toLocaleString()} ${items[0].currency})`,
      details: {
        confidence: 95,
        evidence: {
          userId,
          userName: items[0].userName,
          postingCount: items.length,
          totalAmount,
          postingTimes: items.map(i => i.postingTime).filter(Boolean)
        }
      },
      recommendation: severity === 'CRITICAL' || severity === 'HIGH'
        ? 'Investigate urgently - high volume of after-hours activity may indicate unauthorized access'
        : 'Review with user to ensure legitimate business reason',
      status: 'OPEN'
    });
  }

  return anomalies;
}

/**
 * Detect weekend postings
 */
export function detectWeekendPostings(lineItems: GLLineItem[]): GLAnomaly[] {
  const weekendItems = lineItems.filter(item => isWeekend(item.postingDate));

  if (weekendItems.length === 0) {
    return [];
  }

  // Group by user
  const byUser = new Map<string, GLLineItem[]>();
  for (const item of weekendItems) {
    if (!byUser.has(item.userId)) {
      byUser.set(item.userId, []);
    }
    byUser.get(item.userId)!.push(item);
  }

  const anomalies: GLAnomaly[] = [];

  for (const [userId, items] of byUser) {
    const totalAmount = items.reduce((sum, item) => sum + Math.abs(item.amount), 0);

    let severity: GLAnomaly['severity'] = 'LOW';
    if (items.length > 15 || totalAmount > 100000) {
      severity = 'HIGH';
    } else if (items.length > 8 || totalAmount > 50000) {
      severity = 'MEDIUM';
    }

    anomalies.push({
      anomalyId: `WEEKEND-${userId}-${Date.now()}`,
      glAccount: items[0].glAccount,
      glAccountName: items[0].glAccountName,
      lineItems: items,
      anomalyType: 'WEEKEND_POSTING',
      severity,
      score: Math.min(100, items.length * 4),
      detectedAt: new Date(),
      description: `User ${items[0].userName} made ${items.length} posting(s) on weekends (total: ${totalAmount.toLocaleString()} ${items[0].currency})`,
      details: {
        confidence: 90,
        evidence: {
          userId,
          userName: items[0].userName,
          postingCount: items.length,
          totalAmount,
          dates: items.map(i => i.postingDate.toISOString().split('T')[0])
        }
      },
      recommendation: 'Review weekend activity for business justification',
      status: 'OPEN'
    });
  }

  return anomalies;
}

/**
 * Detect same-day reversals (posted and reversed on same day)
 */
export function detectSameDayReversals(
  lineItems: GLLineItem[],
  windowHours: number = 24
): GLAnomaly[] {
  const anomalies: GLAnomaly[] = [];

  // Group by GL account and date
  const byAccountAndDate = new Map<string, GLLineItem[]>();

  for (const item of lineItems) {
    const dateKey = `${item.glAccount}-${item.postingDate.toISOString().split('T')[0]}`;
    if (!byAccountAndDate.has(dateKey)) {
      byAccountAndDate.set(dateKey, []);
    }
    byAccountAndDate.get(dateKey)!.push(item);
  }

  // Look for reversals
  for (const [key, items] of byAccountAndDate) {
    const reversals = items.filter(item => item.isReversal || item.reversalDocumentNumber);

    if (reversals.length === 0) continue;

    for (const reversal of reversals) {
      // Find the original document
      const original = items.find(item =>
        item.documentNumber === reversal.reversalDocumentNumber &&
        !item.isReversal
      );

      if (original) {
        const timeDiff = Math.abs(
          new Date(reversal.postingDate).getTime() - new Date(original.postingDate).getTime()
        ) / (1000 * 60 * 60); // Hours

        if (timeDiff <= windowHours) {
          let severity: GLAnomaly['severity'] = 'MEDIUM';
          if (Math.abs(original.amount) > 50000) {
            severity = 'HIGH';
          }
          if (timeDiff < 1) {
            // Reversed within 1 hour
            severity = 'HIGH';
          }

          anomalies.push({
            anomalyId: `REVERSAL-${original.documentNumber}-${Date.now()}`,
            glAccount: original.glAccount,
            glAccountName: original.glAccountName,
            lineItems: [original, reversal],
            anomalyType: 'SAME_DAY_REVERSAL',
            severity,
            score: Math.min(100, 70 + (windowHours - timeDiff) * 2),
            detectedAt: new Date(),
            description: `Document ${original.documentNumber} reversed within ${timeDiff.toFixed(1)} hours (amount: ${Math.abs(original.amount).toLocaleString()} ${original.currency})`,
            details: {
              confidence: 100,
              evidence: {
                originalDocument: original.documentNumber,
                reversalDocument: reversal.documentNumber,
                amount: Math.abs(original.amount),
                timeBetweenPostings: `${timeDiff.toFixed(1)} hours`,
                userId: original.userId,
                userName: original.userName
              }
            },
            recommendation: timeDiff < 1
              ? 'URGENT: Investigate immediate reversal - possible error or manipulation'
              : 'Review business reason for same-day reversal',
            status: 'OPEN'
          });
        }
      }
    }
  }

  return anomalies;
}

/**
 * Detect round number patterns (e.g., many transactions ending in 000)
 */
export function detectRoundNumberPattern(
  lineItems: GLLineItem[],
  thresholds: number[] = [1000, 5000, 10000],
  minOccurrences: number = 5
): GLAnomaly[] {
  const roundNumbers: GLLineItem[] = [];

  for (const item of lineItems) {
    const absAmount = Math.abs(item.amount);

    // Check if amount is exactly a round number
    for (const threshold of thresholds) {
      if (absAmount === threshold || absAmount % threshold === 0) {
        roundNumbers.push(item);
        break;
      }
    }
  }

  if (roundNumbers.length < minOccurrences) {
    return [];
  }

  const totalAmount = roundNumbers.reduce((sum, item) => sum + Math.abs(item.amount), 0);
  const percentage = (roundNumbers.length / lineItems.length) * 100;

  let severity: GLAnomaly['severity'] = 'LOW';
  if (percentage > 30 && roundNumbers.length > 20) {
    severity = 'CRITICAL';
  } else if (percentage > 20 || roundNumbers.length > 15) {
    severity = 'HIGH';
  } else if (percentage > 10 || roundNumbers.length > 10) {
    severity = 'MEDIUM';
  }

  return [{
    anomalyId: `ROUND_NUMBER-${lineItems[0].glAccount}-${Date.now()}`,
    glAccount: lineItems[0].glAccount,
    glAccountName: lineItems[0].glAccountName,
    lineItems: roundNumbers,
    anomalyType: 'ROUND_NUMBER_PATTERN',
    severity,
    score: Math.min(100, percentage * 2),
    detectedAt: new Date(),
    description: `${roundNumbers.length} transactions (${percentage.toFixed(1)}%) have suspiciously round amounts (total: ${totalAmount.toLocaleString()} ${lineItems[0].currency})`,
    details: {
      confidence: 75,
      evidence: {
        roundNumberCount: roundNumbers.length,
        totalTransactions: lineItems.length,
        percentage: percentage.toFixed(1),
        totalAmount,
        thresholds,
        examples: roundNumbers.slice(0, 5).map(item => ({
          documentNumber: item.documentNumber,
          amount: item.amount,
          date: item.postingDate
        }))
      }
    },
    recommendation: severity === 'CRITICAL' || severity === 'HIGH'
      ? 'URGENT: Investigate for potential estimation fraud or manipulation'
      : 'Review for legitimate business reasons (e.g., budget allocations)',
    status: 'OPEN'
  }];
}

/**
 * Detect duplicate entries (same amount, date, description)
 */
export function detectDuplicateEntries(
  lineItems: GLLineItem[],
  timeWindowHours: number = 24,
  amountTolerance: number = 0.01
): GLAnomaly[] {
  const anomalies: GLAnomaly[] = [];
  const processed = new Set<string>();

  for (let i = 0; i < lineItems.length; i++) {
    const item1 = lineItems[i];
    if (processed.has(item1.documentNumber)) continue;

    const duplicates: GLLineItem[] = [item1];

    for (let j = i + 1; j < lineItems.length; j++) {
      const item2 = lineItems[j];
      if (processed.has(item2.documentNumber)) continue;

      // Check if amounts match (within tolerance)
      const amountDiff = Math.abs(Math.abs(item1.amount) - Math.abs(item2.amount));
      const amountMatch = amountDiff <= (Math.abs(item1.amount) * amountTolerance);

      // Check if within time window
      const timeDiff = Math.abs(
        new Date(item1.postingDate).getTime() - new Date(item2.postingDate).getTime()
      ) / (1000 * 60 * 60);
      const timeMatch = timeDiff <= timeWindowHours;

      // Check other fields
      const descriptionMatch = item1.description === item2.description;
      const glAccountMatch = item1.glAccount === item2.glAccount;

      if (amountMatch && timeMatch && descriptionMatch && glAccountMatch) {
        duplicates.push(item2);
        processed.add(item2.documentNumber);
      }
    }

    if (duplicates.length > 1) {
      const totalAmount = duplicates.reduce((sum, item) => sum + Math.abs(item.amount), 0);

      let severity: GLAnomaly['severity'] = 'MEDIUM';
      if (duplicates.length > 3 || totalAmount > 100000) {
        severity = 'CRITICAL';
      } else if (duplicates.length > 2 || totalAmount > 50000) {
        severity = 'HIGH';
      }

      anomalies.push({
        anomalyId: `DUPLICATE-${item1.documentNumber}-${Date.now()}`,
        glAccount: item1.glAccount,
        glAccountName: item1.glAccountName,
        lineItems: duplicates,
        anomalyType: 'DUPLICATE_ENTRY',
        severity,
        score: Math.min(100, duplicates.length * 25),
        detectedAt: new Date(),
        description: `${duplicates.length} duplicate entries detected (total: ${totalAmount.toLocaleString()} ${item1.currency})`,
        details: {
          confidence: 90,
          evidence: {
            duplicateCount: duplicates.length,
            amount: Math.abs(item1.amount),
            totalAmount,
            description: item1.description,
            documentNumbers: duplicates.map(d => d.documentNumber)
          }
        },
        recommendation: severity === 'CRITICAL'
          ? 'URGENT: Investigate for duplicate payment or data entry error'
          : 'Review and remove duplicate entries',
        status: 'OPEN'
      });

      processed.add(item1.documentNumber);
    }
  }

  return anomalies;
}

/**
 * Analyze velocity (rate of change in transaction patterns)
 */
export function analyzeVelocity(
  lineItems: GLLineItem[],
  glAccount: string,
  deviationThreshold: number = 200,
  lookbackPeriods: number = 12
): VelocityAnomaly[] {
  // Group by fiscal period
  const byPeriod = new Map<string, GLLineItem[]>();

  for (const item of lineItems) {
    const periodKey = `${item.fiscalYear}-${item.fiscalPeriod}`;
    if (!byPeriod.has(periodKey)) {
      byPeriod.set(periodKey, []);
    }
    byPeriod.get(periodKey)!.push(item);
  }

  const periods = Array.from(byPeriod.keys()).sort();

  if (periods.length < 2) {
    return [];
  }

  // Calculate statistics for each period
  const periodStats = periods.map(period => {
    const items = byPeriod.get(period)!;
    return {
      period,
      count: items.length,
      totalAmount: items.reduce((sum, item) => sum + Math.abs(item.amount), 0)
    };
  });

  // Calculate averages (excluding current period)
  const historicalStats = periodStats.slice(0, Math.min(lookbackPeriods, periodStats.length - 1));
  const avgCount = historicalStats.reduce((sum, s) => sum + s.count, 0) / historicalStats.length;
  const avgAmount = historicalStats.reduce((sum, s) => sum + s.totalAmount, 0) / historicalStats.length;

  // Check current period against historical average
  const anomalies: VelocityAnomaly[] = [];
  const currentPeriod = periodStats[periodStats.length - 1];

  const countDeviation = ((currentPeriod.count - avgCount) / avgCount) * 100;
  const amountDeviation = ((currentPeriod.totalAmount - avgAmount) / avgAmount) * 100;

  if (Math.abs(countDeviation) > deviationThreshold || Math.abs(amountDeviation) > deviationThreshold) {
    let severity: VelocityAnomaly['severity'] = 'LOW';

    if (Math.abs(countDeviation) > 500 || Math.abs(amountDeviation) > 500) {
      severity = 'CRITICAL';
    } else if (Math.abs(countDeviation) > 300 || Math.abs(amountDeviation) > 300) {
      severity = 'HIGH';
    } else if (Math.abs(countDeviation) > 200 || Math.abs(amountDeviation) > 200) {
      severity = 'MEDIUM';
    }

    anomalies.push({
      glAccount,
      period: currentPeriod.period,
      transactionCount: currentPeriod.count,
      totalAmount: currentPeriod.totalAmount,
      averageTransactionCount: avgCount,
      averageAmount: avgAmount,
      countDeviation,
      amountDeviation,
      isAnomalous: true,
      severity
    });
  }

  return anomalies;
}
