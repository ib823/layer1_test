'use client';

import { GLAnomalyDashboard } from '@/components/modules/gl-anomaly/GLAnomalyDashboard';

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
  return <GLAnomalyDashboard />;
}
