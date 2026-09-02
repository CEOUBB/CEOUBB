import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: "http://localhost:3123",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-pixel",
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: {
    command: "next start -p 3123",
    url: "http://localhost:3123",
    reuseExistingServer: !process.env.CI,
    env: {
      CEOUBB_ENVIRONMENT: "preview",
    },
  },
});
