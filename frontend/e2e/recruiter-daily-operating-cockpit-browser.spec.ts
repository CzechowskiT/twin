/**
 * Recruiter Daily Operating Cockpit — browser smoke (workers=1).
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

test.describe("Recruiter Daily Operating Cockpit browser", () => {
  test.describe.configure({ timeout: 120_000 });

  test("1 daily-cockpit route shows workspace or auth shell — not 404 blank", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, RECRUITER_DAILY_COCKPIT_ROUTE);
      const body = (await bodyText(page)).toLowerCase();
      expect(body.length).toBeGreaterThan(32);
      if (!isAuthShell(body)) {
        await expect(
          page.locator(`[data-recruiter-daily-cockpit-page="${RECRUITER_DAILY_COCKPIT_PAGE_MARKER}"]`),
        ).toBeVisible();
      }
    });
  });

  test("2 priority worklist and weekly digest visible when authenticated", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, RECRUITER_DAILY_COCKPIT_ROUTE);
      const body = (await bodyText(page)).toLowerCase();
      if (!isAuthShell(body)) {
        await expect(page.locator(`[data-testid="${RECRUITER_DAILY_COCKPIT_MARKERS.priorityWorklist}"]`)).toBeVisible();
        await expect(page.locator(`[data-testid="${RECRUITER_DAILY_COCKPIT_MARKERS.weeklyDigest}"]`)).toBeVisible();
      }
    });
  });

  test("3 module links include decision memory and SOR hub hrefs", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, RECRUITER_DAILY_COCKPIT_ROUTE);
      const body = (await bodyText(page)).toLowerCase();
      if (!isAuthShell(body)) {
        const decisionHref = await page
          .locator('[data-testid="recruiter-daily-cockpit-link-decision_memory"]')
          .getAttribute("href");
        expect(decisionHref).toContain("/decision-memory");
        const sorHref = await page
          .locator('[data-testid="recruiter-daily-cockpit-link-sor_hub"]')
          .getAttribute("href");
        expect(sorHref).toBe("/recruiter");
      }
    });
  });

  test("4 human boundary and demo IDs visible when authenticated", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, RECRUITER_DAILY_COCKPIT_ROUTE);
      const body = await bodyText(page);
      if (!isAuthShell(body.toLowerCase())) {
        await expect(page.locator(`[data-testid="${RECRUITER_DAILY_COCKPIT_MARKERS.humanBoundary}"]`)).toBeVisible();
        expect(body).toContain("demo-candidate-001");
        expect(body).toContain("demo-role-001");
      }
    });
  });
});
