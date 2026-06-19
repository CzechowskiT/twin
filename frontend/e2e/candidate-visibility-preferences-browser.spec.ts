import { test, expect } from "@playwright/test";

import {
  CANDIDATE_VISIBILITY_PREFERENCES_MARKERS,
  CANDIDATE_VISIBILITY_PREFERENCES_PAGE_MARKER,
  CANDIDATE_VISIBILITY_PREFERENCES_ROUTE,
} from "../src/lib/candidate-visibility-preferences";

const PATH = CANDIDATE_VISIBILITY_PREFERENCES_ROUTE;

test.describe("candidate visibility preferences route", () => {
  test("1 route renders page or auth shell — not blank", async ({ browser }) => {
    const page = await browser.newPage();
    const res = await page.goto(PATH);
    expect(res?.status()).toBeLessThan(500);
    await expect(
      page.locator(
        `[data-candidate-visibility-preferences-page="${CANDIDATE_VISIBILITY_PREFERENCES_PAGE_MARKER}"], :text("Sign in"), :text("Zaloguj")`,
      ),
    ).toBeVisible({ timeout: 15000 });
    await page.close();
  });

  test("2 persistence note marker when page loads", async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto(PATH);
    const pageMarker = page.locator(`[data-candidate-visibility-preferences-page="${CANDIDATE_VISIBILITY_PREFERENCES_PAGE_MARKER}"]`);
    if (await pageMarker.count()) {
      await expect(page.getByTestId(CANDIDATE_VISIBILITY_PREFERENCES_MARKERS.persistenceNote)).toBeVisible();
    }
    await page.close();
  });
});
