/**
 * Unified Decision Memory / Audit Trail — browser smoke (workers=1, 19 assertions).
 */
import { expect, test, type Page } from "@playwright/test";

import {
  DECISION_MEMORY_MARKERS,
  DECISION_MEMORY_PAGE_MARKER,
} from "../src/lib/decision-memory";
import { DECISION_MEMORY_DEMO_ID } from "../src/lib/decision-memory-demo-data";
import { JOB_PIPELINE_DEMO_ID } from "../src/lib/job-pipeline-demo-data";
import { withFreshContext } from "./helpers/browser-lifecycle";

const SETTLE_MS = 12_000;
const DEMO_RECRUITER_PATH = `/recruiter/candidates/${DECISION_MEMORY_DEMO_ID}/decision-memory`;
const DEMO_COMPANY_PATH = `/company/candidates/${DECISION_MEMORY_DEMO_ID}/decision-memory`;
const INVALID_CANDIDATE_PATH = "/recruiter/candidates/not-a-real-candidate-id/decision-memory";
const JOB_DECISION_MEMORY_PATH = `/recruiter/jobs/${JOB_PIPELINE_DEMO_ID}/decision-memory`;

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

async function gotoAndSettle(page: Page, path: string) {
  const response = await page.goto(path, { waitUntil: "domcontentloaded" });
  await dismissCookieBanner(page);
  expect(response?.status() ?? 0).not.toBe(404);
  await page
    .locator(
      `[data-decision-memory-page="${DECISION_MEMORY_PAGE_MARKER}"], [data-testid="${DECISION_MEMORY_MARKERS.notFound}"], :text("Sign in"), :text("Zaloguj")`,
    )
    .first()
    .waitFor({ state: "visible", timeout: SETTLE_MS })
    .catch(() => undefined);
  return response;
}

