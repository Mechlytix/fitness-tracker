import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ignore TypeScript errors during build — types will be regenerated once
  // Supabase is connected via `supabase gen types typescript`
  typescript: {
    ignoreBuildErrors: true,
  },
  // For Capacitor (Android APK): uncomment these for static export
  // output: 'export',
  // images: { unoptimized: true },
  // trailingSlash: true,
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
