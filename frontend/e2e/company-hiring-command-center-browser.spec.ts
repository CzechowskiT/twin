/**
 * Company Hiring Command Center — browser smoke (workers=1).
 */
import { expect, test, type Page } from "@playwright/test";

import {
  COMPANY_HIRING_COMMAND_CENTER_FORBIDDEN_PATTERNS,
  COMPANY_HIRING_COMMAND_CENTER_MARKERS,
  COMPANY_HIRING_COMMAND_CENTER_MODULE_LINKS,
  COMPANY_HIRING_COMMAND_CENTER_PAGE_MARKER,
  COMPANY_HIRING_COMMAND_CENTER_ROUTE,
} from "../src/lib/company-hiring-command-center";
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
      `[data-company-hiring-command-center-page="${COMPANY_HIRING_COMMAND_CENTER_PAGE_MARKER}"], :text("Sign in"), :text("Zaloguj"), :text("Authentication required")`,
    )
    .first()
    .waitFor({ state: "visible", timeout: SETTLE_MS })
    .catch(() => undefined);
  return response;
}

const SECTION_MARKERS = [
  COMPANY_HIRING_COMMAND_CENTER_MARKERS.header,
  COMPANY_HIRING_COMMAND_CENTER_MARKERS.roleReadiness,
  COMPANY_HIRING_COMMAND_CENTER_MARKERS.shortlist,
  COMPANY_HIRING_COMMAND_CENTER_MARKERS.pendingFeedback,
  COMPANY_HIRING_COMMAND_CENTER_MARKERS.decisionBlockers,
  COMPANY_HIRING_COMMAND_CENTER_MARKERS.trustBoundaries,
  COMPANY_HIRING_COMMAND_CENTER_MARKERS.hiringTeamTasks,
  COMPANY_HIRING_COMMAND_CENTER_MARKERS.nextMeetingReadiness,
  COMPANY_HIRING_COMMAND_CENTER_MARKERS.boundaryPanel,
] as const;

test.describe("Company Hiring Command Center browser", () => {
  test.describe.configure({ timeout: 120_000 });

  test("1 route resolves — not 404 blank", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, COMPANY_HIRING_COMMAND_CENTER_ROUTE);
      expect((await bodyText(page)).length).toBeGreaterThan(32);
    });
  });

  test("2 page marker or auth shell visible", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, COMPANY_HIRING_COMMAND_CENTER_ROUTE);
      const body = (await bodyText(page)).toLowerCase();
      if (!isAuthShell(body)) {
        await expect(
          page.locator(`[data-company-hiring-command-center-page="${COMPANY_HIRING_COMMAND_CENTER_PAGE_MARKER}"]`),
        ).toBeVisible();
      }
    });
  });

  for (const [index, marker] of SECTION_MARKERS.entries()) {
    test(`${index + 3} section marker ${marker} visible when authenticated`, async ({ browser }) => {
      await withFreshContext(browser, async (context) => {
        const page = await context.newPage();
        await gotoAndSettle(page, COMPANY_HIRING_COMMAND_CENTER_ROUTE);
        if (!isAuthShell((await bodyText(page)).toLowerCase())) {
          await expect(page.locator(`[data-testid="${marker}"]`)).toBeVisible();
        }
      });
    });
  }

  test("12 disabled approve action present when authenticated", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, COMPANY_HIRING_COMMAND_CENTER_ROUTE);
      if (!isAuthShell((await bodyText(page)).toLowerCase())) {
        await expect(
          page.locator('[data-testid="company-hiring-command-center-action-approve-disabled"]'),
        ).toBeVisible();
      }
    });
  });

  test("13 demo-candidate-001 referenced when authenticated", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, COMPANY_HIRING_COMMAND_CENTER_ROUTE);
      const body = await bodyText(page);
      if (!isAuthShell(body.toLowerCase())) {
        expect(body).toContain("demo-candidate-001");
      }
    });
  });

  test("14 forbidden copy absent from body when authenticated", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, COMPANY_HIRING_COMMAND_CENTER_ROUTE);
      const body = await bodyText(page);
      if (!isAuthShell(body.toLowerCase())) {
        for (const pattern of COMPANY_HIRING_COMMAND_CENTER_FORBIDDEN_PATTERNS) {
          expect(body).not.toMatch(pattern);
        }
      }
    });
  });

  test("15 module quick links resolve without 404 when authenticated", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, COMPANY_HIRING_COMMAND_CENTER_ROUTE);
      if (!isAuthShell((await bodyText(page)).toLowerCase())) {
        for (const link of COMPANY_HIRING_COMMAND_CENTER_MODULE_LINKS) {
          if (link.id === "sor_hub") continue;
          const response = await page.goto(link.href, { waitUntil: "domcontentloaded" });
          expect(response?.status() ?? 0).not.toBe(404);
        }
      }
    });
  });
});
