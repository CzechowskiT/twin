/**
 * Audit event foundation — browser smoke (workers=1).
 */
import { expect, test, type Page } from "@playwright/test";

import {
  AUDIT_EVENT_FOUNDATION_MARKERS,
  AUDIT_EVENT_FOUNDATION_PAGE_MARKER,
  AUDIT_EVENT_FOUNDATION_ROUTE,
} from "../src/lib/audit-event-foundation";
import { withFreshContext } from "./helpers/browser-lifecycle";

const SETTLE_MS = 12_000;

async function gotoAndSettle(page: Page, path: string) {
  const response = await page.goto(path, { waitUntil: "domcontentloaded" });
  expect(response?.status() ?? 0).not.toBe(404);
  await page
    .locator(
      `[data-audit-event-foundation-page="${AUDIT_EVENT_FOUNDATION_PAGE_MARKER}"], :text("Sign in")`,
    )
    .first()
    .waitFor({ state: "visible", timeout: SETTLE_MS })
    .catch(() => undefined);
}

test.describe("Audit event foundation browser", () => {
  test.describe.configure({ timeout: 120_000 });

  test("1 route resolves", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, AUDIT_EVENT_FOUNDATION_ROUTE);
      expect((await page.locator("body").innerText()).length).toBeGreaterThan(32);
    });
  });

  test("2 page marker visible", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, AUDIT_EVENT_FOUNDATION_ROUTE);
      await expect(
        page.locator(`[data-audit-event-foundation-page="${AUDIT_EVENT_FOUNDATION_PAGE_MARKER}"]`),
      ).toBeVisible();
    });
  });

  test("3 contract section visible", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, AUDIT_EVENT_FOUNDATION_ROUTE);
      await expect(page.locator(`[data-testid="${AUDIT_EVENT_FOUNDATION_MARKERS.contract}"]`)).toBeVisible();
    });
  });
});
