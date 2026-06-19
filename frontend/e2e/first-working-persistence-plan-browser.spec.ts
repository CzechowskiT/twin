/**
 * First Working Persistence Plan — browser smoke (workers=1).
 */
import { expect, test, type Page } from "@playwright/test";

import {
  FIRST_WORKING_PERSISTENCE_PLAN_MARKERS,
  FIRST_WORKING_PERSISTENCE_PLAN_PAGE_MARKER,
  FIRST_WORKING_PERSISTENCE_PLAN_ROUTE,
} from "../src/lib/first-working-persistence-plan";
import { withFreshContext } from "./helpers/browser-lifecycle";

const SETTLE_MS = 12_000;

async function gotoAndSettle(page: Page, path: string) {
  const response = await page.goto(path, { waitUntil: "domcontentloaded" });
  expect(response?.status() ?? 0).not.toBe(404);
  await page
    .locator(
      `[data-first-working-persistence-plan-page="${FIRST_WORKING_PERSISTENCE_PLAN_PAGE_MARKER}"], :text("Sign in")`,
    )
    .first()
    .waitFor({ state: "visible", timeout: SETTLE_MS })
    .catch(() => undefined);
}

test.describe("First Working Persistence Plan browser", () => {
  test.describe.configure({ timeout: 120_000 });

  test("1 route resolves", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, FIRST_WORKING_PERSISTENCE_PLAN_ROUTE);
      expect((await page.locator("body").innerText()).length).toBeGreaterThan(32);
    });
  });

  test("2 page marker visible", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, FIRST_WORKING_PERSISTENCE_PLAN_ROUTE);
      await expect(
        page.locator(`[data-first-working-persistence-plan-page="${FIRST_WORKING_PERSISTENCE_PLAN_PAGE_MARKER}"]`),
      ).toBeVisible();
    });
  });

  test("3 backend sequence section visible", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, FIRST_WORKING_PERSISTENCE_PLAN_ROUTE);
      await expect(
        page.locator(`[data-testid="${FIRST_WORKING_PERSISTENCE_PLAN_MARKERS.backendSequence}"]`),
      ).toBeVisible();
    });
  });
});
