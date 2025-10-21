'use client';

import { InvoiceMatchingDashboard } from '@/components/modules/invoice-matching/InvoiceMatchingDashboard';

/**
 * Invoice Matching Module Page
 *
 * This page provides comprehensive invoice matching analysis with:
 * - Three-way matching (Invoice, PO, GR)
 * - Fraud detection alerts
 * - Match statistics and analytics
 * - Historical run tracking
 */
export default function InvoiceMatchingPage() {
  return <InvoiceMatchingDashboard />;
}
