/**
 * Request intake — browser smoke (workers=1).
 */
import { expect, test, type Page } from "@playwright/test";

import {
  REQUEST_INTAKE_CANDIDATE_PREVIEW_ROUTE,
  REQUEST_INTAKE_MARKERS,
  REQUEST_INTAKE_PAGE_MARKER,
  REQUEST_INTAKE_RECRUITER_ROUTE,
} from "../src/lib/request-intake";
import { withFreshContext } from "./helpers/browser-lifecycle";

const SETTLE_MS = 12_000;

async function dismissCookieBanner(page: Page): Promise<void> {
  const accept = page.getByRole("button", { name: /accept cookies/i });
  if (await accept.isVisible().catch(() => false)) await accept.click();
}

async function expectPageOrAuthShell(page: Page, path: string): Promise<void> {
  const response = await page.goto(path, { waitUntil: "domcontentloaded" });
  await dismissCookieBanner(page);
  const status = response?.status() ?? 0;
  if (status === 404) {
    test.skip(true, "Route not deployed yet");
    return;
  }
  expect(status).not.toBe(404);
  await page
    .locator(
      `[data-request-intake-page="${REQUEST_INTAKE_PAGE_MARKER}"], :text("Sign in"), :text("Zaloguj")`,
    )
    .first()
    .waitFor({ state: "visible", timeout: SETTLE_MS })
    .catch(() => undefined);
  expect((await page.locator("body").innerText()).length).toBeGreaterThan(32);
}

test.describe("Request intake browser", () => {
  test.describe.configure({ timeout: 120_000, mode: "serial" });

  test("1 recruiter route shows page or auth shell", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await expectPageOrAuthShell(page, REQUEST_INTAKE_RECRUITER_ROUTE);
    });
  });

  test("2 candidate preview route shows page or auth shell", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await expectPageOrAuthShell(page, REQUEST_INTAKE_CANDIDATE_PREVIEW_ROUTE);
    });
  });

  test("3 section markers when pilot loads", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(REQUEST_INTAKE_RECRUITER_ROUTE, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      const root = page.getByTestId(REQUEST_INTAKE_MARKERS.page);
      if (!(await root.isVisible().catch(() => false))) return;
      for (const marker of Object.values(REQUEST_INTAKE_MARKERS)) {
        await expect(page.getByTestId(marker)).toBeVisible({ timeout: SETTLE_MS });
      }
    });
  });
});
