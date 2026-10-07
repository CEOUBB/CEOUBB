import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// Implements: PERF-097, REQ-PERF-LOAD-04
const config = defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  tagCache: "dummy",
  queue: "dummy",
  cachePurge: "dummy",
});

config.buildCommand = "pnpm build && node scripts/check-public-cache.mjs";

export default config;
