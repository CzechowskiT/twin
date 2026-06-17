/**
 * Candidate Profile 360 — browser smoke (workers=1).
 */
import { expect, test, type Page } from "@playwright/test";

import {
  CANDIDATE_PROFILE_360_MARKERS,
  CANDIDATE_PROFILE_360_PAGE_MARKER,
} from "../src/lib/candidate-profile-360";
import { CANDIDATE_PROFILE_360_DEMO_ID } from "../src/lib/candidate-profile-360-demo-data";
import { withFreshContext } from "./helpers/browser-lifecycle";

const SETTLE_MS = 12_000;
const DEMO_PATH = `/recruiter/candidates/${CANDIDATE_PROFILE_360_DEMO_ID}`;
const INVALID_PATH = "/recruiter/candidates/not-a-real-candidate-id";

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

test.describe("Candidate Profile 360 browser", () => {
  test.describe.configure({ timeout: 120_000 });

  test("demo-candidate-001 shows profile 360 or auth shell — not 404 blank", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      const response = await page.goto(DEMO_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      expect(response?.status() ?? 0).not.toBe(404);
      await page
        .locator(
          `[data-candidate-profile-360-page="${CANDIDATE_PROFILE_360_PAGE_MARKER}"], [data-testid="${CANDIDATE_PROFILE_360_MARKERS.notFound}"], :text("Sign in")`,
        )
        .first()
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      expect(body.length).toBeGreaterThan(32);
      if (!isAuthShell(body)) {
        await expect(page.locator(`[data-candidate-profile-360-page="${CANDIDATE_PROFILE_360_PAGE_MARKER}"]`)).toBeVisible();
        await expect(page.locator(`[data-testid="${CANDIDATE_PROFILE_360_MARKERS.boundary}"]`)).toBeVisible();
      }
    });
  });

  test("invalid id shows meaningful not-found — not 404 shell", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      const response = await page.goto(INVALID_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      expect(response?.status() ?? 0).not.toBe(404);
      await page
        .locator(`[data-testid="${CANDIDATE_PROFILE_360_MARKERS.notFound}"]`)
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = await bodyText(page);
      expect(body.length).toBeGreaterThan(32);
      const title = await page.title();
      expect(title.toLowerCase()).not.toContain("404");
      if (!isAuthShell(body.toLowerCase())) {
        await expect(page.locator(`[data-testid="${CANDIDATE_PROFILE_360_MARKERS.notFound}"]`)).toBeVisible();
      }
    });
  });

  test("company alias route resolves same demo or auth shell", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      const companyPath = `/company/candidates/${CANDIDATE_PROFILE_360_DEMO_ID}`;
      const response = await page.goto(companyPath, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      expect(response?.status() ?? 0).not.toBe(404);
      await page
        .locator(
          `[data-candidate-profile-360-page="${CANDIDATE_PROFILE_360_PAGE_MARKER}"], [data-testid="${CANDIDATE_PROFILE_360_MARKERS.notFound}"], :text("Sign in"), :text("Zaloguj")`,
        )
        .first()
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      expect(body.length).toBeGreaterThan(32);
      if (!isAuthShell(body)) {
        await expect(
          page.locator(
            `[data-candidate-profile-360-page="${CANDIDATE_PROFILE_360_PAGE_MARKER}"], [data-testid="${CANDIDATE_PROFILE_360_MARKERS.notFound}"]`,
          ).first(),
        ).toBeVisible();
      }
    });
  });
});
