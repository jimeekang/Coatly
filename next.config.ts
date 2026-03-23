import type { NextConfig } from 'next';

const isDevelopment = process.env.NODE_ENV === 'development';

const nextConfig: NextConfig = {
  // Keep dev artifacts out of the default .next folder to avoid stale
  // webpack vendor chunk issues on synced Windows folders like OneDrive.
  distDir: isDevelopment ? '.next-dev' : '.next',
};

export default nextConfig;
