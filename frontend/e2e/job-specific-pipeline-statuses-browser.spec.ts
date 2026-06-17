/**
 * Job-Specific Pipeline + Process Statuses — browser smoke (workers=1).
 */
import { expect, test, type Page } from "@playwright/test";

import {
  JOB_PIPELINE_MARKERS,
  JOB_PIPELINE_PAGE_MARKER,
  JOB_PIPELINE_DEMO_ID,
} from "../src/lib/job-pipeline";
import { withFreshContext } from "./helpers/browser-lifecycle";

const SETTLE_MS = 12_000;
const DEMO_PATH = `/recruiter/jobs/${JOB_PIPELINE_DEMO_ID}/pipeline`;
const INVALID_PATH = "/recruiter/jobs/not-a-real-job-id/pipeline";
const COMPANY_DEMO_PATH = `/company/roles/${JOB_PIPELINE_DEMO_ID}/pipeline`;

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

test.describe("Job pipeline browser", () => {
  test.describe.configure({ timeout: 120_000 });

  test("demo-role-001 shows pipeline board or auth shell — not 404 blank", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      const response = await page.goto(DEMO_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      expect(response?.status() ?? 0).not.toBe(404);
      await page
        .locator(
          `[data-job-pipeline-page="${JOB_PIPELINE_PAGE_MARKER}"], [data-testid="${JOB_PIPELINE_MARKERS.notFound}"], :text("Sign in")`,
        )
        .first()
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      expect(body.length).toBeGreaterThan(32);
      if (!isAuthShell(body)) {
        await expect(page.locator(`[data-job-pipeline-page="${JOB_PIPELINE_PAGE_MARKER}"]`)).toBeVisible();
        await expect(page.locator(`[data-testid="${JOB_PIPELINE_MARKERS.board}"]`)).toBeVisible();
        await expect(page.locator(`[data-testid="${JOB_PIPELINE_MARKERS.boundary}"]`)).toBeVisible();
      }
    });
  });

  test("invalid job id shows meaningful not-found — not 404 shell", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      const response = await page.goto(INVALID_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      expect(response?.status() ?? 0).not.toBe(404);
      await page
        .locator(`[data-testid="${JOB_PIPELINE_MARKERS.notFound}"]`)
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = await bodyText(page);
      expect(body.length).toBeGreaterThan(32);
      const title = await page.title();
      expect(title.toLowerCase()).not.toContain("404");
      if (!isAuthShell(body.toLowerCase())) {
        await expect(page.locator(`[data-testid="${JOB_PIPELINE_MARKERS.notFound}"]`)).toBeVisible();
      }
    });
  });

  test("company alias route resolves same demo or auth shell", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      const response = await page.goto(COMPANY_DEMO_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      expect(response?.status() ?? 0).not.toBe(404);
      await page
        .locator(
          `[data-job-pipeline-page="${JOB_PIPELINE_PAGE_MARKER}"], [data-testid="${JOB_PIPELINE_MARKERS.notFound}"], :text("Sign in"), :text("Zaloguj")`,
        )
        .first()
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      expect(body.length).toBeGreaterThan(32);
      if (!isAuthShell(body)) {
        await expect(
          page
            .locator(
              `[data-job-pipeline-page="${JOB_PIPELINE_PAGE_MARKER}"], [data-testid="${JOB_PIPELINE_MARKERS.notFound}"]`,
            )
            .first(),
        ).toBeVisible();
      }
    });
  });
});
