/**
 * Save-data fallback — poster + role cards, no autoplay video.
 *
 * Local:
 *   PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 PLAYWRIGHT_ENABLE_WEBSERVER=1 npm run test:demo-save-data-fallback-browser
 */
import { expect, test } from "@playwright/test";

import { withFreshContext } from "./helpers/browser-lifecycle";

const ROUTE_SETTLE_MS = 20_000;

test.describe("Demo save-data fallback browser", () => {
  test.describe.configure({ timeout: 60_000 });

  test("navigator.connection.saveData shows poster and role cards without video", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      await context.addInitScript(() => {
        Object.defineProperty(navigator, "connection", {
          value: { saveData: true, effectiveType: "2g" },
          configurable: true,
        });
      });
      const page = await context.newPage();
      await page.goto("/demo", { waitUntil: "domcontentloaded", timeout: 30_000 });
      await expect(page.locator("[data-sales-demo-hero]").first()).toBeVisible({ timeout: ROUTE_SETTLE_MS });
      await expect(page.locator("[data-demo-product-video]")).toHaveCount(0);
      await expect(page.locator("[data-demo-poster-fallback]").first()).toBeVisible({ timeout: ROUTE_SETTLE_MS });
      await expect(page.locator("[data-sales-demo-roles]").first()).toBeVisible({ timeout: ROUTE_SETTLE_MS });
    });
  });

  test("prefers-reduced-data media shows poster and role cards without video", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.emulateMedia({ media: "screen" });
      await page.addInitScript(() => {
        const original = window.matchMedia.bind(window);
        window.matchMedia = (query: string) => {
          const result = original(query);
          if (query.includes("prefers-reduced-data")) {
            return {
              ...result,
              matches: true,
              media: query,
              addEventListener: result.addEventListener.bind(result),
              removeEventListener: result.removeEventListener.bind(result),
              dispatchEvent: result.dispatchEvent.bind(result),
            } as MediaQueryList;
          }
          return result;
        };
      });
      await page.goto("/demo", { waitUntil: "domcontentloaded", timeout: 30_000 });
      await expect(page.locator("[data-sales-demo-hero]").first()).toBeVisible({ timeout: ROUTE_SETTLE_MS });
      await expect(page.locator("[data-demo-product-video]")).toHaveCount(0);
      await expect(page.locator("[data-demo-poster-fallback]").first()).toBeVisible({ timeout: ROUTE_SETTLE_MS });
      await expect(page.locator("[data-sales-demo-roles]").first()).toBeVisible({ timeout: ROUTE_SETTLE_MS });
    });
  });
});
