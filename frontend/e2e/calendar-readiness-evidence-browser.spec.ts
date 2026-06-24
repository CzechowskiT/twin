/**
 * Calendar readiness evidence — browser smoke (workers=1, auth-shell-safe).
 * Routes: /dashboard/calendar/readiness and /dashboard/calendar.
 */
import { expect, test, type Page } from "@playwright/test";

import {
  CANDIDATE_CALENDAR_READINESS_MARKERS,
  CANDIDATE_CALENDAR_READINESS_PAGE_MARKER,
  CANDIDATE_CALENDAR_READINESS_ROUTE,
} from "../src/lib/candidate-calendar-readiness";
import { CALENDAR_READINESS_EVIDENCE_MARKERS } from "../src/lib/calendar-readiness-evidence";
import { CANDIDATE_CALENDAR_HREF } from "../src/lib/persona-access";
import { withFreshContext } from "./helpers/browser-lifecycle";

const SETTLE_MS = 12_000;

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

function isGlobalFallback(body: string): boolean {
  const lower = body.toLowerCase();
  return (
    lower.includes("application error") ||
    lower.includes("something went wrong") ||
    lower.includes("internal server error") ||
    lower.includes("coś poszło nie tak")
  );
}

test.describe("Calendar readiness evidence browser", () => {
  test.describe.configure({ timeout: 120_000 });

  test("readiness route shows evidence panel when pilot loads", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      const response = await page.goto(CANDIDATE_CALENDAR_READINESS_ROUTE, {
        waitUntil: "domcontentloaded",
      });
      await dismissCookieBanner(page);
      expect(response?.status() ?? 0).not.toBe(404);
      await page
        .locator(
          `[data-candidate-calendar-readiness-page="${CANDIDATE_CALENDAR_READINESS_PAGE_MARKER}"], :text("Sign in"), :text("Zaloguj")`,
        )
        .first()
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = await bodyText(page);
      expect(isGlobalFallback(body)).toBe(false);
      if (isAuthShell(body)) return;
      await expect(page.getByTestId(CALENDAR_READINESS_EVIDENCE_MARKERS.panel)).toBeVisible();
      await expect(page.getByTestId(CALENDAR_READINESS_EVIDENCE_MARKERS.capabilityMatrix)).toBeVisible();
      await expect(page.getByTestId(CANDIDATE_CALENDAR_READINESS_MARKERS.stage)).toBeVisible();
    });
  });

  test("calendar workspace route not 404 and shows evidence section or auth", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      const response = await page.goto(CANDIDATE_CALENDAR_HREF, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      expect(response?.status() ?? 0).not.toBe(404);
      await page
        .locator(
          `[data-testid="${CALENDAR_READINESS_EVIDENCE_MARKERS.panel}"], :text("Sign in"), :text("Zaloguj"), :text("Calendar"), :text("Kalendarz")`,
        )
        .first()
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = await bodyText(page);
      expect(isGlobalFallback(body)).toBe(false);
      expect(body.trim().length).toBeGreaterThan(0);
      if (isAuthShell(body)) return;
      await expect(page.getByTestId(CALENDAR_READINESS_EVIDENCE_MARKERS.panel)).toBeVisible();
    });
  });
});