test.describe("Unified Decision Memory Audit Trail browser", () => {
  test.describe.configure({ timeout: 120_000 });

  test("1 demo-candidate-001 recruiter route shows workspace or auth shell — not 404 blank", async ({
    browser,
  }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, DEMO_RECRUITER_PATH);
      const body = (await bodyText(page)).toLowerCase();
      expect(body.length).toBeGreaterThan(32);
      if (!isAuthShell(body)) {
        await expect(page.locator(`[data-decision-memory-page="${DECISION_MEMORY_PAGE_MARKER}"]`)).toBeVisible();
      }
    });
  });

  test("2 invalid candidate id shows meaningful not-found — not 404 shell", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, INVALID_CANDIDATE_PATH);
      const body = await bodyText(page);
      expect(body.length).toBeGreaterThan(32);
      const title = await page.title();
      expect(title.toLowerCase()).not.toContain("404");
      if (!isAuthShell(body.toLowerCase())) {
        await expect(page.locator(`[data-testid="${DECISION_MEMORY_MARKERS.notFound}"]`)).toBeVisible();
      }
    });
  });

  test("3 company alias route resolves workspace or auth shell", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, DEMO_COMPANY_PATH);
      const body = (await bodyText(page)).toLowerCase();
      expect(body.length).toBeGreaterThan(32);
    });
  });

  test("4 job-level decision-memory route resolves demo or auth shell", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, JOB_DECISION_MEMORY_PATH);
      const body = (await bodyText(page)).toLowerCase();
      expect(body.length).toBeGreaterThan(32);
    });
  });

  test("5 header section marker visible when authed", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, DEMO_RECRUITER_PATH);
      if (!isAuthShell((await bodyText(page)).toLowerCase())) {
        await expect(page.locator(`[data-testid="${DECISION_MEMORY_MARKERS.header}"]`)).toBeVisible();
        await expect(page.locator(`[data-testid="${DECISION_MEMORY_MARKERS.pilotBadge}"]`)).toBeVisible();
      }
    });
  });

  test("6 timeline section marker visible when authed", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, DEMO_RECRUITER_PATH);
      if (!isAuthShell((await bodyText(page)).toLowerCase())) {
        await expect(page.locator(`[data-testid="${DECISION_MEMORY_MARKERS.timeline}"]`)).toBeVisible();
      }
    });
  });

  test("7 evidence bundle section marker visible when authed", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, DEMO_RECRUITER_PATH);
      if (!isAuthShell((await bodyText(page)).toLowerCase())) {
        await expect(page.locator(`[data-testid="${DECISION_MEMORY_MARKERS.evidence}"]`)).toBeVisible();
      }
    });
  });

  test("8 decision state section marker visible when authed", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, DEMO_RECRUITER_PATH);
      if (!isAuthShell((await bodyText(page)).toLowerCase())) {
        await expect(page.locator(`[data-testid="${DECISION_MEMORY_MARKERS.decisionState}"]`)).toBeVisible();
      }
    });
  });

  test("9 blockers section marker visible when authed", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, DEMO_RECRUITER_PATH);
      if (!isAuthShell((await bodyText(page)).toLowerCase())) {
        await expect(page.locator(`[data-testid="${DECISION_MEMORY_MARKERS.blockers}"]`)).toBeVisible();
      }
    });
  });

  test("10 next actions section marker visible when authed", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, DEMO_RECRUITER_PATH);
      if (!isAuthShell((await bodyText(page)).toLowerCase())) {
        await expect(page.locator(`[data-testid="${DECISION_MEMORY_MARKERS.nextActions}"]`)).toBeVisible();
      }
    });
  });

  test("11 audit integrity section marker visible when authed", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, DEMO_RECRUITER_PATH);
      if (!isAuthShell((await bodyText(page)).toLowerCase())) {
        await expect(page.locator(`[data-testid="${DECISION_MEMORY_MARKERS.auditIntegrity}"]`)).toBeVisible();
      }
    });
  });

  test("12 human boundary section marker visible when authed", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, DEMO_RECRUITER_PATH);
      if (!isAuthShell((await bodyText(page)).toLowerCase())) {
        await expect(page.locator(`[data-testid="${DECISION_MEMORY_MARKERS.humanBoundary}"]`)).toBeVisible();
      }
    });
  });

  test("13 profile 360 link in header is valid href", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, DEMO_RECRUITER_PATH);
      if (!isAuthShell((await bodyText(page)).toLowerCase())) {
        const href = await page.locator('[data-testid="decision-memory-profile-link"]').getAttribute("href");
        expect(href).toContain("/recruiter/candidates/demo-candidate-001");
      }
    });
  });

  test("14 pipeline link in header is valid href", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, DEMO_RECRUITER_PATH);
      if (!isAuthShell((await bodyText(page)).toLowerCase())) {
        const href = await page.locator('[data-testid="decision-memory-pipeline-link"]').getAttribute("href");
        expect(href).toContain("/recruiter/jobs/demo-role-001/pipeline");
      }
    });
  });

  test("15 trust link in header is valid href", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, DEMO_RECRUITER_PATH);
      if (!isAuthShell((await bodyText(page)).toLowerCase())) {
        const href = await page.locator('[data-testid="decision-memory-trust-link"]').getAttribute("href");
        expect(href).toContain("/trust");
      }
    });
  });

  test("16 communication link in header is valid href", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, DEMO_RECRUITER_PATH);
      if (!isAuthShell((await bodyText(page)).toLowerCase())) {
        const href = await page.locator('[data-testid="decision-memory-communication-link"]').getAttribute("href");
        expect(href).toContain("/communication");
      }
    });
  });

  test("17 demo link in audit integrity is valid href", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, DEMO_RECRUITER_PATH);
      if (!isAuthShell((await bodyText(page)).toLowerCase())) {
        const href = await page.locator('[data-testid="decision-memory-demo-link"]').getAttribute("href");
        expect(href).toBe("/demo");
      }
    });
  });

  test("18 page does not contain forbidden outreach copy when rendered", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, DEMO_RECRUITER_PATH);
      const body = (await bodyText(page)).toLowerCase();
      if (!isAuthShell(body)) {
        expect(body).not.toMatch(/email sent/);
        expect(body).not.toMatch(/automatic outreach/);
        expect(body).not.toMatch(/ats sync completed/);
      }
    });
  });

  test("19 company route header links use company surface paths when authed", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, DEMO_COMPANY_PATH);
      if (!isAuthShell((await bodyText(page)).toLowerCase())) {
        const href = await page.locator('[data-testid="decision-memory-profile-link"]').getAttribute("href");
        expect(href).toContain("/company/candidates/demo-candidate-001");
      }
    });
  });
});
