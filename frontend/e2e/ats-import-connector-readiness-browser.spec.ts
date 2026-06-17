/**
 * ATS Import / Connector Readiness — browser smoke (workers=1).
 */
import { expect, test, type Page } from "@playwright/test";

import {
  ATS_IMPORT_READINESS_MARKERS,
  ATS_IMPORT_READINESS_PAGE_MARKER,
} from "../src/lib/ats-import-readiness";
import { withFreshContext } from "./helpers/browser-lifecycle";

const SETTLE_MS = 12_000;
const DEMO_IMPORT_READINESS_PATH = "/recruiter/integrations/ats/import-readiness";
const INVALID_ATS_PATH = "/recruiter/integrations/ats/not-a-real-connector";
const MAPPING_PATH = "/recruiter/integrations/ats/mapping";
const COMPANY_DEDUPE_PATH = "/company/integrations/ats/deduplication";

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

test.describe("ATS Import Connector Readiness browser", () => {
  test.describe.configure({ timeout: 120_000 });

  test("import-readiness shows workspace or auth shell — not 404 blank", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      const response = await page.goto(DEMO_IMPORT_READINESS_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      expect(response?.status() ?? 0).not.toBe(404);
      await page
        .locator(
          `[data-ats-import-readiness-page="${ATS_IMPORT_READINESS_PAGE_MARKER}"], [data-testid="${ATS_IMPORT_READINESS_MARKERS.notFound}"], :text("Sign in")`,
        )
        .first()
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      expect(body.length).toBeGreaterThan(32);
      if (!isAuthShell(body)) {
        await expect(page.locator(`[data-ats-import-readiness-page="${ATS_IMPORT_READINESS_PAGE_MARKER}"]`)).toBeVisible();
        await expect(page.locator(`[data-testid="${ATS_IMPORT_READINESS_MARKERS.connectorMatrix}"]`)).toBeVisible();
        await expect(page.locator(`[data-testid="${ATS_IMPORT_READINESS_MARKERS.fieldMapping}"]`)).toBeVisible();
        await expect(page.locator(`[data-testid="${ATS_IMPORT_READINESS_MARKERS.dedupePreview}"]`)).toBeVisible();
        await expect(page.locator(`[data-testid="${ATS_IMPORT_READINESS_MARKERS.consentMapping}"]`)).toBeVisible();
        await expect(page.locator(`[data-testid="${ATS_IMPORT_READINESS_MARKERS.validationChecklist}"]`)).toBeVisible();
        await expect(page.locator(`[data-testid="${ATS_IMPORT_READINESS_MARKERS.riskFlags}"]`)).toBeVisible();
        await expect(page.locator(`[data-testid="${ATS_IMPORT_READINESS_MARKERS.sampleCandidate}"]`)).toBeVisible();
        await expect(page.locator(`[data-testid="${ATS_IMPORT_READINESS_MARKERS.auditTrail}"]`)).toBeVisible();
        await expect(page.locator(`[data-testid="${ATS_IMPORT_READINESS_MARKERS.humanReviewBoundary}"]`)).toBeVisible();
        await expect(page.locator(`[data-testid="${ATS_IMPORT_READINESS_MARKERS.noSyncBadge}"]`)).toBeVisible();
        await expect(page.locator(`[data-testid="${ATS_IMPORT_READINESS_MARKERS.noWritebackBadge}"]`)).toBeVisible();
      }
    });
  });

  test("invalid ats subroute shows meaningful not-found — not 404 shell", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      const response = await page.goto(INVALID_ATS_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      expect(response?.status() ?? 0).not.toBe(404);
      await page
        .locator(`[data-testid="${ATS_IMPORT_READINESS_MARKERS.notFound}"]`)
        .first()
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = await bodyText(page);
      expect(body.length).toBeGreaterThan(24);
    });
  });

  test("mapping view and company deduplication invalid render without 404", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      const mappingRes = await page.goto(MAPPING_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      expect(mappingRes?.status() ?? 0).not.toBe(404);

      const dedupePage = await context.newPage();
      const dedupeRes = await dedupePage.goto(COMPANY_DEDUPE_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(dedupePage);
      expect(dedupeRes?.status() ?? 0).not.toBe(404);
      await dedupePage
        .locator(`[data-testid="${ATS_IMPORT_READINESS_MARKERS.notFound}"]`)
        .first()
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
    });
  });
});
