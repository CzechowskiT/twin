/**
 * Safe Email Communication Layer — browser smoke (workers=1, 18 assertions).
 */
import { expect, test, type Page } from "@playwright/test";

import {
  SAFE_COMMUNICATION_MARKERS,
  SAFE_COMMUNICATION_PAGE_MARKER,
} from "../src/lib/safe-communication";
import { SAFE_COMMUNICATION_CANDIDATE_DEMO_ID } from "../src/lib/safe-communication-demo-data";
import { JOB_PIPELINE_DEMO_ID } from "../src/lib/job-pipeline-demo-data";
import { withFreshContext } from "./helpers/browser-lifecycle";

const SETTLE_MS = 12_000;
const DEMO_CANDIDATE_PATH = `/recruiter/candidates/${SAFE_COMMUNICATION_CANDIDATE_DEMO_ID}/communication`;
const INVALID_CANDIDATE_PATH = "/recruiter/candidates/not-a-real-candidate-id/communication";
const DEMO_JOB_DRAFTS_PATH = `/recruiter/jobs/${JOB_PIPELINE_DEMO_ID}/drafts`;

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

test.describe("Safe Email Communication Layer browser", () => {
  test.describe.configure({ timeout: 120_000 });

  test("demo-candidate-001 communication shows workspace or auth shell — not 404 blank", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      const response = await page.goto(DEMO_CANDIDATE_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      expect(response?.status() ?? 0).not.toBe(404);
      await page
        .locator(
          `[data-safe-communication-page="${SAFE_COMMUNICATION_PAGE_MARKER}"], [data-testid="${SAFE_COMMUNICATION_MARKERS.notFound}"], :text("Sign in")`,
        )
        .first()
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      expect(body.length).toBeGreaterThan(32);
      if (!isAuthShell(body)) {
        await expect(page.locator(`[data-safe-communication-page="${SAFE_COMMUNICATION_PAGE_MARKER}"]`)).toBeVisible();
        await expect(page.locator(`[data-testid="${SAFE_COMMUNICATION_MARKERS.consentWarning}"]`)).toBeVisible();
        await expect(page.locator(`[data-testid="${SAFE_COMMUNICATION_MARKERS.draftLibrary}"]`)).toBeVisible();
        await expect(page.locator(`[data-testid="${SAFE_COMMUNICATION_MARKERS.draftPreview}"]`)).toBeVisible();
        await expect(page.locator(`[data-testid="${SAFE_COMMUNICATION_MARKERS.actions}"]`)).toBeVisible();
        await expect(page.locator(`[data-testid="${SAFE_COMMUNICATION_MARKERS.humanDecisionBoundary}"]`)).toBeVisible();
        await expect(page.locator(`[data-testid="safe-communication-action-send-disabled"]`)).toBeVisible();
        await expect(page.locator(`[data-testid="safe-communication-copy-draft"]`)).toBeVisible();
      }
    });
  });

  test("invalid id shows meaningful not-found — not 404 shell", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      const response = await page.goto(INVALID_CANDIDATE_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      expect(response?.status() ?? 0).not.toBe(404);
      await page
        .locator(`[data-testid="${SAFE_COMMUNICATION_MARKERS.notFound}"]`)
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = await bodyText(page);
      expect(body.length).toBeGreaterThan(32);
      const title = await page.title();
      expect(title.toLowerCase()).not.toContain("404");
      if (!isAuthShell(body.toLowerCase())) {
        await expect(page.locator(`[data-testid="${SAFE_COMMUNICATION_MARKERS.notFound}"]`)).toBeVisible();
      }
    });
  });

  test("company alias and job drafts routes resolve demo or auth shell", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      const companyPath = `/company/candidates/${SAFE_COMMUNICATION_CANDIDATE_DEMO_ID}/communication`;
      const companyResponse = await page.goto(companyPath, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      expect(companyResponse?.status() ?? 0).not.toBe(404);
      await page
        .locator(
          `[data-safe-communication-page="${SAFE_COMMUNICATION_PAGE_MARKER}"], [data-testid="${SAFE_COMMUNICATION_MARKERS.notFound}"], :text("Sign in"), :text("Zaloguj")`,
        )
        .first()
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const companyBody = (await bodyText(page)).toLowerCase();
      expect(companyBody.length).toBeGreaterThan(32);

      const draftsResponse = await page.goto(DEMO_JOB_DRAFTS_PATH, { waitUntil: "domcontentloaded" });
      expect(draftsResponse?.status() ?? 0).not.toBe(404);
      await page
        .locator(
          `[data-safe-communication-page="${SAFE_COMMUNICATION_PAGE_MARKER}"], [data-testid="${SAFE_COMMUNICATION_MARKERS.notFound}"], :text("Sign in")`,
        )
        .first()
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const draftsBody = (await bodyText(page)).toLowerCase();
      expect(draftsBody.length).toBeGreaterThan(32);
      if (!isAuthShell(draftsBody)) {
        await expect(page.locator(`[data-testid="${SAFE_COMMUNICATION_MARKERS.draftLibrary}"]`)).toBeVisible();
        await expect(page.locator(`[data-testid="${SAFE_COMMUNICATION_MARKERS.communicationAudit}"]`)).toBeVisible();
        await expect(page.locator(`[data-testid="${SAFE_COMMUNICATION_MARKERS.internalUpdate}"]`)).toBeVisible();
        await expect(page.locator(`[data-testid="${SAFE_COMMUNICATION_MARKERS.pilotBadge}"]`)).toBeVisible();
      }
    });
  });
});
