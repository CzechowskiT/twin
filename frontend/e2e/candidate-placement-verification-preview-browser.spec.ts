/**
 * Candidate placement verification preview — browser smoke (workers=1).
 */
import { expect, test, type Page } from "@playwright/test";

import {
  CANDIDATE_PLACEMENT_VERIFICATION_MARKERS,
  CANDIDATE_PLACEMENT_VERIFICATION_PAGE_MARKER,
  CANDIDATE_PLACEMENT_VERIFICATION_ROUTE,
} from "../src/lib/candidate-placement-verification-preview";
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

test.describe("Candidate placement verification preview browser", () => {
  test.describe.configure({ timeout: 120_000 });

  test("preview sections render when pilot loads", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      const response = await page.goto(CANDIDATE_PLACEMENT_VERIFICATION_ROUTE, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      expect(response?.status() ?? 0).not.toBe(404);
      await page
        .locator(
          `[data-candidate-placement-verification-page="${CANDIDATE_PLACEMENT_VERIFICATION_PAGE_MARKER}"], :text("Sign in"), :text("Zaloguj")`,
        )
        .first()
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      if (isAuthShell(body)) return;
      await expect(page.getByTestId(CANDIDATE_PLACEMENT_VERIFICATION_MARKERS.status)).toBeVisible();
      await expect(page.getByTestId(CANDIDATE_PLACEMENT_VERIFICATION_MARKERS.evidence)).toBeVisible();
      await expect(page.getByTestId(CANDIDATE_PLACEMENT_VERIFICATION_MARKERS.riskFlags)).toBeVisible();
      await expect(page.getByTestId(CANDIDATE_PLACEMENT_VERIFICATION_MARKERS.demoActions)).toBeVisible();
    });
  });
});
