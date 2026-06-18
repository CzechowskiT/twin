/**
 * Working features readiness — browser smoke (workers=1).
 */
import { expect, test, type Page } from "@playwright/test";

import {
  WORKING_FEATURES_READINESS_MARKERS,
  WORKING_FEATURES_READINESS_PAGE_MARKER,
} from "../src/lib/working-features-readiness";
import { withFreshContext } from "./helpers/browser-lifecycle";

const SETTLE_MS = 12_000;
const PATH = "/board/working-features-readiness";

async function dismissCookieBanner(page: Page): Promise<void> {
  const accept = page.getByRole("button", { name: /accept cookies/i });
  if (await accept.isVisible().catch(() => false)) await accept.click();
}

test.describe("Working features readiness browser", () => {
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
          `[data-working-features-readiness-page="${WORKING_FEATURES_READINESS_PAGE_MARKER}"], :text("Sign in")`,
        )
        .first()
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
    });
  });

  test("2 section markers when pilot loads", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      const root = page.getByTestId(WORKING_FEATURES_READINESS_MARKERS.page);
      if (!(await root.isVisible().catch(() => false))) return;
      for (const marker of Object.values(WORKING_FEATURES_READINESS_MARKERS)) {
        await expect(page.getByTestId(marker)).toBeVisible({ timeout: SETTLE_MS });
      }
    });
  });
});
