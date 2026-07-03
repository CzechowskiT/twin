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
  // Gate E attempt 7 execution guarantee (2026-06-29): hard-coded to the literal
  // `1`, not derived from any env-overridable expression, so a future edit or
  // CI env change cannot silently raise concurrency. Phase 3B additionally pins
  // its own `retries: 0` via test.describe.configure — see
  // docs/GATE_E_ATTEMPT7_EXECUTION_GUARANTEE_2026-06-29.md.
  workers: 1,
  // globalTeardown only SIGTERM-kills orphaned ms-playwright shells; does not launch browsers.
  globalTeardown: "./scripts/playwright-global-teardown.mjs",
  // HTML report only in CI (e.g. the isolated Gate E Phase 3B runner, see
  // docs/GATE_E_ISOLATED_RUNNER_PLAN_2026-07-03.md) so it can be uploaded as
  // a workflow artifact. Local/founder-Mac runs are unaffected — list only.
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
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
