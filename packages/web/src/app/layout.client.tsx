'use client';

import { AntdRegistry } from '@ant-design/nextjs-registry';
import { TokenThemeProvider } from '@sap-framework/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { App as AntdApp } from 'antd';
import { ToastProvider } from "@/components/ui";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { SkipLink } from "@/components/SkipLink";
import { ErrorBoundary } from "@/components/ErrorBoundary";

interface RootLayoutClientProps {
  children: React.ReactNode;
}

/**
 * Client-side root layout wrapper
 * Handles all context providers and client-only functionality
 */
export function RootLayoutClient({ children }: RootLayoutClientProps) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <>
      <SkipLink />
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AntdRegistry>
            <TokenThemeProvider mode="light">
              <AntdApp>
                <AuthProvider>
                  <ToastProvider>
                    {children}
                  </ToastProvider>
                </AuthProvider>
              </AntdApp>
            </TokenThemeProvider>
          </AntdRegistry>
        </QueryClientProvider>
      </ErrorBoundary>
    </>
  );
}
