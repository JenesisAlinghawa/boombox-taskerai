import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config, { isServer }) => {
    // Optimize webpack build with safer chunking
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          maxAsyncRequests: 30,
          maxInitialRequests: 30,
          minSize: 20000,
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor chunk for node_modules
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name(module: any) {
                const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/);
                return packageName ? `vendor/${packageName[1].replace('@', '')}` : 'vendor/other';
              },
              priority: 10,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }
    return config;
  },
  productionBrowserSourceMaps: false,
  reactStrictMode: true,
};

const withAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

export default withAnalyzer(nextConfig);
