/**
 * Fraud Pattern Detection Rules
 * Based on ACFE (Association of Certified Fraud Examiners) guidelines
 */

import { FraudAlert, FraudPattern, SupplierInvoice, PurchaseOrder } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Detect duplicate invoices
 * Common fraud: Submit same invoice multiple times
 */
export function detectDuplicateInvoice(
  invoice: SupplierInvoice,
  allInvoices: SupplierInvoice[]
): FraudAlert | null {
  const duplicates = allInvoices.filter(
    inv =>
      inv.invoiceNumber !== invoice.invoiceNumber && // Different invoice number
      inv.vendorId === invoice.vendorId &&
      inv.invoicedAmount === invoice.invoicedAmount &&
      Math.abs(new Date(inv.invoiceDate).getTime() - new Date(invoice.invoiceDate).getTime()) <
        30 * 24 * 60 * 60 * 1000 // Within 30 days
  );

  if (duplicates.length > 0) {
    return {
      alertId: uuidv4(),
      pattern: 'DUPLICATE_INVOICE',
      severity: 'HIGH',
      confidence: 85,
      description: `Potential duplicate invoice detected. Found ${duplicates.length} similar invoice(s) from same vendor with same amount within 30 days.`,
      evidence: {
        duplicateInvoices: duplicates.map(d => d.invoiceNumber),
        amount: invoice.invoicedAmount,
        vendorId: invoice.vendorId,
      },
      triggeredAt: new Date(),
    };
  }

  return null;
}

/**
 * Detect split invoices below approval threshold
 * Common fraud: Split large invoice into smaller ones to avoid approval
 */
export function detectSplitInvoice(
  invoice: SupplierInvoice,
  allInvoices: SupplierInvoice[],
  approvalThreshold: number = 10000
): FraudAlert | null {
  // Look for invoices from same vendor on same day
  const sameDayInvoices = allInvoices.filter(
    inv =>
      inv.vendorId === invoice.vendorId &&
      new Date(inv.invoiceDate).toDateString() === new Date(invoice.invoiceDate).toDateString() &&
      inv.invoicedAmount < approvalThreshold
  );

  if (sameDayInvoices.length >= 2) {
    const totalAmount = sameDayInvoices.reduce((sum, inv) => sum + inv.invoicedAmount, 0);

    if (totalAmount >= approvalThreshold) {
      return {
        alertId: uuidv4(),
        pattern: 'SPLIT_INVOICE',
        severity: 'CRITICAL',
        confidence: 90,
        description: `Potential invoice splitting detected. ${sameDayInvoices.length} invoices from vendor on same day, each below approval threshold ($${approvalThreshold}), total: $${totalAmount}.`,
        evidence: {
          invoiceNumbers: sameDayInvoices.map(inv => inv.invoiceNumber),
          individualAmounts: sameDayInvoices.map(inv => inv.invoicedAmount),
          totalAmount,
          approvalThreshold,
          vendorId: invoice.vendorId,
        },
        triggeredAt: new Date(),
      };
    }
  }

  return null;
}

/**
 * Detect round-number invoices
 * Statistical fraud indicator: Fraudulent invoices often use round numbers
 */
export function detectRoundNumber(invoice: SupplierInvoice): FraudAlert | null {
  const amount = invoice.invoicedAmount;

  // Check if amount is suspiciously round (ends in 000, 500, etc.)
  const isRoundThousand = amount % 1000 === 0 && amount >= 10000;
  const isRoundHundred = amount % 500 === 0 && amount >= 5000;

  if (isRoundThousand) {
    return {
      alertId: uuidv4(),
      pattern: 'ROUND_NUMBER',
      severity: 'MEDIUM',
      confidence: 60,
      description: `Invoice amount ($${amount}) is a suspiciously round number (multiple of 1000). Statistical anomaly - most legitimate invoices have non-round amounts.`,
      evidence: {
        amount,
        roundingFactor: 1000,
      },
      triggeredAt: new Date(),
    };
  } else if (isRoundHundred) {
    return {
      alertId: uuidv4(),
      pattern: 'ROUND_NUMBER',
      severity: 'LOW',
      confidence: 40,
      description: `Invoice amount ($${amount}) is a round number (multiple of 500). May warrant review.`,
      evidence: {
        amount,
        roundingFactor: 500,
      },
      triggeredAt: new Date(),
    };
  }

  return null;
}

/**
 * Detect weekend/holiday submissions
 * Fraud indicator: Invoices submitted on non-business days
 */
