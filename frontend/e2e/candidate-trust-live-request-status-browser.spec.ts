/**
 * Candidate trust live request status — browser smoke (workers=1).
 */
import { expect, test, type Page } from "@playwright/test";

import {
  CANDIDATE_CONTROL_CENTER_MARKERS,
  CANDIDATE_CONTROL_CENTER_PAGE_MARKER,
  CANDIDATE_CONTROL_CENTER_ROUTE,
} from "../src/lib/candidate-control-center";
import {
  CANDIDATE_TRUST_OVERVIEW_MARKERS,
  CANDIDATE_TRUST_OVERVIEW_PAGE_MARKER,
  CANDIDATE_TRUST_OVERVIEW_ROUTE,
} from "../src/lib/candidate-trust-overview";
import { CANDIDATE_TRUST_REQUEST_STATUS_MARKERS } from "../src/lib/candidate-trust-request-status";
import { withFreshContext } from "./helpers/browser-lifecycle";

const SETTLE_MS = 12_000;
const GOTO_TIMEOUT_MS = 45_000;

async function dismissCookieBanner(page: Page): Promise<void> {
  const accept = page.getByRole("button", { name: /accept cookies/i });
  if (await accept.isVisible().catch(() => false)) await accept.click();
}

async function gotoRoute(page: Page, path: string) {
  return page.goto(path, { waitUntil: "domcontentloaded", timeout: GOTO_TIMEOUT_MS });
}

async function bodyText(page: Page): Promise<string> {
  return page.locator("body").innerText().catch(() => "");
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

async function expectRequestStatusPanel(page: Page): Promise<void> {
  await expect(page.getByTestId(CANDIDATE_TRUST_REQUEST_STATUS_MARKERS.panel)).toBeVisible({
    timeout: SETTLE_MS,
  });
  await expect(page.getByTestId(CANDIDATE_TRUST_REQUEST_STATUS_MARKERS.sourceBadge)).toBeVisible();
  for (const marker of [
    CANDIDATE_TRUST_REQUEST_STATUS_MARKERS.visibilityCount,
    CANDIDATE_TRUST_REQUEST_STATUS_MARKERS.exportCount,
    CANDIDATE_TRUST_REQUEST_STATUS_MARKERS.intakeCount,
    CANDIDATE_TRUST_REQUEST_STATUS_MARKERS.auditCount,
  ]) {
    await expect(page.getByTestId(marker)).toBeVisible();
  }
}

test.describe("Candidate trust live request status browser", () => {
  test.describe.configure({ timeout: 120_000 });

  test("1 overview route renders page or auth shell — not blank", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      const response = await gotoRoute(page, CANDIDATE_TRUST_OVERVIEW_ROUTE);
      await dismissCookieBanner(page);
      expect(response?.status() ?? 0).toBeLessThan(500);
      await page
        .locator(
          `[data-candidate-trust-overview-page="${CANDIDATE_TRUST_OVERVIEW_PAGE_MARKER}"], :text("Sign in"), :text("Zaloguj")`,
        )
        .first()
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      expect(body.length).toBeGreaterThan(32);
      if (!isAuthShell(body)) {
        await expect(
          page.locator(`[data-candidate-trust-overview-page="${CANDIDATE_TRUST_OVERVIEW_PAGE_MARKER}"]`),
        ).toBeVisible();
      }
    });
  });

  test("2 four-channel request status panel when overview loads", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoRoute(page, CANDIDATE_TRUST_OVERVIEW_ROUTE);
      await dismissCookieBanner(page);
      await page
        .locator(
          `[data-candidate-trust-overview-page="${CANDIDATE_TRUST_OVERVIEW_PAGE_MARKER}"], :text("Sign in"), :text("Zaloguj")`,
        )
        .first()
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      if (isAuthShell(body)) return;
      if (!(await page.getByTestId(CANDIDATE_TRUST_OVERVIEW_MARKERS.page).isVisible().catch(() => false))) return;
      await expectRequestStatusPanel(page);
    });
  });

  test("3 controls route renders request status when pilot loads", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      const response = await gotoRoute(page, CANDIDATE_CONTROL_CENTER_ROUTE);
      await dismissCookieBanner(page);
      expect(response?.status() ?? 0).not.toBe(404);
      await page
        .locator(
          `[data-candidate-control-center-page="${CANDIDATE_CONTROL_CENTER_PAGE_MARKER}"], :text("Sign in"), :text("Zaloguj")`,
        )
        .first()
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      if (isAuthShell(body)) return;
      if (!(await page.getByTestId(CANDIDATE_CONTROL_CENTER_MARKERS.page).isVisible().catch(() => false))) return;
      await expectRequestStatusPanel(page);
    });
  });
});
