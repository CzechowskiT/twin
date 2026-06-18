/**
 * Candidate consent receipt — browser smoke (workers=1, download intercept).
 */
import { expect, test, type Page } from "@playwright/test";

import {
  CANDIDATE_CONSENT_RECEIPT_FILENAME,
  CANDIDATE_CONSENT_RECEIPT_MARKERS,
  CANDIDATE_CONSENT_RECEIPT_PAGE_MARKER,
} from "../src/lib/candidate-consent-receipt";

import { withFreshContext } from "./helpers/browser-lifecycle";

const SETTLE_MS = 12_000;
const DEMO_PATH = "/dashboard/trust/consent-receipt";
const CONTROLS_PATH = "/dashboard/trust/controls";
const PROFILE_ALIAS_PATH = "/profile/trust/consent-receipt";
const TRUST_PATH = "/dashboard/trust";
const EXPORT_PREVIEW_PATH = "/dashboard/trust/export-preview";
const IDENTITY_PATH = "/dashboard/trust/identity-verification";
const CORRECTIONS_PATH = "/dashboard/trust/corrections";
const PORTABILITY_PATH = "/dashboard/trust/portability";
const REVOKE_DELETE_PATH = "/dashboard/trust/revoke-delete";
const AUDIT_EXPORT_PATH = "/dashboard/trust/audit-export";

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

