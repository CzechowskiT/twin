/**
 * Request intake — browser smoke (workers=1).
 */
import { expect, test, type Page } from "@playwright/test";

import {
  REQUEST_INTAKE_MARKERS,
  REQUEST_INTAKE_PAGE_MARKER,
  REQUEST_INTAKE_RECRUITER_ROUTE,
} from "../src/lib/request-intake";
import { withFreshContext } from "./helpers/browser-lifecycle";

const SETTLE_MS = 12_000;
const PATH = REQUEST_INTAKE_RECRUITER_ROUTE;

async function dismissCookieBanner(page: Page): Promise<void> {
  const accept = page.getByRole("button", { name: /accept cookies/i });
  if (await accept.isVisible().catch(() => false)) await accept.click();
}

async function bodyText(page: Page): Promise<string> {
  return page.locator("body").innerText();
}

function isAuthShell(body: string): boolean {
  const lower = body.toLowerCase();
  return (
    lower.includes("sign in") ||
    lower.includes("zaloguj") ||
    lower.includes("auth required") ||
    lower.includes("redirecting to sign in") ||
    lower.includes("workspace only") ||
    lower.includes("tylko dla") ||
    lower.includes("wymagane logowanie")
  );
}

test.describe("Request intake browser", () => {
  test.describe.configure({ timeout: 120_000, mode: "serial" });

  test("1 recruiter route renders page or auth shell — not blank", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      const response = await page.goto(PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      expect(response?.status() ?? 0).toBeLessThan(500);
      await page
        .locator(
          `[data-request-intake-page="${REQUEST_INTAKE_PAGE_MARKER}"], :text("Sign in required"), :text("Zaloguj")`,
        )
        .first()
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      expect((await bodyText(page)).length).toBeGreaterThan(32);
    });
  });

  test("2 section markers when pilot loads", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await page
        .locator(
          `[data-request-intake-page="${REQUEST_INTAKE_PAGE_MARKER}"], :text("Sign in required"), :text("Zaloguj")`,
        )
        .first()
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      if (!isAuthShell(body)) {
        for (const marker of [
          REQUEST_INTAKE_MARKERS.header,
          REQUEST_INTAKE_MARKERS.queue,
          REQUEST_INTAKE_MARKERS.queueCount,
          REQUEST_INTAKE_MARKERS.boundary,
        ]) {
          await expect(page.getByTestId(marker)).toBeVisible();
        }
      }
    });
  });
});
