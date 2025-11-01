import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import "@sap-framework/tokens/tokens.css";
import "./globals.css";

import { RootLayoutClient } from './layout.client';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

/**
 * Metadata export for SEO
 */
export const metadata: Metadata = {
  title: {
    template: '%s | Prism',
    default: 'Prism - Governance, Risk & Compliance',
  },
  description: 'Comprehensive Prism platform for governance, risk and compliance management with multi-tenant support',
  keywords: ['GRC', 'Governance', 'Risk', 'Compliance', 'Enterprise', 'Compliance Management'],
  authors: [{ name: 'Prism Team' }],
  creator: 'Prism Team',
  icons: {
    icon: [
      { url: '/favicons/favicon.ico', sizes: 'any' },
    ],
    apple: '/favicons/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Prism',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://prism.example.com',
    title: 'Prism',
    description: 'Comprehensive GRC management for enterprise compliance',
    images: [
      {
        url: '/favicons/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Prism',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Prism',
    description: 'Comprehensive GRC management for enterprise compliance',
    creator: '@Prism',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        {/* Favicon */}
        <link rel="icon" href="/favicons/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/favicons/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />

        {/* Theme Color */}
        <meta name="theme-color" content="#0C2B87" />

        {/* Viewport */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      </head>
      <body suppressHydrationWarning>
        <RootLayoutClient>
          {children}
        </RootLayoutClient>
      </body>
    </html>
  );
}