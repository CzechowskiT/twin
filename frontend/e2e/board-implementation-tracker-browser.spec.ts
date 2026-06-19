/**
 * Board Implementation Tracker — browser smoke (workers=1).
 */
import { expect, test, type Page } from "@playwright/test";

import {
  BOARD_IMPLEMENTATION_TRACKER_MARKERS,
  BOARD_IMPLEMENTATION_TRACKER_PAGE_MARKER,
  BOARD_IMPLEMENTATION_TRACKER_ROUTE,
} from "../src/lib/board-implementation-tracker";
import { withFreshContext } from "./helpers/browser-lifecycle";

const SETTLE_MS = 12_000;

async function gotoAndSettle(page: Page, path: string) {
  const response = await page.goto(path, { waitUntil: "domcontentloaded" });
  expect(response?.status() ?? 0).not.toBe(404);
  await page
    .locator(
      `[data-board-implementation-tracker-page="${BOARD_IMPLEMENTATION_TRACKER_PAGE_MARKER}"], :text("Sign in")`,
    )
    .first()
    .waitFor({ state: "visible", timeout: SETTLE_MS })
    .catch(() => undefined);
}

test.describe("Board Implementation Tracker browser", () => {
  test.describe.configure({ timeout: 120_000 });

  test("1 route resolves", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, BOARD_IMPLEMENTATION_TRACKER_ROUTE);
      expect((await page.locator("body").innerText()).length).toBeGreaterThan(32);
    });
  });

  test("2 page marker visible", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, BOARD_IMPLEMENTATION_TRACKER_ROUTE);
      await expect(
        page.locator(`[data-board-implementation-tracker-page="${BOARD_IMPLEMENTATION_TRACKER_PAGE_MARKER}"]`),
      ).toBeVisible();
    });
  });

  test("3 persistence features section visible", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, BOARD_IMPLEMENTATION_TRACKER_ROUTE);
      await expect(
        page.locator(`[data-testid="${BOARD_IMPLEMENTATION_TRACKER_MARKERS.persistenceFeatures}"]`),
      ).toBeVisible();
    });
  });
});
