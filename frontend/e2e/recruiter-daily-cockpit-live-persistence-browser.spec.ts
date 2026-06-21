/**
 * Recruiter daily cockpit live persistence — browser smoke (workers=1).
 */
import { expect, test, type Page } from "@playwright/test";

import {
  RECRUITER_DAILY_COCKPIT_MARKERS,
  RECRUITER_DAILY_COCKPIT_PAGE_MARKER,
  RECRUITER_DAILY_COCKPIT_ROUTE,
} from "../src/lib/recruiter-daily-operating-cockpit";
import { withFreshContext } from "./helpers/browser-lifecycle";

const SETTLE_MS = 12_000;

async function dismissCookieBanner(page: Page): Promise<void> {
  const accept = page.getByRole("button", { name: /accept cookies/i });
  if (await accept.isVisible().catch(() => false)) {
    await accept.click();
  }
}

async function gotoAndSettle(page: Page, path: string) {
  const response = await page.goto(path, { waitUntil: "domcontentloaded" });
  await dismissCookieBanner(page);
  expect(response?.status() ?? 0).not.toBe(404);
  await page
    .locator(
      `[data-recruiter-daily-cockpit-page="${RECRUITER_DAILY_COCKPIT_PAGE_MARKER}"], :text("Sign in"), :text("Zaloguj")`,
    )
    .first()
    .waitFor({ state: "visible", timeout: SETTLE_MS })
    .catch(() => undefined);
  return response;
}

test.describe("Recruiter daily cockpit live persistence browser", () => {
  test.describe.configure({ timeout: 120_000 });

  test("operating state panel renders with source badge", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, RECRUITER_DAILY_COCKPIT_ROUTE);
      const panel = page.locator(`[data-testid="${RECRUITER_DAILY_COCKPIT_MARKERS.operatingState}"]`);
      await expect(panel).toBeVisible({ timeout: SETTLE_MS });
      const source = page.locator(`[data-testid="${RECRUITER_DAILY_COCKPIT_MARKERS.operatingStateSource}"]`);
      await expect(source).toBeVisible();
      const text = await source.innerText();
      expect(text.length).toBeGreaterThan(5);
    });
  });
});
