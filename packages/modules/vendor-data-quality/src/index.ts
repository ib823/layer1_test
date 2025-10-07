/**
 * Vendor Master Data Quality Module
 *
 * Public exports for vendor data quality analysis
 */

// Main engine
export { VendorDataQualityEngine } from './VendorDataQualityEngine';
export type { VendorDataSource, VendorDataQualityResult } from './VendorDataQualityEngine';

// Types
export * from './types';

// Algorithms
export * from './algorithms/duplicateDetection';

// Scoring
export * from './scoring/dataQualityScorer';