export function detectWeekendSubmission(invoice: SupplierInvoice): FraudAlert | null {
  if (!invoice.submittedAt) return null;

  const submittedDate = new Date(invoice.submittedAt);
  const dayOfWeek = submittedDate.getDay();

  // 0 = Sunday, 6 = Saturday
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return {
      alertId: uuidv4(),
      pattern: 'WEEKEND_SUBMISSION',
      severity: 'MEDIUM',
      confidence: 65,
      description: `Invoice submitted on weekend (${dayOfWeek === 0 ? 'Sunday' : 'Saturday'}). Unusual for legitimate business activity.`,
      evidence: {
        submittedAt: invoice.submittedAt,
        dayOfWeek: dayOfWeek === 0 ? 'Sunday' : 'Saturday',
      },
      triggeredAt: new Date(),
    };
  }

  // Check if submitted during non-business hours (before 6 AM or after 10 PM)
  const hour = submittedDate.getHours();
  if (hour < 6 || hour >= 22) {
    return {
      alertId: uuidv4(),
      pattern: 'WEEKEND_SUBMISSION',
      severity: 'LOW',
      confidence: 50,
      description: `Invoice submitted during non-business hours (${hour}:00). May indicate automated or fraudulent submission.`,
      evidence: {
        submittedAt: invoice.submittedAt,
        hour,
      },
      triggeredAt: new Date(),
    };
  }

  return null;
}

/**
 * Detect invoices to new/unverified vendors
 * Risk indicator: First-time vendors require extra scrutiny
 */
export function detectNewVendor(
  invoice: SupplierInvoice,
  allInvoices: SupplierInvoice[],
  newVendorThresholdDays: number = 90
): FraudAlert | null {
  const vendorInvoices = allInvoices.filter(inv => inv.vendorId === invoice.vendorId);

  if (vendorInvoices.length === 1) {
    // This is the first invoice from this vendor
    return {
      alertId: uuidv4(),
      pattern: 'NEW_VENDOR',
      severity: 'MEDIUM',
      confidence: 70,
      description: `First invoice from new vendor. Requires additional verification to prevent vendor master data fraud.`,
      evidence: {
        vendorId: invoice.vendorId,
        vendorName: invoice.vendorName,
        amount: invoice.invoicedAmount,
        isFirstInvoice: true,
      },
      triggeredAt: new Date(),
    };
  }

  // Check if vendor is relatively new (within threshold days)
  const earliestInvoice = vendorInvoices.reduce((earliest, inv) =>
    new Date(inv.invoiceDate) < new Date(earliest.invoiceDate) ? inv : earliest
  );

  const daysSinceFirstInvoice =
    (new Date().getTime() - new Date(earliestInvoice.invoiceDate).getTime()) / (24 * 60 * 60 * 1000);

  if (daysSinceFirstInvoice < newVendorThresholdDays && vendorInvoices.length < 5) {
    return {
      alertId: uuidv4(),
      pattern: 'NEW_VENDOR',
      severity: 'LOW',
      confidence: 55,
      description: `Vendor is relatively new (${Math.round(daysSinceFirstInvoice)} days, ${vendorInvoices.length} invoices). Monitor for unusual patterns.`,
      evidence: {
        vendorId: invoice.vendorId,
        vendorName: invoice.vendorName,
        daysSinceFirstInvoice: Math.round(daysSinceFirstInvoice),
        totalInvoices: vendorInvoices.length,
      },
      triggeredAt: new Date(),
    };
  }

  return null;
}

/**
 * Detect price manipulation
 * Compares invoice price against PO price
 */
export function detectPriceManipulation(
  invoice: SupplierInvoice,
  po: PurchaseOrder,
  suspiciousThreshold: number = 15 // 15% or more is suspicious
): FraudAlert | null {
  const invoiceUnitPrice = invoice.invoicedAmount / invoice.invoicedQuantity;
  const poUnitPrice = po.unitPrice;

  const priceVariance = Math.abs(invoiceUnitPrice - poUnitPrice);
  const priceVariancePercent = (priceVariance / poUnitPrice) * 100;

  if (priceVariancePercent >= suspiciousThreshold) {
    const severity: FraudAlert['severity'] =
      priceVariancePercent >= 30 ? 'CRITICAL' : priceVariancePercent >= 20 ? 'HIGH' : 'MEDIUM';

    return {
      alertId: uuidv4(),
      pattern: 'PRICE_MANIPULATION',
      severity,
      confidence: Math.min(50 + priceVariancePercent, 95),
      description: `Significant price variance (${priceVariancePercent.toFixed(2)}%) between PO and invoice. Potential price manipulation or data entry error.`,
      evidence: {
        poUnitPrice,
        invoiceUnitPrice,
        variance: priceVariance,
        variancePercent: priceVariancePercent,
        poNumber: po.poNumber,
        invoiceNumber: invoice.invoiceNumber,
      },
      triggeredAt: new Date(),
    };
  }

  return null;
}

