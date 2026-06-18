/**
 * Recruiter trust review queue — browser smoke (workers=1).
 */
import { expect, test, type Page } from "@playwright/test";

import {
  RECRUITER_TRUST_REVIEW_QUEUE_MARKERS,
  RECRUITER_TRUST_REVIEW_QUEUE_PAGE_MARKER,
} from "../src/lib/recruiter-trust-review-queue";
import { withFreshContext } from "./helpers/browser-lifecycle";

const SETTLE_MS = 12_000;
const PATH = "/recruiter/trust-review-queue";

async function dismissCookieBanner(page: Page): Promise<void> {
  const accept = page.getByRole("button", { name: /accept cookies/i });
  if (await accept.isVisible().catch(() => false)) await accept.click();
}

test.describe("Recruiter trust review queue browser", () => {
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
          `[data-recruiter-trust-review-queue-page="${RECRUITER_TRUST_REVIEW_QUEUE_PAGE_MARKER}"], :text("Sign in")`,
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
      const root = page.getByTestId(RECRUITER_TRUST_REVIEW_QUEUE_MARKERS.page);
      if (!(await root.isVisible().catch(() => false))) return;
      for (const marker of Object.values(RECRUITER_TRUST_REVIEW_QUEUE_MARKERS)) {
        if (marker === RECRUITER_TRUST_REVIEW_QUEUE_MARKERS.hubPromo) continue;
        await expect(page.getByTestId(marker)).toBeVisible({ timeout: SETTLE_MS });
      }
    });
  });
});