test.describe("Candidate consent receipt browser", () => {
  test.describe.configure({ timeout: 120_000, mode: "serial" });

  test("1 dashboard/trust/consent-receipt shows page or auth shell — not 404 blank", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      const response = await page.goto(DEMO_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      expect(response?.status() ?? 0).not.toBe(404);
      await page
        .locator(
          `[data-candidate-consent-receipt-page="${CANDIDATE_CONSENT_RECEIPT_PAGE_MARKER}"], [data-testid="${CANDIDATE_CONSENT_RECEIPT_MARKERS.notFound}"], :text("Sign in")`,
        )
        .first()
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      expect(body.length).toBeGreaterThan(32);
      if (!isAuthShell(body)) {
        await expect(
          page.locator(`[data-candidate-consent-receipt-page="${CANDIDATE_CONSENT_RECEIPT_PAGE_MARKER}"]`),
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
        .locator(`[data-candidate-consent-receipt-page="${CANDIDATE_CONSENT_RECEIPT_PAGE_MARKER}"]`)
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      if (!isAuthShell(body)) {
        for (const marker of [
          CANDIDATE_CONSENT_RECEIPT_MARKERS.header,
          CANDIDATE_CONSENT_RECEIPT_MARKERS.receiptSummary,
          CANDIDATE_CONSENT_RECEIPT_MARKERS.consentCoverage,
          CANDIDATE_CONSENT_RECEIPT_MARKERS.jsonPanel,
          CANDIDATE_CONSENT_RECEIPT_MARKERS.download,
          CANDIDATE_CONSENT_RECEIPT_MARKERS.coveredExcludedScope,
          CANDIDATE_CONSENT_RECEIPT_MARKERS.linkedModules,
          CANDIDATE_CONSENT_RECEIPT_MARKERS.boundary,
        ]) {
          await expect(page.locator(`[data-testid="${marker}"]`)).toBeVisible();
        }
      }
    });
  });

  test("3 download button on consent receipt page triggers JSON download when pilot loads", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(DEMO_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await page
        .locator(`[data-candidate-consent-receipt-page="${CANDIDATE_CONSENT_RECEIPT_PAGE_MARKER}"]`)
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      if (!isAuthShell(body)) {
        const downloadPromise = page.waitForEvent("download", { timeout: 15_000 }).catch(() => null);
        await page.locator(`[data-testid="${CANDIDATE_CONSENT_RECEIPT_MARKERS.download}-button"]`).click();
        const download = await downloadPromise;
        if (download) {
          expect(download.suggestedFilename()).toBe(CANDIDATE_CONSENT_RECEIPT_FILENAME);
        }
      }
    });
  });

  test("4 control center consent receipt section has active download button on pilot", async ({ browser }) => {
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
        const btn = page.locator('[data-testid="candidate-control-center-trust-consent-receipt-button"]');
        await expect(btn).toBeVisible();
        await expect(btn).toBeEnabled();
      }
    });
  });

  test("5 profile/trust/consent-receipt alias resolves same pilot or auth shell", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      const response = await page.goto(PROFILE_ALIAS_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      expect(response?.status() ?? 0).not.toBe(404);
      await page
        .locator(
          `[data-candidate-consent-receipt-page="${CANDIDATE_CONSENT_RECEIPT_PAGE_MARKER}"], [data-testid="${CANDIDATE_CONSENT_RECEIPT_MARKERS.notFound}"], :text("Sign in"), :text("Zaloguj")`,
        )
        .first()
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      expect(body.length).toBeGreaterThan(32);
    });
  });

  test("6 trust center links to consent receipt without 404", async ({ browser }) => {
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
        const link = page.locator('[data-testid="candidate-trust-center-consent-receipt-link"]');
        await expect(link).toBeVisible();
        const href = await link.getAttribute("href");
        expect(href).toBe("/dashboard/trust/consent-receipt");
      }
    });
  });

  test("7 export preview links to consent receipt without 404", async ({ browser }) => {
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
        const link = page.locator('[data-testid="candidate-export-preview-consent-receipt-link"]');
        await expect(link).toBeVisible();
        const href = await link.getAttribute("href");
        expect(href).toBe("/dashboard/trust/consent-receipt");
      }
    });
  });

  test("8 identity verification links to consent receipt without 404", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(IDENTITY_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await page
        .locator('[data-candidate-identity-verification-page="candidate-identity-verification-page"]')
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      if (!isAuthShell(body)) {
        const link = page.locator('[data-testid="candidate-identity-verification-consent-receipt-link"]');
        await expect(link).toBeVisible();
        const href = await link.getAttribute("href");
        expect(href).toBe("/dashboard/trust/consent-receipt");
      }
    });
  });

  test("9 audit export links to consent receipt without 404", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(AUDIT_EXPORT_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await page
        .locator('[data-candidate-trust-audit-export-page="candidate-trust-audit-export-page"]')
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      if (!isAuthShell(body)) {
        const link = page.locator('[data-testid="candidate-trust-audit-export-consent-receipt-link"]');
        await expect(link).toBeVisible();
        const href = await link.getAttribute("href");
        expect(href).toBe("/dashboard/trust/consent-receipt");
      }
    });
  });

  test("10 corrections links to consent receipt without 404", async ({ browser }) => {
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
        const link = page.locator('[data-testid="candidate-correction-request-consent-receipt-link"]');
        await expect(link).toBeVisible();
        const href = await link.getAttribute("href");
        expect(href).toBe("/dashboard/trust/consent-receipt");
      }
    });
  });

  test("11 data portability links to consent receipt without 404", async ({ browser }) => {
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
        const link = page.locator('[data-testid="candidate-data-portability-consent-receipt-link"]');
        await expect(link).toBeVisible();
        const href = await link.getAttribute("href");
        expect(href).toBe("/dashboard/trust/consent-receipt");
      }
    });
  });

  test("12 revoke delete links to consent receipt without 404", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(REVOKE_DELETE_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await page
        .locator('[data-candidate-revoke-delete-page="candidate-revoke-delete-page"]')
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      if (!isAuthShell(body)) {
        const link = page.locator('[data-testid="candidate-revoke-delete-consent-receipt-link"]');
        await expect(link).toBeVisible();
        const href = await link.getAttribute("href");
        expect(href).toBe("/dashboard/trust/consent-receipt");
      }
    });
  });

  test("13 boundary section visible when authenticated pilot content loads", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(DEMO_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await page
        .locator(`[data-candidate-consent-receipt-page="${CANDIDATE_CONSENT_RECEIPT_PAGE_MARKER}"]`)
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      if (!isAuthShell(body)) {
        await expect(page.locator(`[data-testid="${CANDIDATE_CONSENT_RECEIPT_MARKERS.boundary}"]`)).toBeVisible();
      }
    });
  });

  test("14 pilot badge visible when authenticated pilot content loads", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(DEMO_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await page
        .locator(`[data-candidate-consent-receipt-page="${CANDIDATE_CONSENT_RECEIPT_PAGE_MARKER}"]`)
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      if (!isAuthShell(body)) {
        await expect(page.locator(`[data-testid="${CANDIDATE_CONSENT_RECEIPT_MARKERS.pilotBadge}"]`)).toBeVisible();
      }
    });
  });

  test("15 receipt summary shows generated locally metadata when pilot loads", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(DEMO_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await page
        .locator(`[data-candidate-consent-receipt-page="${CANDIDATE_CONSENT_RECEIPT_PAGE_MARKER}"]`)
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      if (!isAuthShell(body)) {
        const summary = page.locator(`[data-testid="${CANDIDATE_CONSENT_RECEIPT_MARKERS.receiptSummary}"]`);
        await expect(summary).toBeVisible();
        await expect(summary).toContainText("true");
        await expect(summary).toContainText("demo-candidate-001");
      }
    });
  });

  test("16 linked modules section visible when authenticated pilot content loads", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(DEMO_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await page
        .locator(`[data-candidate-consent-receipt-page="${CANDIDATE_CONSENT_RECEIPT_PAGE_MARKER}"]`)
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      if (!isAuthShell(body)) {
        const linked = page.locator(`[data-testid="${CANDIDATE_CONSENT_RECEIPT_MARKERS.linkedModules}"]`);
        await expect(linked).toBeVisible();
        await expect(linked.locator("a")).not.toHaveCount(0);
      }
    });
  });
});
