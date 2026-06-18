/**
 * Candidate identity verification — browser smoke (workers=1).
 */
import { expect, test, type Page } from "@playwright/test";

import {
  CANDIDATE_IDENTITY_VERIFICATION_MARKERS,
  CANDIDATE_IDENTITY_VERIFICATION_PAGE_MARKER,
} from "../src/lib/candidate-identity-verification";

import { withFreshContext } from "./helpers/browser-lifecycle";

const SETTLE_MS = 12_000;
const DEMO_PATH = "/dashboard/trust/identity-verification";
const CONTROLS_PATH = "/dashboard/trust/controls";
const PROFILE_ALIAS_PATH = "/profile/trust/identity-verification";
const TRUST_PATH = "/dashboard/trust";
const EXPORT_PREVIEW_PATH = "/dashboard/trust/export-preview";

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

test.describe("Candidate identity verification browser", () => {
  test.describe.configure({ timeout: 120_000, mode: "serial" });

  test("1 dashboard/trust/identity-verification shows page or auth shell — not 404 blank", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      const response = await page.goto(DEMO_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      expect(response?.status() ?? 0).not.toBe(404);
      await page
        .locator(
          `[data-candidate-identity-verification-page="${CANDIDATE_IDENTITY_VERIFICATION_PAGE_MARKER}"], [data-testid="${CANDIDATE_IDENTITY_VERIFICATION_MARKERS.notFound}"], :text("Sign in")`,
        )
        .first()
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      expect(body.length).toBeGreaterThan(32);
      if (!isAuthShell(body)) {
        await expect(
          page.locator(`[data-candidate-identity-verification-page="${CANDIDATE_IDENTITY_VERIFICATION_PAGE_MARKER}"]`),
        ).toBeVisible();
      }
    });
  });

  test("2 all eight section markers visible when pilot loads", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(DEMO_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await page
        .locator(`[data-candidate-identity-verification-page="${CANDIDATE_IDENTITY_VERIFICATION_PAGE_MARKER}"]`)
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      if (!isAuthShell(body)) {
        for (const marker of [
          CANDIDATE_IDENTITY_VERIFICATION_MARKERS.header,
          CANDIDATE_IDENTITY_VERIFICATION_MARKERS.currentStatus,
          CANDIDATE_IDENTITY_VERIFICATION_MARKERS.futureFlowPreview,
          CANDIDATE_IDENTITY_VERIFICATION_MARKERS.dataSharedPreview,
          CANDIDATE_IDENTITY_VERIFICATION_MARKERS.disabledActions,
          CANDIDATE_IDENTITY_VERIFICATION_MARKERS.auditTimeline,
          CANDIDATE_IDENTITY_VERIFICATION_MARKERS.linkedModules,
          CANDIDATE_IDENTITY_VERIFICATION_MARKERS.boundary,
        ]) {
          await expect(page.locator(`[data-testid="${marker}"]`)).toBeVisible();
        }
      }
    });
  });

  test("3 start button disabled on identity verification page when pilot loads", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(DEMO_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await page
        .locator(`[data-candidate-identity-verification-page="${CANDIDATE_IDENTITY_VERIFICATION_PAGE_MARKER}"]`)
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      if (!isAuthShell(body)) {
        await expect(page.locator(`[data-testid="${CANDIDATE_IDENTITY_VERIFICATION_MARKERS.startDisabled}"]`)).toBeDisabled();
      }
    });
  });

  test("4 control center identity section has disabled start on pilot", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(CONTROLS_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await page
        .locator('[data-candidate-control-center-page="candidate-control-center-page"]')
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      if (!isAuthShell(body)) {
        const btn = page.locator(`[data-testid="${CANDIDATE_IDENTITY_VERIFICATION_MARKERS.startDisabled}"]`);
        await expect(btn).toBeVisible();
        await expect(btn).toBeDisabled();
      }
    });
  });

  test("5 profile/trust/identity-verification alias resolves same pilot or auth shell", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      const response = await page.goto(PROFILE_ALIAS_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      expect(response?.status() ?? 0).not.toBe(404);
      await page
        .locator(
          `[data-candidate-identity-verification-page="${CANDIDATE_IDENTITY_VERIFICATION_PAGE_MARKER}"], [data-testid="${CANDIDATE_IDENTITY_VERIFICATION_MARKERS.notFound}"], :text("Sign in"), :text("Zaloguj")`,
        )
        .first()
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      expect(body.length).toBeGreaterThan(32);
    });
  });

  test("6 trust center links to identity verification without 404", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(TRUST_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await page
        .locator('[data-candidate-trust-center-page="candidate-trust-center-page"]')
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      if (!isAuthShell(body)) {
        const link = page.locator('[data-testid="candidate-trust-center-identity-verification-link"]');
        await expect(link).toBeVisible();
        const href = await link.getAttribute("href");
        expect(href).toBe("/dashboard/trust/identity-verification");
      }
    });
  });

  test("7 export preview links to identity verification without 404", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(EXPORT_PREVIEW_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await page
        .locator('[data-candidate-export-preview-page="candidate-export-preview-page"]')
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      if (!isAuthShell(body)) {
        const link = page.locator('[data-testid="candidate-export-preview-identity-verification-link"]');
        await expect(link).toBeVisible();
        const href = await link.getAttribute("href");
        expect(href).toBe("/dashboard/trust/identity-verification");
      }
    });
  });

  test("8 boundary section visible when authenticated pilot content loads", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(DEMO_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await page
        .locator(`[data-candidate-identity-verification-page="${CANDIDATE_IDENTITY_VERIFICATION_PAGE_MARKER}"]`)
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      if (!isAuthShell(body)) {
        await expect(page.locator(`[data-testid="${CANDIDATE_IDENTITY_VERIFICATION_MARKERS.boundary}"]`)).toBeVisible();
      }
    });
  });

  test("9 current status warning readable when pilot loads", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(DEMO_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await page
        .locator(`[data-candidate-identity-verification-page="${CANDIDATE_IDENTITY_VERIFICATION_PAGE_MARKER}"]`)
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      if (!isAuthShell(body)) {
        await expect(page.locator(`[data-testid="${CANDIDATE_IDENTITY_VERIFICATION_MARKERS.currentStatus}"]`)).toBeVisible();
        expect(body).toMatch(/pilot|niedostępn|not available|provider/);
      }
    });
  });

  test("10 pilot badge visible when authenticated pilot content loads", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(DEMO_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await page
        .locator(`[data-candidate-identity-verification-page="${CANDIDATE_IDENTITY_VERIFICATION_PAGE_MARKER}"]`)
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      if (!isAuthShell(body)) {
        await expect(page.locator(`[data-testid="${CANDIDATE_IDENTITY_VERIFICATION_MARKERS.pilotBadge}"]`)).toBeVisible();
      }
    });
  });
});
