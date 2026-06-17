/**
 * Recruiter Daily Operating Cockpit — browser smoke (workers=1, 18 assertions).
 */
import { expect, test, type Page } from "@playwright/test";

import {
  RECRUITER_DAILY_COCKPIT_FORBIDDEN_PATTERNS,
  RECRUITER_DAILY_COCKPIT_MARKERS,
  RECRUITER_DAILY_COCKPIT_PAGE_MARKER,
  RECRUITER_DAILY_COCKPIT_ROUTE,
} from "../src/lib/recruiter-daily-operating-cockpit";
import { withFreshContext } from "./helpers/browser-lifecycle";

const SETTLE_MS = 12_000;

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
    lower.includes("authentication required") ||
    lower.includes("redirecting") ||
    lower.includes("redirecting to sign in") ||
    lower.includes("workspace only") ||
    lower.includes("tylko dla") ||
    lower.includes("wymagane logowanie") ||
    lower.includes("log in to continue")
  );
}

async function gotoAndSettle(page: Page, path: string) {
  const response = await page.goto(path, { waitUntil: "domcontentloaded" });
  await dismissCookieBanner(page);
  expect(response?.status() ?? 0).not.toBe(404);
  await page
    .locator(
      `[data-recruiter-daily-cockpit-page="${RECRUITER_DAILY_COCKPIT_PAGE_MARKER}"], :text("Sign in"), :text("Zaloguj"), :text("Authentication required")`,
    )
    .first()
    .waitFor({ state: "visible", timeout: SETTLE_MS })
    .catch(() => undefined);
  return response;
}

