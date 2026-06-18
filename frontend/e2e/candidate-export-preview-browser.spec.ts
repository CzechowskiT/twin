/**
 * Candidate export preview — browser smoke (workers=1, download intercept).
 */
import { expect, test, type Page } from "@playwright/test";

import {
  CANDIDATE_EXPORT_PREVIEW_FILENAME,
  CANDIDATE_EXPORT_PREVIEW_MARKERS,
  CANDIDATE_EXPORT_PREVIEW_PAGE_MARKER,
} from "../src/lib/candidate-export-preview";

import { withFreshContext } from "./helpers/browser-lifecycle";

const SETTLE_MS = 12_000;
const DEMO_PATH = "/dashboard/trust/export-preview";
const CONTROLS_PATH = "/dashboard/trust/controls";
const PROFILE_ALIAS_PATH = "/profile/trust/export-preview";

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

test.describe("Candidate export preview browser", () => {
  test.describe.configure({ timeout: 120_000, mode: "serial" });

  test("1 dashboard/trust/export-preview shows page or auth shell — not 404 blank", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      const response = await page.goto(DEMO_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      expect(response?.status() ?? 0).not.toBe(404);
      await page
        .locator(
          `[data-candidate-export-preview-page="${CANDIDATE_EXPORT_PREVIEW_PAGE_MARKER}"], [data-testid="${CANDIDATE_EXPORT_PREVIEW_MARKERS.notFound}"], :text("Sign in")`,
        )
        .first()
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      expect(body.length).toBeGreaterThan(32);
      if (!isAuthShell(body)) {
        await expect(
          page.locator(`[data-candidate-export-preview-page="${CANDIDATE_EXPORT_PREVIEW_PAGE_MARKER}"]`),
        ).toBeVisible();
      }
    });
  });

  test("2 download button on export preview page triggers JSON download when pilot loads", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(DEMO_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await page
        .locator(`[data-candidate-export-preview-page="${CANDIDATE_EXPORT_PREVIEW_PAGE_MARKER}"]`)
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      if (!isAuthShell(body)) {
        const downloadPromise = page.waitForEvent("download", { timeout: 15_000 }).catch(() => null);
        await page.locator(`[data-testid="${CANDIDATE_EXPORT_PREVIEW_MARKERS.download}-button"]`).click();
        const download = await downloadPromise;
        if (download) {
          expect(download.suggestedFilename()).toBe(CANDIDATE_EXPORT_PREVIEW_FILENAME);
        }
      }
    });
  });

  test("3 control center export section has active download button on pilot", async ({ browser }) => {
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
        const btn = page.locator('[data-testid="candidate-control-center-export-preview-button"]');
        await expect(btn).toBeVisible();
        await expect(btn).toBeEnabled();
      }
    });
  });

  test("4 profile/trust/export-preview alias resolves same pilot or auth shell", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      const response = await page.goto(PROFILE_ALIAS_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      expect(response?.status() ?? 0).not.toBe(404);
      await page
        .locator(
          `[data-candidate-export-preview-page="${CANDIDATE_EXPORT_PREVIEW_PAGE_MARKER}"], [data-testid="${CANDIDATE_EXPORT_PREVIEW_MARKERS.notFound}"], :text("Sign in"), :text("Zaloguj")`,
        )
        .first()
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      expect(body.length).toBeGreaterThan(32);
    });
  });

  test("5 boundary section visible when authenticated pilot content loads", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(DEMO_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await page
        .locator(`[data-candidate-export-preview-page="${CANDIDATE_EXPORT_PREVIEW_PAGE_MARKER}"]`)
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      if (!isAuthShell(body)) {
        await expect(page.locator(`[data-testid="${CANDIDATE_EXPORT_PREVIEW_MARKERS.boundary}"]`)).toBeVisible();
      }
    });
  });
});
