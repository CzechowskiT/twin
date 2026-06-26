/**
 * Scheduling proposal pack — browser smoke (workers=1, auth-shell-safe).
 */
import { expect, test, type Page } from "@playwright/test";

import { SCHEDULING_PROPOSAL_MARKERS, SCHEDULING_PROPOSAL_PAGE_MARKER } from "../src/lib/scheduling-proposal";
import { withFreshContext } from "./helpers/browser-lifecycle";

const SETTLE_MS = 12_000;

const ROUTES = [
  "/dashboard/scheduling-proposal",
  "/profile/scheduling-proposal",
  "/recruiter/scheduling-proposal",
  "/company/scheduling-proposal",
  "/board/scheduling-proposal",
] as const;

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

test.describe("Scheduling proposal browser", () => {
  test.describe.configure({ timeout: 120_000 });

  for (const route of ROUTES) {
    test(`${route} not 404 and panel or auth shell`, async ({ browser }) => {
      await withFreshContext(browser, async (context) => {
        const page = await context.newPage();
        const response = await page.goto(route, { waitUntil: "domcontentloaded" });
        expect(response?.status(), `response for ${route}`).not.toBe(404);
        expect(response?.status() ?? 0, `response for ${route}`).toBeLessThan(500);
        await dismissCookieBanner(page);
        await page.waitForTimeout(SETTLE_MS);
        const body = await bodyText(page);
        expect(isGlobalFallback(body)).toBe(false);
        const panel = page.locator(`[data-testid="${SCHEDULING_PROPOSAL_MARKERS.page}"]`);
        const badge = page.locator(`[data-testid="${SCHEDULING_PROPOSAL_MARKERS.readOnlyBadge}"]`);
        const hasPanel = await panel.isVisible().catch(() => false);
        const hasBadge = await badge.isVisible().catch(() => false);
        const authShell = isAuthShell(body);
        expect(hasPanel || hasBadge || authShell).toBe(true);
        if (hasPanel) {
          await expect(page.locator(`[data-scheduling-proposal-page="${SCHEDULING_PROPOSAL_PAGE_MARKER}"]`)).toBeVisible();
        }
      });
    });
  }
});
