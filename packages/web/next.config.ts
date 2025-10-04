import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize production builds
  productionBrowserSourceMaps: false,

  // Enable React strict mode for better development
  reactStrictMode: true,

  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Production optimizations
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor chunk for node_modules
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20,
            },
            // Common chunk for shared code
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
              enforce: true,
            },
            // React/React-DOM separate chunk (frequently cached)
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              name: 'react',
              chunks: 'all',
              priority: 30,
            },
            // TanStack separate chunk
            tanstack: {
              test: /[\\/]node_modules[\\/]@tanstack[\\/]/,
              name: 'tanstack',
              chunks: 'all',
              priority: 25,
            },
          },
        },
      };
    }

    return config;
  },

  // Experimental features for better performance
  experimental: {
    optimizePackageImports: [
      '@tanstack/react-table',
      '@tanstack/react-query',
      'zustand',
      'clsx',
    ],
  },
};

export default nextConfig;
