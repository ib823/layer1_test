'use client';

import { VendorQualityDashboard } from '@/components/modules/vendor-quality/VendorQualityDashboard';

/**
 * Vendor Data Quality Module Page
 *
 * This page provides comprehensive vendor master data quality analysis with:
 * - Data completeness and quality scoring
 * - Duplicate vendor detection
 * - Risk profiling
 * - Data cleansing recommendations
 */
export default function VendorQualityPage() {
  return <VendorQualityDashboard />;
}