/**
 * Detect quantity manipulation
 * Compares invoice quantity against PO quantity
 */
export function detectQuantityManipulation(
  invoice: SupplierInvoice,
  po: PurchaseOrder,
  suspiciousThreshold: number = 10 // 10% or more is suspicious
): FraudAlert | null {
  const quantityVariance = Math.abs(invoice.invoicedQuantity - po.orderedQuantity);
  const quantityVariancePercent = (quantityVariance / po.orderedQuantity) * 100;

  if (quantityVariancePercent >= suspiciousThreshold) {
    const severity: FraudAlert['severity'] =
      quantityVariancePercent >= 25 ? 'CRITICAL' : quantityVariancePercent >= 15 ? 'HIGH' : 'MEDIUM';

    return {
      alertId: uuidv4(),
      pattern: 'QUANTITY_MANIPULATION',
      severity,
      confidence: Math.min(50 + quantityVariancePercent, 95),
      description: `Significant quantity variance (${quantityVariancePercent.toFixed(2)}%) between PO and invoice. Potential quantity manipulation or unauthorized over-invoicing.`,
      evidence: {
        poQuantity: po.orderedQuantity,
        invoiceQuantity: invoice.invoicedQuantity,
        variance: quantityVariance,
        variancePercent: quantityVariancePercent,
        poNumber: po.poNumber,
        invoiceNumber: invoice.invoiceNumber,
      },
      triggeredAt: new Date(),
    };
  }

  return null;
}

/**
 * Detect invoice aging issues
 * Invoices submitted long after goods receipt
 */
export function detectInvoiceAging(invoice: SupplierInvoice, po: PurchaseOrder, maxDays: number = 90): FraudAlert | null {
  const daysSinceDelivery = (new Date(invoice.invoiceDate).getTime() - new Date(po.deliveryDate).getTime()) / (24 * 60 * 60 * 1000);

  if (daysSinceDelivery > maxDays) {
    return {
      alertId: uuidv4(),
      pattern: 'INVOICE_AGING',
      severity: daysSinceDelivery > 180 ? 'HIGH' : 'MEDIUM',
      confidence: 75,
      description: `Invoice submitted ${Math.round(daysSinceDelivery)} days after delivery date. Late invoicing may indicate data manipulation or billing irregularities.`,
      evidence: {
        invoiceDate: invoice.invoiceDate,
        deliveryDate: po.deliveryDate,
        daysSinceDelivery: Math.round(daysSinceDelivery),
        maxDays,
      },
      triggeredAt: new Date(),
    };
  }

  return null;
}

/**
 * Run all fraud detection patterns
 */
export function detectAllFraudPatterns(
  invoice: SupplierInvoice,
  po: PurchaseOrder | null,
  allInvoices: SupplierInvoice[],
  enabledPatterns: FraudPattern[] = [
    'DUPLICATE_INVOICE',
    'SPLIT_INVOICE',
    'ROUND_NUMBER',
    'WEEKEND_SUBMISSION',
    'NEW_VENDOR',
    'PRICE_MANIPULATION',
    'QUANTITY_MANIPULATION',
    'INVOICE_AGING',
  ]
): FraudAlert[] {
  const alerts: FraudAlert[] = [];

  if (enabledPatterns.includes('DUPLICATE_INVOICE')) {
    const alert = detectDuplicateInvoice(invoice, allInvoices);
    if (alert) alerts.push(alert);
  }

  if (enabledPatterns.includes('SPLIT_INVOICE')) {
    const alert = detectSplitInvoice(invoice, allInvoices);
    if (alert) alerts.push(alert);
  }

  if (enabledPatterns.includes('ROUND_NUMBER')) {
    const alert = detectRoundNumber(invoice);
    if (alert) alerts.push(alert);
  }

  if (enabledPatterns.includes('WEEKEND_SUBMISSION')) {
    const alert = detectWeekendSubmission(invoice);
    if (alert) alerts.push(alert);
  }

  if (enabledPatterns.includes('NEW_VENDOR')) {
    const alert = detectNewVendor(invoice, allInvoices);
    if (alert) alerts.push(alert);
  }

  // PO-dependent patterns
  if (po) {
    if (enabledPatterns.includes('PRICE_MANIPULATION')) {
      const alert = detectPriceManipulation(invoice, po);
      if (alert) alerts.push(alert);
    }

    if (enabledPatterns.includes('QUANTITY_MANIPULATION')) {
      const alert = detectQuantityManipulation(invoice, po);
      if (alert) alerts.push(alert);
    }

    if (enabledPatterns.includes('INVOICE_AGING')) {
      const alert = detectInvoiceAging(invoice, po);
      if (alert) alerts.push(alert);
    }
  }

  return alerts;
}
