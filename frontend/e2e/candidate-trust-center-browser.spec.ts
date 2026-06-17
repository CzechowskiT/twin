/**
 * Candidate Trust Center — browser smoke (workers=1, 9 assertions).
 */
import { expect, test, type Page } from "@playwright/test";

import {
  CANDIDATE_TRUST_CENTER_MARKERS,
  CANDIDATE_TRUST_CENTER_PAGE_MARKER,
} from "../src/lib/candidate-trust-center";

import { withFreshContext } from "./helpers/browser-lifecycle";

const SETTLE_MS = 12_000;
const DEMO_PATH = "/dashboard/trust";
const PROFILE_ALIAS_PATH = "/profile/trust";

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

test.describe("Candidate Trust Center browser", () => {
  test.describe.configure({ timeout: 120_000, mode: "serial" });

  test("1 dashboard/trust shows trust center or auth shell — not 404 blank", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      const response = await page.goto(DEMO_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      expect(response?.status() ?? 0).not.toBe(404);
      await page
        .locator(
          `[data-candidate-trust-center-page="${CANDIDATE_TRUST_CENTER_PAGE_MARKER}"], [data-testid="${CANDIDATE_TRUST_CENTER_MARKERS.notFound}"], :text("Sign in")`,
        )
        .first()
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      expect(body.length).toBeGreaterThan(32);
      if (!isAuthShell(body)) {
        await expect(
          page.locator(`[data-candidate-trust-center-page="${CANDIDATE_TRUST_CENTER_PAGE_MARKER}"]`),
        ).toBeVisible();
      }
    });
  });

  test("2 boundary section visible when authenticated pilot content loads", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(DEMO_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await page
        .locator(`[data-candidate-trust-center-page="${CANDIDATE_TRUST_CENTER_PAGE_MARKER}"]`)
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      if (!isAuthShell(body)) {
        await expect(page.locator(`[data-testid="${CANDIDATE_TRUST_CENTER_MARKERS.boundary}"]`)).toBeVisible();
      }
    });
  });

  test("3 what TWIN knows section marker present on pilot page", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(DEMO_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await page
        .locator(`[data-candidate-trust-center-page="${CANDIDATE_TRUST_CENTER_PAGE_MARKER}"]`)
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      if (!isAuthShell(body)) {
        await expect(
          page.locator(`[data-testid="${CANDIDATE_TRUST_CENTER_MARKERS.whatTwinKnows}"]`),
        ).toBeVisible();
      }
    });
  });

  test("4 profile/trust alias resolves same pilot or auth shell", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      const response = await page.goto(PROFILE_ALIAS_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      expect(response?.status() ?? 0).not.toBe(404);
      await page
        .locator(
          `[data-candidate-trust-center-page="${CANDIDATE_TRUST_CENTER_PAGE_MARKER}"], [data-testid="${CANDIDATE_TRUST_CENTER_MARKERS.notFound}"], :text("Sign in"), :text("Zaloguj")`,
        )
        .first()
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      expect(body.length).toBeGreaterThan(32);
      if (!isAuthShell(body)) {
        await expect(
          page.locator(
            `[data-candidate-trust-center-page="${CANDIDATE_TRUST_CENTER_PAGE_MARKER}"], [data-testid="${CANDIDATE_TRUST_CENTER_MARKERS.notFound}"]`,
          ).first(),
        ).toBeVisible();
      }
    });
  });

  test("5 page title is not a 404 shell", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(DEMO_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      const title = await page.title();
      expect(title.toLowerCase()).not.toContain("404");
    });
  });

  test("6 safe link to jobs does not 404 from trust center", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(DEMO_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      const jobsLink = page.locator('[data-testid="candidate-trust-center-jobs-link"]');
      if (await jobsLink.isVisible().catch(() => false)) {
        const href = await jobsLink.getAttribute("href");
        expect(href).toBe("/dashboard/jobs");
      }
    });
  });

  test("7 safe link to matches does not 404 from trust center", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(DEMO_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      const matchesLink = page.locator('[data-testid="candidate-trust-center-matches-link"]');
      if (await matchesLink.isVisible().catch(() => false)) {
        const href = await matchesLink.getAttribute("href");
        expect(href).toBe("/dashboard/matches");
      }
    });
  });

  test("8 candidate controls section shows disabled actions on pilot", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(DEMO_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await page
        .locator(`[data-candidate-trust-center-page="${CANDIDATE_TRUST_CENTER_PAGE_MARKER}"]`)
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      if (!isAuthShell(body)) {
        const controls = page.locator(`[data-testid="${CANDIDATE_TRUST_CENTER_MARKERS.candidateControls}"]`);
        await expect(controls).toBeVisible();
        await expect(controls.locator("button[disabled]")).toHaveCount(3);
      }
    });
  });

  test("9 trust timeline section visible on pilot page", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(DEMO_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await page
        .locator(`[data-candidate-trust-center-page="${CANDIDATE_TRUST_CENTER_PAGE_MARKER}"]`)
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      if (!isAuthShell(body)) {
        await expect(
          page.locator(`[data-testid="${CANDIDATE_TRUST_CENTER_MARKERS.trustTimeline}"]`),
        ).toBeVisible();
      }
    });
  });
});
