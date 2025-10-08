/**
 * Ant Design Theme Configuration
 *
 * Maps our design tokens to Ant Design's theme system.
 * This ensures all AntD components respect our brand colors and design language.
 */

import type { ThemeConfig } from 'antd';
import { tokens } from '@sap-framework/tokens';

export const antdTheme: ThemeConfig = {
  token: {
    // Brand Colors
    colorPrimary: tokens.brand.primary,
    colorSuccess: tokens.status.success,
    colorWarning: tokens.status.warning,
    colorError: tokens.status.danger,
    colorInfo: tokens.status.info,

    // Text Colors
    colorText: tokens.text.primary,
    colorTextSecondary: tokens.text.secondary,
    colorTextTertiary: tokens.text.tertiary,
    colorTextDisabled: tokens.text.disabled,

    // Background Colors
    colorBgBase: tokens.surface.base,
    colorBgContainer: tokens.surface.base,
    colorBgElevated: tokens.surface.overlay,
    colorBgLayout: tokens.surface.secondary,
    colorBgSpotlight: tokens.surface.hover,

    // Border
    colorBorder: tokens.border.default,
    colorBorderSecondary: tokens.border.subtle,

    // Border Radius
    borderRadius: 6, // maps to --radius-md
    borderRadiusLG: 10, // maps to --radius-lg
    borderRadiusSM: 4, // maps to --radius-sm

    // Spacing (using numeric values that map to our tokens)
    padding: 16, // maps to --space-5
    paddingLG: 24, // maps to --space-7
    paddingMD: 12, // maps to --space-4
    paddingSM: 8, // maps to --space-3
    paddingXS: 4, // maps to --space-2

    // Typography
    fontSize: 14,
    fontSizeLG: 16,
    fontSizeSM: 12,
    fontSizeHeading1: 36,
    fontSizeHeading2: 30,
    fontSizeHeading3: 24,
    fontSizeHeading4: 20,
    fontSizeHeading5: 16,

    fontWeightStrong: 600,

    lineHeight: 1.5,
    lineHeightHeading1: 1.25,
    lineHeightHeading2: 1.25,
    lineHeightHeading3: 1.25,

    // Shadows
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    boxShadowSecondary: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',

    // Motion
    motionDurationFast: '0.15s',
    motionDurationMid: '0.2s',
    motionDurationSlow: '0.3s',
    motionEaseInOut: 'cubic-bezier(0.2, 0.8, 0.2, 1)',

    // Control Heights (for buttons, inputs, etc.)
    controlHeight: 36,
    controlHeightLG: 44, // Important for accessibility - 44px minimum touch target
    controlHeightSM: 28,

    // Z-Index
    zIndexBase: 0,
    zIndexPopupBase: 1000,
  },

  components: {
    Button: {
      borderRadius: 6,
      controlHeight: 36,
      controlHeightLG: 44,
      controlHeightSM: 28,
      paddingContentHorizontal: 16,
      fontWeight: 500,
    },

    Input: {
      borderRadius: 6,
      controlHeight: 36,
      controlHeightLG: 44,
      controlHeightSM: 28,
      paddingInline: 12,
    },

    Select: {
      borderRadius: 6,
      controlHeight: 36,
      controlHeightLG: 44,
      controlHeightSM: 28,
    },

    DatePicker: {
      borderRadius: 6,
      controlHeight: 36,
      controlHeightLG: 44,
    },

    Card: {
      borderRadiusLG: 10,
      paddingLG: 24,
    },

    Modal: {
      borderRadiusLG: 10,
    },

    Drawer: {
      borderRadiusLG: 10,
    },

    Table: {
      borderRadius: 6,
      borderRadiusLG: 10,
      headerBg: tokens.surface.secondary,
      headerColor: tokens.text.primary,
    },

    Tag: {
      borderRadiusSM: 4,
      defaultBg: tokens.surface.tertiary,
    },

    Badge: {
      dotSize: 8,
    },

    Tabs: {
      inkBarColor: tokens.brand.primary,
      itemActiveColor: tokens.brand.primary,
      itemHoverColor: tokens.brand.primaryHover,
    },

    Menu: {
      itemBorderRadius: 6,
      itemPaddingInline: 12,
      itemHeight: 40,
      iconSize: 16,
      itemActiveBg: tokens.brand[100],
      itemSelectedBg: tokens.brand[100],
      itemSelectedColor: tokens.brand.primary,
    },

    Tooltip: {
      borderRadius: 6,
    },

    Notification: {
      borderRadiusLG: 10,
    },

    Message: {
      borderRadiusLG: 10,
    },
  },

  // Algorithm for theme variants
  algorithm: undefined, // Use default light theme; can switch to theme.darkAlgorithm
};

/**
 * Dark theme configuration
 * To be used when .dark class is active
 */
export const antdDarkTheme: ThemeConfig = {
  ...antdTheme,
  token: {
    ...antdTheme.token,
    colorBgBase: '#0F172A',
    colorBgContainer: '#0F172A',
    colorBgElevated: '#1E293B',
    colorBgLayout: '#1E293B',
    colorText: '#F8FAFC',
    colorTextSecondary: '#CBD5E1',
    colorTextTertiary: '#64748B',
    colorBorder: '#334155',
    colorBorderSecondary: '#1E293B',
  },
};
