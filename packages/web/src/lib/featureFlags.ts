/**
 * Feature Flags Utility
 *
 * Provides runtime feature toggles for incomplete/experimental features.
 * Supports environment variables and localStorage overrides for development.
 */

export enum FeatureFlag {
  // Backend Integration
  USE_REAL_API = 'USE_REAL_API',

  // Module Features
  SOD_ANALYSIS = 'SOD_ANALYSIS',
  INVOICE_MATCHING = 'INVOICE_MATCHING',
  GL_ANOMALY_DETECTION = 'GL_ANOMALY_DETECTION',
  VENDOR_DATA_QUALITY = 'VENDOR_DATA_QUALITY',

  // UI Features
  DARK_MODE = 'DARK_MODE',
  ADVANCED_FILTERS = 'ADVANCED_FILTERS',
  EXPORT_PDF = 'EXPORT_PDF',
  REAL_TIME_UPDATES = 'REAL_TIME_UPDATES',

  // Experimental
  AI_INSIGHTS = 'AI_INSIGHTS',
  PREDICTIVE_ANALYTICS = 'PREDICTIVE_ANALYTICS',
}

/**
 * Default feature flag configuration
 * These defaults can be overridden via environment variables or localStorage
 */
const DEFAULT_FLAGS: Record<FeatureFlag, boolean> = {
  // Backend Integration - disabled by default (use mock data)
  [FeatureFlag.USE_REAL_API]: false,

  // Modules - enable what's ready
  [FeatureFlag.SOD_ANALYSIS]: true,
  [FeatureFlag.INVOICE_MATCHING]: true,
  [FeatureFlag.GL_ANOMALY_DETECTION]: true,
  [FeatureFlag.VENDOR_DATA_QUALITY]: true,

  // UI Features
  [FeatureFlag.DARK_MODE]: true,
  [FeatureFlag.ADVANCED_FILTERS]: false,
  [FeatureFlag.EXPORT_PDF]: false,
  [FeatureFlag.REAL_TIME_UPDATES]: false,

  // Experimental
  [FeatureFlag.AI_INSIGHTS]: false,
  [FeatureFlag.PREDICTIVE_ANALYTICS]: false,
};

/**
 * Check if a feature is enabled
 *
 * Priority order:
 * 1. localStorage override (for development)
 * 2. Environment variable
 * 3. Default configuration
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  // Check localStorage override first (highest priority)
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const key = \`featureFlag:\${flag}\`;
      const value = localStorage.getItem(key);
      if (value === 'true') return true;
      if (value === 'false') return false;
    } catch {
      // Ignore localStorage errors
    }
  }

  // Check environment variable
  if (typeof process !== 'undefined' && process.env) {
    const envVar = \`NEXT_PUBLIC_FEATURE_\${flag}\`;
    const value = process.env[envVar];
    if (value === 'true' || value === '1') return true;
    if (value === 'false' || value === '0') return false;
  }

  // Fall back to default
  return DEFAULT_FLAGS[flag] ?? false;
}

/**
 * Helper: Check if using mock data (real API disabled)
 */
export function isUsingMockData(): boolean {
  return !isFeatureEnabled(FeatureFlag.USE_REAL_API);
}

/**
 * Helper: Check if API is connected
 */
export function isAPIConnected(): boolean {
  return isFeatureEnabled(FeatureFlag.USE_REAL_API);
}
