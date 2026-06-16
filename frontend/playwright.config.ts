import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

/**
 * INCIDENT 2026-06-16: overlapping agent/CI Playwright runs + multitab e2e spawned
 * hundreds of chrome-headless-shell processes (100% CPU). webServer with
 * reuseExistingServer:false restarted servers on every invoke; fullyParallel
 * multiplied workers/browsers. webServer is opt-in only until stable.
 */
const enableWebServer = process.env.PLAYWRIGHT_ENABLE_WEBSERVER === "1";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : 1,
  // globalTeardown only SIGTERM-kills orphaned ms-playwright shells; does not launch browsers.
  globalTeardown: "./scripts/playwright-global-teardown.mjs",
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: enableWebServer
    ? {
        command: "npm run start:e2e",
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
      }
    : undefined,
});
