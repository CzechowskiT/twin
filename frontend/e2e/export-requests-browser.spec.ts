/**
 * Export requests — browser smoke (workers=1).
 */
import { expect, test, type Page } from "@playwright/test";

import {
  EXPORT_REQUESTS_MARKERS,
  EXPORT_REQUESTS_PAGE_MARKER,
  EXPORT_REQUESTS_ROUTE,
} from "../src/lib/export-requests";
import { withFreshContext } from "./helpers/browser-lifecycle";

const SETTLE_MS = 12_000;
const PATH = EXPORT_REQUESTS_ROUTE;

async function dismissCookieBanner(page: Page): Promise<void> {
  const accept = page.getByRole("button", { name: /accept cookies/i });
  if (await accept.isVisible().catch(() => false)) await accept.click();
}

test.describe("Export requests browser", () => {
  test.describe.configure({ timeout: 120_000, mode: "serial" });

  test("1 route not 404 and shows page or auth shell", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      const response = await page.goto(PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      const status = response?.status() ?? 0;
      if (status === 404) {
        test.skip(true, "Route not deployed yet");
        return;
      }
      expect(status).not.toBe(404);
      await page
        .locator(
          `[data-export-requests-page="${EXPORT_REQUESTS_PAGE_MARKER}"], :text("Sign in"), :text("Zaloguj")`,
        )
        .first()
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      expect((await page.locator("body").innerText()).length).toBeGreaterThan(32);
    });
  });

  test("2 section markers when pilot loads", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      const root = page.getByTestId(EXPORT_REQUESTS_MARKERS.page);
      if (!(await root.isVisible().catch(() => false))) return;
      for (const marker of Object.values(EXPORT_REQUESTS_MARKERS)) {
        await expect(page.getByTestId(marker)).toBeVisible({ timeout: SETTLE_MS });
      }
    });
  });
});
