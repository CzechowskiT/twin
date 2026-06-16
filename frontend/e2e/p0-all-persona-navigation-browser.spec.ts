/**
 * P0 all-persona navigation browser smoke — sequential routes, one tab, withFreshContext.
 *
 * Local:
 *   PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 PLAYWRIGHT_ENABLE_WEBSERVER=1 npm run test:p0-all-persona-navigation-browser
 *
 * Production (gated):
 *   PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 \
 *   PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app npm run test:p0-all-persona-navigation-browser
 */
import { expect, test, type Page } from "@playwright/test";

import { withFreshContext } from "./helpers/browser-lifecycle";

const ROUTE_SETTLE_MS = 10_000;
const MIN_VISIBLE_TEXT = 32;

const PERSONA_HUBS = [
  { persona: "candidate", path: "/dashboard" },
  { persona: "recruiter", path: "/recruiter" },
  { persona: "company", path: "/company/dashboard" },
  { persona: "investor", path: "/investor" },
] as const;

const CANDIDATE_MODULE_ROUTES = [
  "/dashboard/jobs",
  "/dashboard/matches",
  "/profile",
  "/dashboard/applications",
  "/dashboard/evidence",
] as const;

const RECRUITER_MODULE_ROUTES = [
  "/recruiter/inbox",
  "/recruiter/pipeline",
  "/recruiter/search",
  "/recruiter/jobs",
  "/recruiter/calendar",
] as const;

const COMPANY_MODULE_ROUTES = [
  "/company/roles",
  "/company/team",
  "/company/pipeline",
  "/company/billing",
  "/company/integrations",
  "/company/talent-pool",
] as const;

const INVESTOR_MODULE_ROUTES = [
  "/investor/metrics",
  "/investor/roadmap",
  "/investor/data-room",
  "/investor/calculator",
  "/investor/placement",
] as const;

async function dismissCookieBanner(page: Page): Promise<void> {
  const accept = page.getByRole("button", { name: /accept cookies/i });
  if (await accept.isVisible().catch(() => false)) {
    await accept.click();
  }
}

async function visibleTextLength(page: Page): Promise<number> {
  return page.locator("body").innerText().then((t) => t.replace(/\s+/g, " ").trim().length);
}

async function assertRouteShell(page: Page, path: string): Promise<void> {
  const response = await page.goto(path, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await dismissCookieBanner(page);
  const status = response?.status() ?? 0;
  expect(status, `${path} HTTP status`).not.toBe(404);
  await page.waitForTimeout(500);
  const textLen = await visibleTextLength(page);
  expect(textLen, `${path} visible text`).toBeGreaterThan(MIN_VISIBLE_TEXT);
  const title = await page.title();
  expect(title.toLowerCase(), `${path} title`).not.toContain("404");
  await page.waitForTimeout(ROUTE_SETTLE_MS / 10);
}

async function assertAuthOrContent(page: Page, path: string): Promise<void> {
  await assertRouteShell(page, path);
  const body = (await page.locator("body").innerText()).toLowerCase();
  const hasAuthCard =
    body.includes("sign in") ||
    body.includes("zaloguj") ||
    body.includes("auth required") ||
    body.includes("wymagane logowanie") ||
    body.includes("workspace.auth");
  const hasPlanned =
    body.includes("not live") ||
    body.includes("niedostępn") ||
    body.includes("pilot") ||
    body.includes("wstrzymany");
  expect(hasAuthCard || hasPlanned || body.length > MIN_VISIBLE_TEXT).toBeTruthy();
}

test.describe("P0 all-persona navigation browser", () => {
  test.describe.configure({ timeout: 120_000 });

  test("homepage shows Demo after simulated logout landing", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      const demoLink = page.getByRole("link", { name: /demo/i }).first();
      await expect(demoLink).toBeVisible();
      await expect(demoLink).toHaveAttribute("href", /\/demo/);
    });
  });

  test("candidate module routes avoid 404 and blank shells", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      for (const path of CANDIDATE_MODULE_ROUTES) {
        await assertAuthOrContent(page, path);
      }
    });
  });

  test("recruiter module routes avoid 404 and blank shells", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      for (const path of RECRUITER_MODULE_ROUTES) {
        await assertAuthOrContent(page, path);
      }
    });
  });

  test("company module routes avoid 404 and blank shells", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      for (const path of COMPANY_MODULE_ROUTES) {
        await assertAuthOrContent(page, path);
      }
    });
  });

  test("investor module routes avoid 404 and blank shells", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      for (const path of INVESTOR_MODULE_ROUTES) {
        await assertAuthOrContent(page, path);
      }
    });
  });

  test("persona hubs render shell without 404", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      for (const hub of PERSONA_HUBS) {
        await assertAuthOrContent(page, hub.path);
      }
    });
  });

  test("unauth deep link preserves next on login redirect", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto("/dashboard/matches", { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      const loginLink = page.locator('a[href*="next="]').first();
      await expect(loginLink).toBeVisible({ timeout: ROUTE_SETTLE_MS });
      const href = await loginLink.getAttribute("href");
      expect(href ?? "").toMatch(/next=%2Fdashboard%2Fmatches/);
    });
  });
});
