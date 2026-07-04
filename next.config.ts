import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Headroom over the 60s default so a slow upstream during prerender can't
  // fail the build; paired with the 25s fetch timeout + 1 retry in
  // src/lib/api/events.ts (worst case ~50s/fetch across paginated calls).
  staticPageGenerationTimeout: 180,
};

export default nextConfig;
