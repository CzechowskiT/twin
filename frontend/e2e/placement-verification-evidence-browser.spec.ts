/**
 * Placement verification evidence — browser smoke (workers=1, auth-shell-safe).
 * Routes: candidate dashboard/profile, recruiter, company, board placement-verification.
 */
import { expect, test, type Page } from "@playwright/test";

import { PLACEMENT_VERIFICATION_EVIDENCE_MARKERS } from "../src/lib/placement-verification-evidence";
import { withFreshContext } from "./helpers/browser-lifecycle";

const SETTLE_MS = 12_000;

const ROUTES = [
  "/dashboard/placement-verification",
  "/profile/placement-verification",
  "/recruiter/placement-verification",
  "/company/placement-verification",
  "/board/placement-verification",
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

test.describe("Placement verification evidence browser", () => {
  test.describe.configure({ timeout: 120_000 });

  for (const route of ROUTES) {
    test(`${route} not 404 and evidence panel or auth shell`, async ({ browser }) => {
      await withFreshContext(browser, async (context) => {
        const page = await context.newPage();
        const response = await page.goto(route, { waitUntil: "domcontentloaded" });
        await dismissCookieBanner(page);
        expect(response?.status() ?? 0).not.toBe(404);
        await page
          .locator(`[data-testid="${PLACEMENT_VERIFICATION_EVIDENCE_MARKERS.panel}"], :text("Sign in"), :text("Zaloguj")`)
          .first()
          .waitFor({ state: "visible", timeout: SETTLE_MS })
          .catch(() => undefined);
        const body = await bodyText(page);
        expect(isGlobalFallback(body)).toBe(false);
        if (isAuthShell(body)) return;
        await expect(page.getByTestId(PLACEMENT_VERIFICATION_EVIDENCE_MARKERS.panel)).toBeVisible();
        await expect(page.getByTestId("read-only-capability-matrix")).toBeVisible();
        await expect(page.getByTestId("evidence-status-badge")).toBeVisible();
      });
    });
  }
});