test.describe("Recruiter Daily Operating Cockpit browser", () => {
  test.describe.configure({ timeout: 120_000 });

  test("1 route resolves — not 404 blank", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, RECRUITER_DAILY_COCKPIT_ROUTE);
      expect((await bodyText(page)).length).toBeGreaterThan(32);
    });
  });

  test("2 page marker or auth shell visible", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, RECRUITER_DAILY_COCKPIT_ROUTE);
      const body = (await bodyText(page)).toLowerCase();
      if (!isAuthShell(body)) {
        await expect(
          page.locator(`[data-recruiter-daily-cockpit-page="${RECRUITER_DAILY_COCKPIT_PAGE_MARKER}"]`),
        ).toBeVisible();
      }
    });
  });

  test("3 header section marker visible when authenticated", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, RECRUITER_DAILY_COCKPIT_ROUTE);
      if (!isAuthShell((await bodyText(page)).toLowerCase())) {
        await expect(page.locator(`[data-testid="${RECRUITER_DAILY_COCKPIT_MARKERS.header}"]`)).toBeVisible();
      }
    });
  });

  test("4 priority worklist marker visible when authenticated", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, RECRUITER_DAILY_COCKPIT_ROUTE);
      if (!isAuthShell((await bodyText(page)).toLowerCase())) {
        await expect(page.locator(`[data-testid="${RECRUITER_DAILY_COCKPIT_MARKERS.priorityWorklist}"]`)).toBeVisible();
      }
    });
  });

  test("5 decision queue marker visible when authenticated", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, RECRUITER_DAILY_COCKPIT_ROUTE);
      if (!isAuthShell((await bodyText(page)).toLowerCase())) {
        await expect(page.locator(`[data-testid="${RECRUITER_DAILY_COCKPIT_MARKERS.decisionQueue}"]`)).toBeVisible();
      }
    });
  });

  test("6 trust consent queue marker visible when authenticated", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, RECRUITER_DAILY_COCKPIT_ROUTE);
      if (!isAuthShell((await bodyText(page)).toLowerCase())) {
        await expect(page.locator(`[data-testid="${RECRUITER_DAILY_COCKPIT_MARKERS.trustConsentQueue}"]`)).toBeVisible();
      }
    });
  });

  test("7 feedback scorecard queue marker visible when authenticated", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, RECRUITER_DAILY_COCKPIT_ROUTE);
      if (!isAuthShell((await bodyText(page)).toLowerCase())) {
        await expect(
          page.locator(`[data-testid="${RECRUITER_DAILY_COCKPIT_MARKERS.feedbackScorecardQueue}"]`),
        ).toBeVisible();
      }
    });
  });

  test("8 comm drafts queue marker visible when authenticated", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, RECRUITER_DAILY_COCKPIT_ROUTE);
      if (!isAuthShell((await bodyText(page)).toLowerCase())) {
        await expect(page.locator(`[data-testid="${RECRUITER_DAILY_COCKPIT_MARKERS.commDraftsQueue}"]`)).toBeVisible();
      }
    });
  });

  test("9 ATS import queue marker visible when authenticated", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, RECRUITER_DAILY_COCKPIT_ROUTE);
      if (!isAuthShell((await bodyText(page)).toLowerCase())) {
        await expect(page.locator(`[data-testid="${RECRUITER_DAILY_COCKPIT_MARKERS.atsImportQueue}"]`)).toBeVisible();
      }
    });
  });

  test("10 pipeline changes marker visible when authenticated", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, RECRUITER_DAILY_COCKPIT_ROUTE);
      if (!isAuthShell((await bodyText(page)).toLowerCase())) {
        await expect(page.locator(`[data-testid="${RECRUITER_DAILY_COCKPIT_MARKERS.pipelineChanges}"]`)).toBeVisible();
      }
    });
  });

  test("11 daily checklist marker visible when authenticated", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, RECRUITER_DAILY_COCKPIT_ROUTE);
      if (!isAuthShell((await bodyText(page)).toLowerCase())) {
        await expect(page.locator(`[data-testid="${RECRUITER_DAILY_COCKPIT_MARKERS.dailyChecklist}"]`)).toBeVisible();
      }
    });
  });

  test("12 human boundary marker visible when authenticated", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, RECRUITER_DAILY_COCKPIT_ROUTE);
      if (!isAuthShell((await bodyText(page)).toLowerCase())) {
        await expect(page.locator(`[data-testid="${RECRUITER_DAILY_COCKPIT_MARKERS.humanBoundary}"]`)).toBeVisible();
      }
    });
  });

  test("13 module quick links nav visible when authenticated", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, RECRUITER_DAILY_COCKPIT_ROUTE);
      if (!isAuthShell((await bodyText(page)).toLowerCase())) {
        await expect(page.locator(`[data-testid="${RECRUITER_DAILY_COCKPIT_MARKERS.moduleLinks}"]`)).toBeVisible();
      }
    });
  });

  test("14 demo-candidate-001 referenced when authenticated", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, RECRUITER_DAILY_COCKPIT_ROUTE);
      const body = await bodyText(page);
      if (!isAuthShell(body.toLowerCase())) {
        expect(body).toContain("demo-candidate-001");
      }
    });
  });

  test("15 lever-mapping-pilot connector referenced when authenticated", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, RECRUITER_DAILY_COCKPIT_ROUTE);
      const body = await bodyText(page);
      if (!isAuthShell(body.toLowerCase())) {
        expect(body).toContain("lever-mapping-pilot");
      }
    });
  });

  test("16 page title is not 404 shell", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, RECRUITER_DAILY_COCKPIT_ROUTE);
      expect((await page.title()).toLowerCase()).not.toContain("404");
    });
  });

  test("17 forbidden copy absent from body when authenticated", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, RECRUITER_DAILY_COCKPIT_ROUTE);
      const body = await bodyText(page);
      if (!isAuthShell(body.toLowerCase())) {
        for (const pattern of RECRUITER_DAILY_COCKPIT_FORBIDDEN_PATTERNS) {
          expect(body).not.toMatch(pattern);
        }
      }
    });
  });

  test("18 profile360 module link present when authenticated", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, RECRUITER_DAILY_COCKPIT_ROUTE);
      if (!isAuthShell((await bodyText(page)).toLowerCase())) {
        await expect(page.locator('[data-testid="recruiter-daily-cockpit-link-profile360"]')).toBeVisible();
      }
    });
  });
});
