/**
 * Feature Flag System
 *
 * Enables runtime feature toggling with:
 * - Environment variable configuration (server-side)
 * - localStorage override (client-side development)
 * - Default values for safety
 *
 * Usage:
 * ```typescript
 * import { isFeatureEnabled, FeatureFlag } from '@/lib/featureFlags';
 *
 * if (isFeatureEnabled(FeatureFlag.LIVE_DASHBOARD_DATA)) {
 *   // Use real API calls
 * } else {
 *   // Use mock data
 * }
 * ```
 */

export enum FeatureFlag {
  // Data Source Flags
  LIVE_DASHBOARD_DATA = 'live_dashboard_data',
  LIVE_VIOLATIONS_DATA = 'live_violations_data',
  LIVE_ANALYTICS_DATA = 'live_analytics_data',
  LIVE_USER_DATA = 'live_user_data',
  LIVE_TIMELINE_DATA = 'live_timeline_data',

  // Module Flags
  INVOICE_MATCHING_MODULE = 'invoice_matching_module',
  GL_ANOMALY_MODULE = 'gl_anomaly_module',
  VENDOR_DQ_MODULE = 'vendor_dq_module',

  // Integration Flags
  SAP_S4HANA_CONNECTED = 'sap_s4hana_connected',
  SAP_ARIBA_CONNECTED = 'sap_ariba_connected',
  SAP_SUCCESSFACTORS_CONNECTED = 'sap_successfactors_connected',

  // Feature Flags
  ADVANCED_ANALYTICS = 'advanced_analytics',
  WORKFLOW_ENGINE = 'workflow_engine',
  EXPORT_TO_EXCEL = 'export_to_excel',
  EXPORT_TO_PDF = 'export_to_pdf',
}

/**
 * Default flag states
 * true = enabled by default
 * false = disabled by default (safer for incomplete features)
 */
const DEFAULT_FLAGS: Record<FeatureFlag, boolean> = {
  // Data sources - disabled by default until APIs are wired
  [FeatureFlag.LIVE_DASHBOARD_DATA]: false,
  [FeatureFlag.LIVE_VIOLATIONS_DATA]: false,
  [FeatureFlag.LIVE_ANALYTICS_DATA]: false,
  [FeatureFlag.LIVE_USER_DATA]: false,
  [FeatureFlag.LIVE_TIMELINE_DATA]: false,

  // Modules - disabled until fully implemented
  [FeatureFlag.INVOICE_MATCHING_MODULE]: false,
  [FeatureFlag.GL_ANOMALY_MODULE]: false,
  [FeatureFlag.VENDOR_DQ_MODULE]: false,

  // Integrations - disabled until connected
  [FeatureFlag.SAP_S4HANA_CONNECTED]: false,
  [FeatureFlag.SAP_ARIBA_CONNECTED]: false,
  [FeatureFlag.SAP_SUCCESSFACTORS_CONNECTED]: false,

  // Features - disabled until complete
  [FeatureFlag.ADVANCED_ANALYTICS]: false,
  [FeatureFlag.WORKFLOW_ENGINE]: false,
  [FeatureFlag.EXPORT_TO_EXCEL]: false,
  [FeatureFlag.EXPORT_TO_PDF]: false,
};

/**
 * Environment variable prefix for feature flags
 * e.g., NEXT_PUBLIC_FF_LIVE_DASHBOARD_DATA=true
 */
const ENV_PREFIX = 'NEXT_PUBLIC_FF_';

/**
 * localStorage key prefix for feature flag overrides
 * e.g., ff_live_dashboard_data=true
 */
const STORAGE_PREFIX = 'ff_';

/**
 * Check if a feature flag is enabled
 *
 * Priority order:
 * 1. localStorage override (development only)
 * 2. Environment variable (NEXT_PUBLIC_FF_*)
 * 3. Default value
 *
 * @param flag - Feature flag to check
 * @returns true if enabled, false otherwise
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  // 1. Check localStorage override (client-side only)
  if (typeof window !== 'undefined') {
    const storageKey = `${STORAGE_PREFIX}${flag}`;
    const storageValue = localStorage.getItem(storageKey);

    if (storageValue !== null) {
      return storageValue === 'true';
    }
  }

  // 2. Check environment variable (both server and client via NEXT_PUBLIC_)
  const envKey = `${ENV_PREFIX}${flag.toUpperCase()}`;
  const envValue = process.env[envKey];

  if (envValue !== undefined) {
    return envValue === 'true';
  }

  // 3. Fall back to default
  return DEFAULT_FLAGS[flag];
}

/**
 * Enable a feature flag in localStorage (development only)
 *
 * @param flag - Feature flag to enable
 */
export function enableFeature(flag: FeatureFlag): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`${STORAGE_PREFIX}${flag}`, 'true');
  }
}

/**
 * Disable a feature flag in localStorage (development only)
 *
 * @param flag - Feature flag to disable
 */
export function disableFeature(flag: FeatureFlag): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`${STORAGE_PREFIX}${flag}`, 'false');
  }
}

/**
 * Remove a feature flag override from localStorage
 *
 * @param flag - Feature flag to reset
 */
export function resetFeature(flag: FeatureFlag): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(`${STORAGE_PREFIX}${flag}`);
  }
}

/**
 * Get all feature flags and their current states
 *
 * @returns Object with all flags and their enabled/disabled state
 */
export function getAllFeatureFlags(): Record<FeatureFlag, boolean> {
  const flags: Record<FeatureFlag, boolean> = {} as Record<FeatureFlag, boolean>;

  for (const flag of Object.values(FeatureFlag)) {
    flags[flag as FeatureFlag] = isFeatureEnabled(flag as FeatureFlag);
  }

  return flags;
}

/**
 * Debug helper: Log all feature flags to console
 *
 * Usage: Add to browser console or component for debugging
 */
export function debugFeatureFlags(): void {
  console.group('🚩 Feature Flags');

  const flags = getAllFeatureFlags();

  for (const [flag, enabled] of Object.entries(flags)) {
    console.log(`${enabled ? '✅' : '❌'} ${flag}`);
  }

  console.groupEnd();
}

/**
 * Developer tools for feature flag management
 * Access via window.featureFlags in browser console
 */
if (typeof window !== 'undefined') {
  (window as any).featureFlags = {
    enable: enableFeature,
    disable: disableFeature,
    reset: resetFeature,
    isEnabled: isFeatureEnabled,
    getAll: getAllFeatureFlags,
    debug: debugFeatureFlags,
  };
}
