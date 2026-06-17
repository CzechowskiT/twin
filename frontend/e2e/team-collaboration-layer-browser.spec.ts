/**
 * Team Collaboration Layer — browser smoke (workers=1).
 */
import { expect, test, type Page } from "@playwright/test";

import {
  TEAM_COLLABORATION_MARKERS,
  TEAM_COLLABORATION_PAGE_MARKER,
} from "../src/lib/team-collaboration";
import { TEAM_COLLABORATION_CANDIDATE_DEMO_ID } from "../src/lib/team-collaboration-demo-data";
import { JOB_PIPELINE_DEMO_ID } from "../src/lib/job-pipeline-demo-data";
import { withFreshContext } from "./helpers/browser-lifecycle";

const SETTLE_MS = 12_000;
const DEMO_CANDIDATE_PATH = `/recruiter/candidates/${TEAM_COLLABORATION_CANDIDATE_DEMO_ID}/team`;
const INVALID_CANDIDATE_PATH = "/recruiter/candidates/not-a-real-candidate-id/team";
const DEMO_JOB_TASKS_PATH = `/recruiter/jobs/${JOB_PIPELINE_DEMO_ID}/tasks`;

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

test.describe("Team Collaboration Layer browser", () => {
  test.describe.configure({ timeout: 120_000 });

  test("demo-candidate-001 team shows workspace or auth shell — not 404 blank", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      const response = await page.goto(DEMO_CANDIDATE_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      expect(response?.status() ?? 0).not.toBe(404);
      await page
        .locator(
          `[data-team-collaboration-page="${TEAM_COLLABORATION_PAGE_MARKER}"], [data-testid="${TEAM_COLLABORATION_MARKERS.notFound}"], :text("Sign in")`,
        )
        .first()
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      expect(body.length).toBeGreaterThan(32);
      if (!isAuthShell(body)) {
        await expect(page.locator(`[data-team-collaboration-page="${TEAM_COLLABORATION_PAGE_MARKER}"]`)).toBeVisible();
        await expect(page.locator(`[data-testid="${TEAM_COLLABORATION_MARKERS.boundary}"]`)).toBeVisible();
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
        .locator(`[data-testid="${TEAM_COLLABORATION_MARKERS.notFound}"]`)
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = await bodyText(page);
      expect(body.length).toBeGreaterThan(32);
      const title = await page.title();
      expect(title.toLowerCase()).not.toContain("404");
      if (!isAuthShell(body.toLowerCase())) {
        await expect(page.locator(`[data-testid="${TEAM_COLLABORATION_MARKERS.notFound}"]`)).toBeVisible();
      }
    });
  });

  test("company alias and job tasks routes resolve demo or auth shell", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      const companyPath = `/company/candidates/${TEAM_COLLABORATION_CANDIDATE_DEMO_ID}/team`;
      const companyResponse = await page.goto(companyPath, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      expect(companyResponse?.status() ?? 0).not.toBe(404);
      await page
        .locator(
          `[data-team-collaboration-page="${TEAM_COLLABORATION_PAGE_MARKER}"], [data-testid="${TEAM_COLLABORATION_MARKERS.notFound}"], :text("Sign in"), :text("Zaloguj")`,
        )
        .first()
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const companyBody = (await bodyText(page)).toLowerCase();
      expect(companyBody.length).toBeGreaterThan(32);

      const tasksResponse = await page.goto(DEMO_JOB_TASKS_PATH, { waitUntil: "domcontentloaded" });
      expect(tasksResponse?.status() ?? 0).not.toBe(404);
      await page
        .locator(
          `[data-team-collaboration-page="${TEAM_COLLABORATION_PAGE_MARKER}"], [data-testid="${TEAM_COLLABORATION_MARKERS.notFound}"], :text("Sign in")`,
        )
        .first()
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const tasksBody = (await bodyText(page)).toLowerCase();
      expect(tasksBody.length).toBeGreaterThan(32);
      if (!isAuthShell(tasksBody)) {
        await expect(page.locator(`[data-testid="${TEAM_COLLABORATION_MARKERS.followUpTasks}"]`)).toBeVisible();
      }
    });
  });
});
