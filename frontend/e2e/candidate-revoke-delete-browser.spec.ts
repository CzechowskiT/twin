/**
 * Candidate revoke & delete — browser smoke (workers=1).
 */
import { expect, test, type Page } from "@playwright/test";

import {
  CANDIDATE_REVOKE_DELETE_MARKERS,
  CANDIDATE_REVOKE_DELETE_PAGE_MARKER,
} from "../src/lib/candidate-revoke-delete";

import { withFreshContext } from "./helpers/browser-lifecycle";

const SETTLE_MS = 12_000;
const DEMO_PATH = "/dashboard/trust/revoke-delete";
const CONTROLS_PATH = "/dashboard/trust/controls";
const PROFILE_ALIAS_PATH = "/profile/trust/revoke-delete";
const TRUST_PATH = "/dashboard/trust";
const EXPORT_PREVIEW_PATH = "/dashboard/trust/export-preview";
const CORRECTIONS_PATH = "/dashboard/trust/corrections";
const PORTABILITY_PATH = "/dashboard/trust/portability";

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

test.describe("Candidate revoke delete browser", () => {
  test.describe.configure({ timeout: 120_000, mode: "serial" });

  test("1 dashboard/trust/revoke-delete shows page or auth shell — not 404 blank", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      const response = await page.goto(DEMO_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      expect(response?.status() ?? 0).not.toBe(404);
      await page
        .locator(
          `[data-candidate-revoke-delete-page="${CANDIDATE_REVOKE_DELETE_PAGE_MARKER}"], [data-testid="${CANDIDATE_REVOKE_DELETE_MARKERS.notFound}"], :text("Sign in")`,
        )
        .first()
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      expect(body.length).toBeGreaterThan(32);
      if (!isAuthShell(body)) {
        await expect(
          page.locator(`[data-candidate-revoke-delete-page="${CANDIDATE_REVOKE_DELETE_PAGE_MARKER}"]`),
        ).toBeVisible();
      }
    });
  });

  test("2 all nine section markers visible when pilot loads", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(DEMO_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await page
        .locator(`[data-candidate-revoke-delete-page="${CANDIDATE_REVOKE_DELETE_PAGE_MARKER}"]`)
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      if (!isAuthShell(body)) {
        for (const marker of [
          CANDIDATE_REVOKE_DELETE_MARKERS.header,
          CANDIDATE_REVOKE_DELETE_MARKERS.requestTypeSelector,
          CANDIDATE_REVOKE_DELETE_MARKERS.impactPreview,
          CANDIDATE_REVOKE_DELETE_MARKERS.includedExcludedScope,
          CANDIDATE_REVOKE_DELETE_MARKERS.draftRequest,
          CANDIDATE_REVOKE_DELETE_MARKERS.auditTimeline,
          CANDIDATE_REVOKE_DELETE_MARKERS.linkedModules,
          CANDIDATE_REVOKE_DELETE_MARKERS.plannedWorkflow,
          CANDIDATE_REVOKE_DELETE_MARKERS.boundary,
        ]) {
          await expect(page.locator(`[data-testid="${marker}"]`)).toBeVisible();
        }
      }
    });
  });

  test("3 submit button disabled on revoke delete page when pilot loads", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(DEMO_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await page
        .locator(`[data-candidate-revoke-delete-page="${CANDIDATE_REVOKE_DELETE_PAGE_MARKER}"]`)
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      if (!isAuthShell(body)) {
        await expect(page.locator(`[data-testid="${CANDIDATE_REVOKE_DELETE_MARKERS.submitDisabled}"]`)).toBeDisabled();
      }
    });
  });

  test("4 control center revoke delete section has disabled submit on pilot", async ({ browser }) => {
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
        const btn = page.locator('[data-testid="candidate-control-center-revoke-delete-planned-submit"]');
        await expect(btn).toBeVisible();
        await expect(btn).toBeDisabled();
      }
    });
  });

  test("5 profile/trust/revoke-delete alias resolves same pilot or auth shell", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      const response = await page.goto(PROFILE_ALIAS_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      expect(response?.status() ?? 0).not.toBe(404);
      await page
        .locator(
          `[data-candidate-revoke-delete-page="${CANDIDATE_REVOKE_DELETE_PAGE_MARKER}"], [data-testid="${CANDIDATE_REVOKE_DELETE_MARKERS.notFound}"], :text("Sign in"), :text("Zaloguj")`,
        )
        .first()
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      expect(body.length).toBeGreaterThan(32);
    });
  });

  test("6 trust center links to revoke delete without 404", async ({ browser }) => {
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
        const link = page.locator('[data-testid="candidate-trust-center-revoke-delete-link"]');
        await expect(link).toBeVisible();
        const href = await link.getAttribute("href");
        expect(href).toBe("/dashboard/trust/revoke-delete");
      }
    });
  });

  test("7 export preview links to revoke delete without 404", async ({ browser }) => {
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
        const link = page.locator('[data-testid="candidate-export-preview-revoke-delete-link"]');
        await expect(link).toBeVisible();
        const href = await link.getAttribute("href");
        expect(href).toBe("/dashboard/trust/revoke-delete");
      }
    });
  });

  test("8 corrections links to revoke delete without 404", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(CORRECTIONS_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await page
        .locator('[data-candidate-correction-request-page="candidate-correction-request-page"]')
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      if (!isAuthShell(body)) {
        const link = page.locator('[data-testid="candidate-correction-request-revoke-delete-link"]');
        await expect(link).toBeVisible();
        const href = await link.getAttribute("href");
        expect(href).toBe("/dashboard/trust/revoke-delete");
      }
    });
  });

  test("9 data portability links to revoke delete without 404", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(PORTABILITY_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await page
        .locator('[data-candidate-data-portability-page="candidate-data-portability-page"]')
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      if (!isAuthShell(body)) {
        const link = page.locator('[data-testid="candidate-data-portability-revoke-delete-link"]');
        await expect(link).toBeVisible();
        const href = await link.getAttribute("href");
        expect(href).toBe("/dashboard/trust/revoke-delete");
      }
    });
  });

  test("10 boundary section visible when authenticated pilot content loads", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(DEMO_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await page
        .locator(`[data-candidate-revoke-delete-page="${CANDIDATE_REVOKE_DELETE_PAGE_MARKER}"]`)
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      if (!isAuthShell(body)) {
        await expect(page.locator(`[data-testid="${CANDIDATE_REVOKE_DELETE_MARKERS.boundary}"]`)).toBeVisible();
      }
    });
  });

  test("11 pilot badge visible when authenticated pilot content loads", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(DEMO_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await page
        .locator(`[data-candidate-revoke-delete-page="${CANDIDATE_REVOKE_DELETE_PAGE_MARKER}"]`)
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      if (!isAuthShell(body)) {
        await expect(page.locator(`[data-testid="${CANDIDATE_REVOKE_DELETE_MARKERS.pilotBadge}"]`)).toBeVisible();
      }
    });
  });

  test("12 draft section shows revoke_delete_preview request type when pilot loads", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(DEMO_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await page
        .locator(`[data-candidate-revoke-delete-page="${CANDIDATE_REVOKE_DELETE_PAGE_MARKER}"]`)
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      if (!isAuthShell(body)) {
        const draft = page.locator(`[data-testid="${CANDIDATE_REVOKE_DELETE_MARKERS.draftRequest}"]`);
        await expect(draft).toBeVisible();
        await expect(draft).toContainText("revoke_delete_preview");
      }
    });
  });
});
