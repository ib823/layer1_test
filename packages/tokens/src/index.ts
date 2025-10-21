/**
 * Design Tokens - Runtime Export
 *
 * Provides programmatic access to design tokens for runtime usage.
 * Prefer CSS variables in stylesheets, use this object only when necessary.
 */

export const tokens = {
  brand: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#2563EB',
    600: '#1D4ED8',
    700: '#1E40AF',
    800: '#1E3A8A',
    900: '#1E3A8A',
    primary: '#2563EB',
    primaryHover: '#1D4ED8',
    primaryActive: '#1E40AF',
  },

  text: {
    primary: '#0F172A',
    secondary: '#475569',
    tertiary: '#94A3B8',
    inverse: '#FFFFFF',
    disabled: '#CBD5E1',
  },

  surface: {
    base: '#FFFFFF',
    secondary: '#F8FAFC',
    tertiary: '#F1F5F9',
    overlay: '#FFFFFF',
    hover: '#F8FAFC',
  },

  border: {
    default: '#E2E8F0',
    strong: '#CBD5E1',
    subtle: '#F1F5F9',
    focus: '#2563EB',
  },

  status: {
    success: '#16A34A',
    successBg: '#F0FDF4',
    warning: '#F59E0B',
    warningBg: '#FFFBEB',
    danger: '#EF4444',
    dangerBg: '#FEF2F2',
    info: '#3B82F6',
    infoBg: '#EFF6FF',
  },

  risk: {
    critical: '#DC2626',
    criticalBg: '#FEE2E2',
    high: '#EA580C',
    highBg: '#FFEDD5',
    medium: '#F59E0B',
    mediumBg: '#FEF3C7',
    low: '#16A34A',
    lowBg: '#DCFCE7',
  },

  spacing: {
    0: '0px',
    1: '2px',
    2: '4px',
    3: '8px',
    4: '12px',
    5: '16px',
    6: '20px',
    7: '24px',
    8: '32px',
    9: '40px',
    10: '48px',
    11: '56px',
    12: '64px',
  },

  radius: {
    none: '0px',
    sm: '4px',
    md: '6px',
    lg: '10px',
    xl: '12px',
    full: '9999px',
  },

  fontSize: {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '30px',
    '4xl': '36px',
  },

  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  transition: {
    fast: '150ms',
    base: '200ms',
    slow: '300ms',
  },

  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1100,
    fixed: 1200,
    modalBackdrop: 1300,
    modal: 1400,
    popover: 1500,
    tooltip: 1600,
  },
} as const;

export type Tokens = typeof tokens;

// Helper functions for accessing CSS variables at runtime
export function getCSSVariable(varName: string): string {
  if (typeof window === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

export function setCSSVariable(varName: string, value: string): void {
  if (typeof window === 'undefined') return;
  document.documentElement.style.setProperty(varName, value);
}

// Export CSS variable names for programmatic access
export const cssVars = {
  brand: {
    primary: '--brand-primary',
    primaryHover: '--brand-primary-hover',
    primaryActive: '--brand-primary-active',
  },
  text: {
    primary: '--text-primary',
    secondary: '--text-secondary',
    tertiary: '--text-tertiary',
  },
  surface: {
    base: '--surface-base',
    secondary: '--surface-secondary',
  },
  border: {
    default: '--border-default',
    strong: '--border-strong',
  },
  radius: {
    md: '--radius-md',
    lg: '--radius-lg',
  },
} as const;
