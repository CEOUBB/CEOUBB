import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";

const output = process.env.QA_OUTPUT_DIR ?? resolve("qa-results", "manual");
const explore = process.env.QA_EXPLORE === "1";
const inspectPort = Number(process.env.QA_CDP_PORT);
if (explore && (!Number.isInteger(inspectPort) || inspectPort < 1 || inspectPort > 65535))
  throw new Error("Exploration requires the loopback CDP port allocated by pnpm qa.");

// Implements: REQ-QA-05, REQ-QA-06, REQ-QA-07, REQ-QA-08, REQ-QA-09
export default defineConfig({
  testDir: "./qa",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: explore ? 0 : 90_000,
  expect: { timeout: 12_000 },
  retries: 0,
  forbidOnly: !!process.env.CI,
  outputDir: resolve(output, "artifacts"),
  snapshotPathTemplate: `${resolve(process.env.QA_REFERENCE_DIR ?? ".qa/references", process.platform).replaceAll("\\", "/")}/{projectName}/{testFilePath}/{arg}{ext}`,
  updateSnapshots: process.env.QA_UPDATE_SNAPSHOTS === "1" ? "all" : "none",
  reporter: [
    ["list"],
    ["html", { outputFolder: resolve(output, "html"), open: "never" }],
    ["json", { outputFile: resolve(output, "playwright.json") }],
  ],
  use: {
    baseURL: process.env.QA_BASE_URL ?? "http://127.0.0.1:3123",
    locale: "es-CL",
    timezoneId: "America/Santiago",
    reducedMotion: "reduce",
    headless: !explore,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...(explore
      ? {
          launchOptions: {
            args: [
              "--remote-debugging-address=127.0.0.1",
              `--remote-debugging-port=${inspectPort}`,
            ],
          },
        }
      : {}),
    actionTimeout: 15_000,
  },
  projects: [
    ...[320, 390, 768, 1440].map((width) => ({
      name: `chromium-${width}`,
      testMatch: "browser/**/*.spec.ts",
      use: {
        browserName: "chromium" as const,
        viewport: { width, height: width < 768 ? 844 : 1000 },
        isMobile: width < 768,
        hasTouch: width < 768,
      },
    })),
    {
      name: "firefox-critical",
      testMatch: "browser/**/*.spec.ts",
      grep: /@critical/,
      use: { browserName: "firefox", viewport: { width: 1440, height: 1000 } },
    },
    {
      name: "webkit-critical",
      testMatch: "browser/**/*.spec.ts",
      grep: /@critical/,
      use: {
        browserName: "webkit",
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
    { name: "api", testMatch: "api/**/*.spec.ts" },
  ],
});
