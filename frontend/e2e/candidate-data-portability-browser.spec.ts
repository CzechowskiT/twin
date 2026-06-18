/**
 * Candidate data portability — browser smoke (workers=1).
 */
import { expect, test, type Page } from "@playwright/test";

import {
  CANDIDATE_DATA_PORTABILITY_MARKERS,
  CANDIDATE_DATA_PORTABILITY_PAGE_MARKER,
} from "../src/lib/candidate-data-portability";

import { withFreshContext } from "./helpers/browser-lifecycle";

const SETTLE_MS = 12_000;
const DEMO_PATH = "/dashboard/trust/portability";
const CONTROLS_PATH = "/dashboard/trust/controls";
const PROFILE_ALIAS_PATH = "/profile/trust/portability";
const TRUST_PATH = "/dashboard/trust";
const EXPORT_PREVIEW_PATH = "/dashboard/trust/export-preview";
const CORRECTIONS_PATH = "/dashboard/trust/corrections";

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

test.describe("Candidate data portability browser", () => {
  test.describe.configure({ timeout: 120_000, mode: "serial" });

  test("1 dashboard/trust/portability shows page or auth shell — not 404 blank", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      const response = await page.goto(DEMO_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      expect(response?.status() ?? 0).not.toBe(404);
      await page
        .locator(
          `[data-candidate-data-portability-page="${CANDIDATE_DATA_PORTABILITY_PAGE_MARKER}"], [data-testid="${CANDIDATE_DATA_PORTABILITY_MARKERS.notFound}"], :text("Sign in")`,
        )
        .first()
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      expect(body.length).toBeGreaterThan(32);
      if (!isAuthShell(body)) {
        await expect(
          page.locator(`[data-candidate-data-portability-page="${CANDIDATE_DATA_PORTABILITY_PAGE_MARKER}"]`),
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
        .locator(`[data-candidate-data-portability-page="${CANDIDATE_DATA_PORTABILITY_PAGE_MARKER}"]`)
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      if (!isAuthShell(body)) {
        for (const marker of [
          CANDIDATE_DATA_PORTABILITY_MARKERS.header,
          CANDIDATE_DATA_PORTABILITY_MARKERS.portabilityScope,
          CANDIDATE_DATA_PORTABILITY_MARKERS.includedChecklist,
          CANDIDATE_DATA_PORTABILITY_MARKERS.excludedChecklist,
          CANDIDATE_DATA_PORTABILITY_MARKERS.draftRequest,
          CANDIDATE_DATA_PORTABILITY_MARKERS.auditTimeline,
          CANDIDATE_DATA_PORTABILITY_MARKERS.linkedModules,
          CANDIDATE_DATA_PORTABILITY_MARKERS.plannedWorkflow,
          CANDIDATE_DATA_PORTABILITY_MARKERS.boundary,
        ]) {
          await expect(page.locator(`[data-testid="${marker}"]`)).toBeVisible();
        }
      }
    });
  });

  test("3 submit button disabled on data portability page when pilot loads", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(DEMO_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await page
        .locator(`[data-candidate-data-portability-page="${CANDIDATE_DATA_PORTABILITY_PAGE_MARKER}"]`)
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      if (!isAuthShell(body)) {
        await expect(page.locator(`[data-testid="${CANDIDATE_DATA_PORTABILITY_MARKERS.submitDisabled}"]`)).toBeDisabled();
      }
    });
  });

  test("4 control center portability section has disabled submit on pilot", async ({ browser }) => {
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
        const btn = page.locator('[data-testid="candidate-control-center-data-portability-submit"]');
        await expect(btn).toBeVisible();
        await expect(btn).toBeDisabled();
      }
    });
  });

  test("5 profile/trust/portability alias resolves same pilot or auth shell", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      const response = await page.goto(PROFILE_ALIAS_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      expect(response?.status() ?? 0).not.toBe(404);
      await page
        .locator(
          `[data-candidate-data-portability-page="${CANDIDATE_DATA_PORTABILITY_PAGE_MARKER}"], [data-testid="${CANDIDATE_DATA_PORTABILITY_MARKERS.notFound}"], :text("Sign in"), :text("Zaloguj")`,
        )
        .first()
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      expect(body.length).toBeGreaterThan(32);
    });
  });

  test("6 trust center links to portability without 404", async ({ browser }) => {
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
        const link = page.locator('[data-testid="candidate-trust-center-data-portability-link"]');
        await expect(link).toBeVisible();
        const href = await link.getAttribute("href");
        expect(href).toBe("/dashboard/trust/portability");
      }
    });
  });

  test("7 export preview links to portability without 404", async ({ browser }) => {
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
        const link = page.locator('[data-testid="candidate-export-preview-data-portability-link"]');
        await expect(link).toBeVisible();
        const href = await link.getAttribute("href");
        expect(href).toBe("/dashboard/trust/portability");
      }
    });
  });

  test("8 corrections links to portability without 404", async ({ browser }) => {
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
        const link = page.locator('[data-testid="candidate-correction-request-data-portability-link"]');
        await expect(link).toBeVisible();
        const href = await link.getAttribute("href");
        expect(href).toBe("/dashboard/trust/portability");
      }
    });
  });

  test("9 boundary section visible when authenticated pilot content loads", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(DEMO_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await page
        .locator(`[data-candidate-data-portability-page="${CANDIDATE_DATA_PORTABILITY_PAGE_MARKER}"]`)
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      if (!isAuthShell(body)) {
        await expect(page.locator(`[data-testid="${CANDIDATE_DATA_PORTABILITY_MARKERS.boundary}"]`)).toBeVisible();
      }
    });
  });

  test("10 pilot badge visible when authenticated pilot content loads", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(DEMO_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await page
        .locator(`[data-candidate-data-portability-page="${CANDIDATE_DATA_PORTABILITY_PAGE_MARKER}"]`)
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      if (!isAuthShell(body)) {
        await expect(page.locator(`[data-testid="${CANDIDATE_DATA_PORTABILITY_MARKERS.pilotBadge}"]`)).toBeVisible();
      }
    });
  });

  test("11 draft section shows portability_preview request type when pilot loads", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(DEMO_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await page
        .locator(`[data-candidate-data-portability-page="${CANDIDATE_DATA_PORTABILITY_PAGE_MARKER}"]`)
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      if (!isAuthShell(body)) {
        const draft = page.locator(`[data-testid="${CANDIDATE_DATA_PORTABILITY_MARKERS.draftRequest}"]`);
        await expect(draft).toBeVisible();
        await expect(draft).toContainText("portability_preview");
      }
    });
  });
});
