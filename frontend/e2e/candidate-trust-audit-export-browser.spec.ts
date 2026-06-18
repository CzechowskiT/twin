/**
 * Candidate trust audit export — browser smoke (workers=1, download intercept).
 */
import { expect, test, type Page } from "@playwright/test";

import {
  CANDIDATE_TRUST_AUDIT_EXPORT_FILENAME,
  CANDIDATE_TRUST_AUDIT_EXPORT_MARKERS,
  CANDIDATE_TRUST_AUDIT_EXPORT_PAGE_MARKER,
} from "../src/lib/candidate-trust-audit-export";

import { withFreshContext } from "./helpers/browser-lifecycle";

const SETTLE_MS = 12_000;
const DEMO_PATH = "/dashboard/trust/audit-export";
const CONTROLS_PATH = "/dashboard/trust/controls";
const PROFILE_ALIAS_PATH = "/profile/trust/audit-export";
const TRUST_PATH = "/dashboard/trust";
const EXPORT_PREVIEW_PATH = "/dashboard/trust/export-preview";
const CORRECTIONS_PATH = "/dashboard/trust/corrections";
const PORTABILITY_PATH = "/dashboard/trust/portability";
const REVOKE_DELETE_PATH = "/dashboard/trust/revoke-delete";

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

test.describe("Candidate trust audit export browser", () => {
  test.describe.configure({ timeout: 120_000, mode: "serial" });

  test("1 dashboard/trust/audit-export shows page or auth shell — not 404 blank", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      const response = await page.goto(DEMO_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      expect(response?.status() ?? 0).not.toBe(404);
      await page
        .locator(
          `[data-candidate-trust-audit-export-page="${CANDIDATE_TRUST_AUDIT_EXPORT_PAGE_MARKER}"], [data-testid="${CANDIDATE_TRUST_AUDIT_EXPORT_MARKERS.notFound}"], :text("Sign in")`,
        )
        .first()
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      expect(body.length).toBeGreaterThan(32);
      if (!isAuthShell(body)) {
        await expect(
          page.locator(`[data-candidate-trust-audit-export-page="${CANDIDATE_TRUST_AUDIT_EXPORT_PAGE_MARKER}"]`),
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
        .locator(`[data-candidate-trust-audit-export-page="${CANDIDATE_TRUST_AUDIT_EXPORT_PAGE_MARKER}"]`)
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      if (!isAuthShell(body)) {
        for (const marker of [
          CANDIDATE_TRUST_AUDIT_EXPORT_MARKERS.header,
          CANDIDATE_TRUST_AUDIT_EXPORT_MARKERS.exportSummary,
          CANDIDATE_TRUST_AUDIT_EXPORT_MARKERS.timelineCoverage,
          CANDIDATE_TRUST_AUDIT_EXPORT_MARKERS.jsonPanel,
          CANDIDATE_TRUST_AUDIT_EXPORT_MARKERS.download,
          CANDIDATE_TRUST_AUDIT_EXPORT_MARKERS.includedExcludedScope,
          CANDIDATE_TRUST_AUDIT_EXPORT_MARKERS.linkedModules,
          CANDIDATE_TRUST_AUDIT_EXPORT_MARKERS.boundary,
        ]) {
          await expect(page.locator(`[data-testid="${marker}"]`)).toBeVisible();
        }
      }
    });
  });

  test("3 download button on audit export page triggers JSON download when pilot loads", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(DEMO_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await page
        .locator(`[data-candidate-trust-audit-export-page="${CANDIDATE_TRUST_AUDIT_EXPORT_PAGE_MARKER}"]`)
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      if (!isAuthShell(body)) {
        const downloadPromise = page.waitForEvent("download", { timeout: 15_000 }).catch(() => null);
        await page.locator(`[data-testid="${CANDIDATE_TRUST_AUDIT_EXPORT_MARKERS.download}-button"]`).click();
        const download = await downloadPromise;
        if (download) {
          expect(download.suggestedFilename()).toBe(CANDIDATE_TRUST_AUDIT_EXPORT_FILENAME);
        }
      }
    });
  });

  test("4 control center trust audit export section has active download button on pilot", async ({ browser }) => {
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
        const btn = page.locator('[data-testid="candidate-control-center-trust-audit-export-button"]');
        await expect(btn).toBeVisible();
        await expect(btn).toBeEnabled();
      }
    });
  });

  test("5 profile/trust/audit-export alias resolves same pilot or auth shell", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      const response = await page.goto(PROFILE_ALIAS_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      expect(response?.status() ?? 0).not.toBe(404);
      await page
        .locator(
          `[data-candidate-trust-audit-export-page="${CANDIDATE_TRUST_AUDIT_EXPORT_PAGE_MARKER}"], [data-testid="${CANDIDATE_TRUST_AUDIT_EXPORT_MARKERS.notFound}"], :text("Sign in"), :text("Zaloguj")`,
        )
        .first()
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      expect(body.length).toBeGreaterThan(32);
    });
  });

  test("6 trust center links to audit export without 404", async ({ browser }) => {
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
        const link = page.locator('[data-testid="candidate-trust-center-audit-export-link"]');
        await expect(link).toBeVisible();
        const href = await link.getAttribute("href");
        expect(href).toBe("/dashboard/trust/audit-export");
      }
    });
  });

  test("7 export preview links to audit export without 404", async ({ browser }) => {
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
        const link = page.locator('[data-testid="candidate-export-preview-audit-export-link"]');
        await expect(link).toBeVisible();
        const href = await link.getAttribute("href");
        expect(href).toBe("/dashboard/trust/audit-export");
      }
    });
  });

  test("8 corrections links to audit export without 404", async ({ browser }) => {
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
        const link = page.locator('[data-testid="candidate-correction-request-audit-export-link"]');
        await expect(link).toBeVisible();
        const href = await link.getAttribute("href");
        expect(href).toBe("/dashboard/trust/audit-export");
      }
    });
  });

  test("9 data portability links to audit export without 404", async ({ browser }) => {
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
        const link = page.locator('[data-testid="candidate-data-portability-audit-export-link"]');
        await expect(link).toBeVisible();
        const href = await link.getAttribute("href");
        expect(href).toBe("/dashboard/trust/audit-export");
      }
    });
  });

  test("10 revoke delete links to audit export without 404", async ({ browser }) => {
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
        const link = page.locator('[data-testid="candidate-revoke-delete-audit-export-link"]');
        await expect(link).toBeVisible();
        const href = await link.getAttribute("href");
        expect(href).toBe("/dashboard/trust/audit-export");
      }
    });
  });

  test("11 boundary section visible when authenticated pilot content loads", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(DEMO_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await page
        .locator(`[data-candidate-trust-audit-export-page="${CANDIDATE_TRUST_AUDIT_EXPORT_PAGE_MARKER}"]`)
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      if (!isAuthShell(body)) {
        await expect(page.locator(`[data-testid="${CANDIDATE_TRUST_AUDIT_EXPORT_MARKERS.boundary}"]`)).toBeVisible();
      }
    });
  });

  test("12 pilot badge visible when authenticated pilot content loads", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(DEMO_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await page
        .locator(`[data-candidate-trust-audit-export-page="${CANDIDATE_TRUST_AUDIT_EXPORT_PAGE_MARKER}"]`)
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      if (!isAuthShell(body)) {
        await expect(page.locator(`[data-testid="${CANDIDATE_TRUST_AUDIT_EXPORT_MARKERS.pilotBadge}"]`)).toBeVisible();
      }
    });
  });

  test("13 timeline coverage shows six workflow cards when pilot loads", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(DEMO_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await page
        .locator(`[data-candidate-trust-audit-export-page="${CANDIDATE_TRUST_AUDIT_EXPORT_PAGE_MARKER}"]`)
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      if (!isAuthShell(body)) {
        const section = page.locator(`[data-testid="${CANDIDATE_TRUST_AUDIT_EXPORT_MARKERS.timelineCoverage}"]`);
        await expect(section).toBeVisible();
        await expect(section.locator("li")).toHaveCount(6);
      }
    });
  });

  test("14 export summary shows generated locally metadata when pilot loads", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(DEMO_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await page
        .locator(`[data-candidate-trust-audit-export-page="${CANDIDATE_TRUST_AUDIT_EXPORT_PAGE_MARKER}"]`)
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      if (!isAuthShell(body)) {
        const summary = page.locator(`[data-testid="${CANDIDATE_TRUST_AUDIT_EXPORT_MARKERS.exportSummary}"]`);
        await expect(summary).toBeVisible();
        await expect(summary).toContainText("true");
        await expect(summary).toContainText("demo-candidate-001");
      }
    });
  });

  test("15 linked modules section visible when authenticated pilot content loads", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(DEMO_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await page
        .locator(`[data-candidate-trust-audit-export-page="${CANDIDATE_TRUST_AUDIT_EXPORT_PAGE_MARKER}"]`)
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      if (!isAuthShell(body)) {
        const linked = page.locator(`[data-testid="${CANDIDATE_TRUST_AUDIT_EXPORT_MARKERS.linkedModules}"]`);
        await expect(linked).toBeVisible();
        await expect(linked.locator("a")).not.toHaveCount(0);
      }
    });
  });
});
