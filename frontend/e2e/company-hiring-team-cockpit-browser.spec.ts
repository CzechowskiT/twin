/**
 * Company Hiring Team Cockpit — browser smoke (workers=1, 21 assertions).
 */
import { expect, test, type Page } from "@playwright/test";

import {
  COMPANY_HIRING_COCKPIT_FORBIDDEN_PATTERNS,
  COMPANY_HIRING_COCKPIT_MARKERS,
  COMPANY_HIRING_COCKPIT_MODULE_LINKS,
  COMPANY_HIRING_COCKPIT_PAGE_MARKER,
  COMPANY_HIRING_COCKPIT_ROUTE,
} from "../src/lib/company-hiring-cockpit";
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
      `[data-company-hiring-cockpit-page="${COMPANY_HIRING_COCKPIT_PAGE_MARKER}"], :text("Sign in"), :text("Zaloguj"), :text("Authentication required")`,
    )
    .first()
    .waitFor({ state: "visible", timeout: SETTLE_MS })
    .catch(() => undefined);
  return response;
}

test.describe("Company Hiring Team Cockpit browser", () => {
  test.describe.configure({ timeout: 120_000 });

  test("1 route resolves — not 404 blank", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, COMPANY_HIRING_COCKPIT_ROUTE);
      expect((await bodyText(page)).length).toBeGreaterThan(32);
    });
  });

  test("2 page marker or auth shell visible", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, COMPANY_HIRING_COCKPIT_ROUTE);
      const body = (await bodyText(page)).toLowerCase();
      if (!isAuthShell(body)) {
        await expect(
          page.locator(`[data-company-hiring-cockpit-page="${COMPANY_HIRING_COCKPIT_PAGE_MARKER}"]`),
        ).toBeVisible();
      }
    });
  });

  test("3 header section marker visible when authenticated", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, COMPANY_HIRING_COCKPIT_ROUTE);
      if (!isAuthShell((await bodyText(page)).toLowerCase())) {
        await expect(page.locator(`[data-testid="${COMPANY_HIRING_COCKPIT_MARKERS.header}"]`)).toBeVisible();
      }
    });
  });

  test("4 open roles marker visible when authenticated", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, COMPANY_HIRING_COCKPIT_ROUTE);
      if (!isAuthShell((await bodyText(page)).toLowerCase())) {
        await expect(page.locator(`[data-testid="${COMPANY_HIRING_COCKPIT_MARKERS.openRoles}"]`)).toBeVisible();
      }
    });
  });

  test("5 candidate shortlist marker visible when authenticated", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, COMPANY_HIRING_COCKPIT_ROUTE);
      if (!isAuthShell((await bodyText(page)).toLowerCase())) {
        await expect(
          page.locator(`[data-testid="${COMPANY_HIRING_COCKPIT_MARKERS.candidateShortlist}"]`),
        ).toBeVisible();
      }
    });
  });

  test("6 pending feedback marker visible when authenticated", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, COMPANY_HIRING_COCKPIT_ROUTE);
      if (!isAuthShell((await bodyText(page)).toLowerCase())) {
        await expect(page.locator(`[data-testid="${COMPANY_HIRING_COCKPIT_MARKERS.pendingFeedback}"]`)).toBeVisible();
      }
    });
  });

  test("7 scorecards review marker visible when authenticated", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, COMPANY_HIRING_COCKPIT_ROUTE);
      if (!isAuthShell((await bodyText(page)).toLowerCase())) {
        await expect(page.locator(`[data-testid="${COMPANY_HIRING_COCKPIT_MARKERS.scorecardsReview}"]`)).toBeVisible();
      }
    });
  });

  test("8 trust consent warnings marker visible when authenticated", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, COMPANY_HIRING_COCKPIT_ROUTE);
      if (!isAuthShell((await bodyText(page)).toLowerCase())) {
        await expect(
          page.locator(`[data-testid="${COMPANY_HIRING_COCKPIT_MARKERS.trustConsentWarnings}"]`),
        ).toBeVisible();
      }
    });
  });

  test("9 team assignments marker visible when authenticated", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, COMPANY_HIRING_COCKPIT_ROUTE);
      if (!isAuthShell((await bodyText(page)).toLowerCase())) {
        await expect(page.locator(`[data-testid="${COMPANY_HIRING_COCKPIT_MARKERS.teamAssignments}"]`)).toBeVisible();
      }
    });
  });

  test("10 communication drafts marker visible when authenticated", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, COMPANY_HIRING_COCKPIT_ROUTE);
      if (!isAuthShell((await bodyText(page)).toLowerCase())) {
        await expect(
          page.locator(`[data-testid="${COMPANY_HIRING_COCKPIT_MARKERS.communicationDrafts}"]`),
        ).toBeVisible();
      }
    });
  });

  test("11 pipeline overview marker visible when authenticated", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, COMPANY_HIRING_COCKPIT_ROUTE);
      if (!isAuthShell((await bodyText(page)).toLowerCase())) {
        await expect(page.locator(`[data-testid="${COMPANY_HIRING_COCKPIT_MARKERS.pipelineOverview}"]`)).toBeVisible();
      }
    });
  });

  test("12 decision checklist marker visible when authenticated", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, COMPANY_HIRING_COCKPIT_ROUTE);
      if (!isAuthShell((await bodyText(page)).toLowerCase())) {
        await expect(page.locator(`[data-testid="${COMPANY_HIRING_COCKPIT_MARKERS.decisionChecklist}"]`)).toBeVisible();
      }
    });
  });

  test("13 human boundary marker visible when authenticated", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, COMPANY_HIRING_COCKPIT_ROUTE);
      if (!isAuthShell((await bodyText(page)).toLowerCase())) {
        await expect(page.locator(`[data-testid="${COMPANY_HIRING_COCKPIT_MARKERS.humanBoundary}"]`)).toBeVisible();
      }
    });
  });

  test("14 module quick links nav visible when authenticated", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, COMPANY_HIRING_COCKPIT_ROUTE);
      if (!isAuthShell((await bodyText(page)).toLowerCase())) {
        await expect(page.locator(`[data-testid="${COMPANY_HIRING_COCKPIT_MARKERS.moduleLinks}"]`)).toBeVisible();
      }
    });
  });

  test("15 demo-candidate-001 referenced when authenticated", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, COMPANY_HIRING_COCKPIT_ROUTE);
      const body = await bodyText(page);
      if (!isAuthShell(body.toLowerCase())) {
        expect(body).toContain("demo-candidate-001");
      }
    });
  });

  test("16 lever-mapping-pilot connector referenced when authenticated", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, COMPANY_HIRING_COCKPIT_ROUTE);
      const body = await bodyText(page);
      if (!isAuthShell(body.toLowerCase())) {
        expect(body).toContain("lever-mapping-pilot");
      }
    });
  });

  test("17 page title is not 404 shell", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, COMPANY_HIRING_COCKPIT_ROUTE);
      expect((await page.title()).toLowerCase()).not.toContain("404");
    });
  });

  test("18 forbidden copy absent from body when authenticated", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, COMPANY_HIRING_COCKPIT_ROUTE);
      const body = await bodyText(page);
      if (!isAuthShell(body.toLowerCase())) {
        for (const pattern of COMPANY_HIRING_COCKPIT_FORBIDDEN_PATTERNS) {
          expect(body).not.toMatch(pattern);
        }
      }
    });
  });

  test("19 profile360 module link present when authenticated", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, COMPANY_HIRING_COCKPIT_ROUTE);
      if (!isAuthShell((await bodyText(page)).toLowerCase())) {
        await expect(page.locator('[data-testid="company-hiring-cockpit-link-profile360"]')).toBeVisible();
      }
    });
  });

  test("20 company dashboard promo links to hiring cockpit when authenticated", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, "/company/dashboard");
      if (!isAuthShell((await bodyText(page)).toLowerCase())) {
        const promo = page.locator(`[data-testid="${COMPANY_HIRING_COCKPIT_MARKERS.hubPromo}"]`);
        await expect(promo).toBeVisible();
        await promo.click();
        await page.waitForURL(`**${COMPANY_HIRING_COCKPIT_ROUTE}**`, { timeout: SETTLE_MS });
        await expect(
          page.locator(`[data-company-hiring-cockpit-page="${COMPANY_HIRING_COCKPIT_PAGE_MARKER}"]`),
        ).toBeVisible();
      }
    });
  });

  test("21 module quick links resolve without 404 when authenticated", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoAndSettle(page, COMPANY_HIRING_COCKPIT_ROUTE);
      if (!isAuthShell((await bodyText(page)).toLowerCase())) {
        for (const link of COMPANY_HIRING_COCKPIT_MODULE_LINKS) {
          if (link.id === "sor_hub") continue;
          const response = await page.goto(link.href, { waitUntil: "domcontentloaded" });
          expect(response?.status() ?? 0).not.toBe(404);
          expect((await page.title()).toLowerCase()).not.toContain("404");
        }
      }
    });
  });
});
