'use client';

import { GLAnomalyDashboard } from '@/components/modules/gl-anomaly/GLAnomalyDashboard';
import { PageHead } from '@/components/seo/PageHead';

/**
 * GL Anomaly Detection Module Page
 *
 * This page provides comprehensive GL anomaly detection with:
 * - Benford's Law analysis
 * - Statistical outlier detection
 * - Behavioral anomaly detection
 * - Risk profiling and heat maps
 */
export default function GLAnomalyPage() {
  return (
    <>
      <PageHead
        title="GL Anomaly Detection"
        description="Advanced anomaly detection using Benford's Law, statistical analysis, and behavioral patterns"
      />
      <GLAnomalyDashboard />
    </>
  );
}
