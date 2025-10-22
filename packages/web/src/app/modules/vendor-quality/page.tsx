'use client';

import { VendorQualityDashboard } from '@/components/modules/vendor-quality/VendorQualityDashboard';
import { PageHead } from '@/components/seo/PageHead';

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
  return (
    <>
      <PageHead
        title="Vendor Data Quality"
        description="Comprehensive vendor master data quality analysis with duplicate detection and risk profiling"
      />
      <VendorQualityDashboard />
    </>
  );
}
