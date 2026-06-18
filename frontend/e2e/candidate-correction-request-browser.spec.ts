/**
 * Candidate correction request — browser smoke (workers=1).
 */
import { expect, test, type Page } from "@playwright/test";

import {
  CANDIDATE_CORRECTION_REQUEST_MARKERS,
  CANDIDATE_CORRECTION_REQUEST_PAGE_MARKER,
} from "../src/lib/candidate-correction-request";

import { withFreshContext } from "./helpers/browser-lifecycle";

const SETTLE_MS = 12_000;
const DEMO_PATH = "/dashboard/trust/corrections";
const CONTROLS_PATH = "/dashboard/trust/controls";
const PROFILE_ALIAS_PATH = "/profile/trust/corrections";
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

test.describe("Candidate correction request browser", () => {
  test.describe.configure({ timeout: 120_000, mode: "serial" });

  test("1 dashboard/trust/corrections shows page or auth shell — not 404 blank", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      const response = await page.goto(DEMO_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      expect(response?.status() ?? 0).not.toBe(404);
      await page
        .locator(
          `[data-candidate-correction-request-page="${CANDIDATE_CORRECTION_REQUEST_PAGE_MARKER}"], [data-testid="${CANDIDATE_CORRECTION_REQUEST_MARKERS.notFound}"], :text("Sign in")`,
        )
        .first()
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      expect(body.length).toBeGreaterThan(32);
      if (!isAuthShell(body)) {
        await expect(
          page.locator(`[data-candidate-correction-request-page="${CANDIDATE_CORRECTION_REQUEST_PAGE_MARKER}"]`),
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
        .locator(`[data-candidate-correction-request-page="${CANDIDATE_CORRECTION_REQUEST_PAGE_MARKER}"]`)
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      if (!isAuthShell(body)) {
        for (const marker of [
          CANDIDATE_CORRECTION_REQUEST_MARKERS.header,
          CANDIDATE_CORRECTION_REQUEST_MARKERS.categories,
          CANDIDATE_CORRECTION_REQUEST_MARKERS.draftRequest,
          CANDIDATE_CORRECTION_REQUEST_MARKERS.evidence,
          CANDIDATE_CORRECTION_REQUEST_MARKERS.review,
          CANDIDATE_CORRECTION_REQUEST_MARKERS.auditPreview,
          CANDIDATE_CORRECTION_REQUEST_MARKERS.linkedModules,
          CANDIDATE_CORRECTION_REQUEST_MARKERS.plannedWorkflow,
          CANDIDATE_CORRECTION_REQUEST_MARKERS.boundary,
        ]) {
          await expect(page.locator(`[data-testid="${marker}"]`)).toBeVisible();
        }
      }
    });
  });

  test("3 submit button disabled on correction request page when pilot loads", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(DEMO_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await page
        .locator(`[data-candidate-correction-request-page="${CANDIDATE_CORRECTION_REQUEST_PAGE_MARKER}"]`)
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      if (!isAuthShell(body)) {
        await expect(page.locator(`[data-testid="${CANDIDATE_CORRECTION_REQUEST_MARKERS.submitDisabled}"]`)).toBeDisabled();
      }
    });
  });

  test("4 control center correction section has disabled submit on pilot", async ({ browser }) => {
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
        const btn = page.locator('[data-testid="candidate-control-center-correction-request-submit"]');
        await expect(btn).toBeVisible();
        await expect(btn).toBeDisabled();
      }
    });
  });

  test("5 profile/trust/corrections alias resolves same pilot or auth shell", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      const response = await page.goto(PROFILE_ALIAS_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      expect(response?.status() ?? 0).not.toBe(404);
      await page
        .locator(
          `[data-candidate-correction-request-page="${CANDIDATE_CORRECTION_REQUEST_PAGE_MARKER}"], [data-testid="${CANDIDATE_CORRECTION_REQUEST_MARKERS.notFound}"], :text("Sign in"), :text("Zaloguj")`,
        )
        .first()
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      expect(body.length).toBeGreaterThan(32);
    });
  });

  test("6 trust center links to corrections without 404", async ({ browser }) => {
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
        const link = page.locator('[data-testid="candidate-trust-center-correction-request-link"]');
        await expect(link).toBeVisible();
        const href = await link.getAttribute("href");
        expect(href).toBe("/dashboard/trust/corrections");
      }
    });
  });

  test("7 export preview links to corrections without 404", async ({ browser }) => {
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
        const link = page.locator('[data-testid="candidate-export-preview-correction-request-link"]');
        await expect(link).toBeVisible();
        const href = await link.getAttribute("href");
        expect(href).toBe("/dashboard/trust/corrections");
      }
    });
  });

  test("8 boundary section visible when authenticated pilot content loads", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(DEMO_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await page
        .locator(`[data-candidate-correction-request-page="${CANDIDATE_CORRECTION_REQUEST_PAGE_MARKER}"]`)
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      if (!isAuthShell(body)) {
        await expect(page.locator(`[data-testid="${CANDIDATE_CORRECTION_REQUEST_MARKERS.boundary}"]`)).toBeVisible();
      }
    });
  });

  test("9 six correction categories rendered when pilot loads", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(DEMO_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await page
        .locator(`[data-candidate-correction-request-page="${CANDIDATE_CORRECTION_REQUEST_PAGE_MARKER}"]`)
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      if (!isAuthShell(body)) {
        const items = page.locator(`[data-testid="${CANDIDATE_CORRECTION_REQUEST_MARKERS.categories}"] li`);
        await expect(items).toHaveCount(6);
      }
    });
  });

  test("10 pilot badge visible when authenticated pilot content loads", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(DEMO_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await page
        .locator(`[data-candidate-correction-request-page="${CANDIDATE_CORRECTION_REQUEST_PAGE_MARKER}"]`)
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      if (!isAuthShell(body)) {
        await expect(page.locator(`[data-testid="${CANDIDATE_CORRECTION_REQUEST_MARKERS.pilotBadge}"]`)).toBeVisible();
      }
    });
  });
});
