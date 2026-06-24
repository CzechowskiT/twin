/**
 * Offer readiness center — browser smoke (workers=1, auth-shell-safe).
 * Routes: candidate dashboard/profile, recruiter, company, board offer-readiness.
 */
import { expect, test, type Page } from "@playwright/test";

import { CANDIDATE_OFFER_READINESS_MARKERS, CANDIDATE_OFFER_READINESS_PAGE_MARKER } from "../src/lib/candidate-offer-readiness";
import { OFFER_READINESS_EVIDENCE_MARKERS } from "../src/lib/offer-readiness-evidence";
import { withFreshContext } from "./helpers/browser-lifecycle";

const SETTLE_MS = 12_000;

const ROUTES = [
  "/dashboard/offer-readiness",
  "/profile/offer-readiness",
  "/recruiter/offer-readiness",
  "/company/offer-readiness",
  "/board/offer-readiness",
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

test.describe("Offer readiness browser", () => {
  test.describe.configure({ timeout: 120_000 });

  for (const route of ROUTES) {
    test(`${route} not 404 and evidence panel or auth shell`, async ({ browser }) => {
      await withFreshContext(browser, async (context) => {
        const page = await context.newPage();
        const response = await page.goto(route, { waitUntil: "domcontentloaded" });
        await dismissCookieBanner(page);
        expect(response?.status() ?? 0).not.toBe(404);
        await page
          .locator(
            `[data-testid="${OFFER_READINESS_EVIDENCE_MARKERS.panel}"], [data-candidate-offer-readiness-page="${CANDIDATE_OFFER_READINESS_PAGE_MARKER}"], :text("Sign in"), :text("Zaloguj")`,
          )
          .first()
          .waitFor({ state: "visible", timeout: SETTLE_MS })
          .catch(() => undefined);
        const body = await bodyText(page);
        expect(isGlobalFallback(body)).toBe(false);
        if (isAuthShell(body)) return;
        await expect(page.getByTestId(OFFER_READINESS_EVIDENCE_MARKERS.panel)).toBeVisible();
        await expect(page.getByTestId(OFFER_READINESS_EVIDENCE_MARKERS.capabilityMatrix)).toBeVisible();
        await expect(page.getByTestId("evidence-status-badge")).toBeVisible();
      });
    });
  }

  test("candidate route shows boundary and cross-links when pilot loads", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto("/dashboard/offer-readiness", { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await page
        .locator(`[data-testid="${CANDIDATE_OFFER_READINESS_MARKERS.boundary}"], :text("Sign in"), :text("Zaloguj")`)
        .first()
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = await bodyText(page);
      if (isAuthShell(body)) return;
      await expect(page.getByTestId(CANDIDATE_OFFER_READINESS_MARKERS.boundary)).toBeVisible();
      await expect(page.getByTestId(CANDIDATE_OFFER_READINESS_MARKERS.crossLinks)).toBeVisible();
      await expect(page.getByTestId(CANDIDATE_OFFER_READINESS_MARKERS.checklist)).toBeVisible();
    });
  });
});
