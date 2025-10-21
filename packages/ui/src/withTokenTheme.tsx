/**
 * Theme Provider HOC
 *
 * Wraps children with Ant Design ConfigProvider to apply our design tokens.
 * Use this at the root of your app or feature modules.
 */

import React from 'react';
import { ConfigProvider, type ConfigProviderProps } from 'antd';
import { antdTheme, antdDarkTheme } from './antd-theme';

export interface TokenThemeProviderProps {
  children: React.ReactNode;
  /**
   * Theme mode - 'light' or 'dark'
   * @default 'light'
   */
  mode?: 'light' | 'dark';
  /**
   * Locale for internationalization
   * Pass antd locale object (e.g., enUS, jaJP)
   */
  locale?: ConfigProviderProps['locale'];
  /**
   * Text direction for RTL languages
   * @default 'ltr'
   */
  direction?: 'ltr' | 'rtl';
  /**
   * Override theme configuration
   * Will be deep merged with default theme
   */
  themeOverride?: ConfigProviderProps['theme'];
}

/**
 * TokenThemeProvider Component
 *
 * Wrap your app with this provider to apply design tokens to all Ant Design components.
 *
 * @example
 * ```tsx
 * import { TokenThemeProvider } from '@sap-framework/ui';
 *
 * function App() {
 *   return (
 *     <TokenThemeProvider mode="light">
 *       <YourApp />
 *     </TokenThemeProvider>
 *   );
 * }
 * ```
 */
export function TokenThemeProvider({
  children,
  mode = 'light',
  locale,
  direction = 'ltr',
  themeOverride,
}: TokenThemeProviderProps) {
  const theme = mode === 'dark' ? antdDarkTheme : antdTheme;

  const finalTheme = themeOverride
    ? {
        ...theme,
        token: { ...theme.token, ...themeOverride.token },
        components: { ...theme.components, ...themeOverride.components },
      }
    : theme;

  return (
    <ConfigProvider theme={finalTheme} locale={locale} direction={direction}>
      {children}
    </ConfigProvider>
  );
}

/**
 * withTokenTheme HOC
 *
 * Higher-order component to wrap a component with TokenThemeProvider.
 *
 * @example
 * ```tsx
 * const ThemedComponent = withTokenTheme(MyComponent, { mode: 'dark' });
 * ```
 */
export function withTokenTheme<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<TokenThemeProviderProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <TokenThemeProvider {...options}>
      <Component {...props} />
    </TokenThemeProvider>
  );

  WrappedComponent.displayName = `withTokenTheme(${
    Component.displayName || Component.name || 'Component'
  })`;

  return WrappedComponent;
}
