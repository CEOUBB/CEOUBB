import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Implements: PERF-097
const config = defineCloudflareConfig({
  incrementalCache: "dummy",
  tagCache: "dummy",
  queue: "dummy",
  cachePurge: "dummy",
});

export default config;
