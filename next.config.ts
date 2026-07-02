import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Headroom over the 60s default so a slow upstream during prerender can't
  // fail the build; paired with a 12s fetch timeout in src/lib/api/events.ts.
  staticPageGenerationTimeout: 120,
};

export default nextConfig;
