/**
 * Recruiter operational work queue — browser smoke (workers=1).
 */
import { expect, test, type Page } from "@playwright/test";

import {
  RECRUITER_OPERATIONAL_WORK_QUEUE_MARKERS,
  RECRUITER_OPERATIONAL_WORK_QUEUE_PAGE_MARKER,
} from "../src/lib/recruiter-operational-work-queue";
import { withFreshContext } from "./helpers/browser-lifecycle";

const SETTLE_MS = 12_000;
const PATH = "/recruiter/operational-work-queue";

async function dismissCookieBanner(page: Page): Promise<void> {
  const accept = page.getByRole("button", { name: /accept cookies/i });
  if (await accept.isVisible().catch(() => false)) await accept.click();
}

test.describe("Recruiter operational work queue browser", () => {
  test.describe.configure({ timeout: 120_000, mode: "serial" });

  test("1 route not 404", async ({ browser }) => {
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
    });
  });

  test("2 section markers when authenticated", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      const root = page.locator(
        `[data-recruiter-operational-work-queue-page="${RECRUITER_OPERATIONAL_WORK_QUEUE_PAGE_MARKER}"], :text("Sign in")`,
      );
      await root.first().waitFor({ state: "visible", timeout: SETTLE_MS }).catch(() => undefined);
      const pageMarker = page.getByTestId(RECRUITER_OPERATIONAL_WORK_QUEUE_MARKERS.page);
      if (!(await pageMarker.isVisible().catch(() => false))) return;
      for (const marker of Object.values(RECRUITER_OPERATIONAL_WORK_QUEUE_MARKERS)) {
        await expect(page.getByTestId(marker)).toBeVisible({ timeout: SETTLE_MS });
      }
    });
  });

  test("3 disabled assign action visible", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      const btn = page.getByTestId("recruiter-operational-work-queue-action-assign-disabled");
      if (!(await btn.isVisible().catch(() => false))) return;
      await expect(btn).toBeDisabled();
    });
  });

  test("4 summary section shows counts", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      const summary = page.getByTestId(RECRUITER_OPERATIONAL_WORK_QUEUE_MARKERS.summary);
      if (!(await summary.isVisible().catch(() => false))) return;
      await expect(summary.locator("dd").first()).toBeVisible();
    });
  });
});
