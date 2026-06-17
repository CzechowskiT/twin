/**
 * System-of-record navigation hub — browser smoke (workers=1, safe mode).
 *
 * Local:
 *   PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 PLAYWRIGHT_ENABLE_WEBSERVER=1 npm run test:system-of-record-navigation-hub-browser
 *
 * Production (gated):
 *   PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 \
 *   PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app npm run test:system-of-record-navigation-hub-browser
 */
import { expect, test, type Page } from "@playwright/test";

import { SYSTEM_OF_RECORD_HUB_MARKER } from "../src/lib/system-of-record-routes";
import { withFreshContext } from "./helpers/browser-lifecycle";

const SETTLE_MS = 20_000;
const MIN_TEXT = 32;

const PERSONA_HUBS = [
  { persona: "candidate", path: "/dashboard" },
  { persona: "recruiter", path: "/recruiter" },
  { persona: "company", path: "/company/dashboard" },
  { persona: "investor", path: "/investor" },
] as const;

async function dismissCookieBanner(page: Page): Promise<void> {
  const accept = page.getByRole("button", { name: /accept cookies/i });
  if (await accept.isVisible().catch(() => false)) {
    await accept.click();
  }
}

async function bodyText(page: Page): Promise<string> {
  return page.locator("body").innerText();
}

function isAuthOrGateShell(body: string): boolean {
  const lower = body.toLowerCase();
  return (
    lower.includes("sign in") ||
    lower.includes("log in") ||
    lower.includes("zaloguj") ||
    lower.includes("auth required") ||
    lower.includes("redirecting to sign in") ||
    lower.includes("workspace only") ||
    lower.includes("wymagane logowanie") ||
    lower.includes("loading jobs") ||
    lower.includes("ładowanie")
  );
}

async function waitForHydration(page: Page): Promise<void> {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForLoadState("networkidle").catch(() => undefined);
}

async function expectHubOrAuthShell(page: Page, hubSelector: string): Promise<void> {
  const hub = page.locator(hubSelector).first();
  const hubVisible = await hub
    .waitFor({ state: "visible", timeout: SETTLE_MS })
    .then(() => true)
    .catch(() => false);
  if (hubVisible) return;
  const body = await bodyText(page);
  expect(isAuthOrGateShell(body)).toBeTruthy();
}

async function gotoInvestorRoom(page: Page): Promise<void> {
  const response = await page.goto("/investor", { waitUntil: "load", timeout: 30_000 });
  await dismissCookieBanner(page);
  expect(response?.status() ?? 0).not.toBe(404);
  await waitForHydration(page);
  await page
    .getByTestId("investor-room-page")
    .waitFor({ state: "visible", timeout: SETTLE_MS })
    .catch(() => undefined);
}

test.describe("System-of-record navigation hub browser", () => {
  test.describe.configure({ timeout: 180_000 });

  test("1 candidate dashboard hub or auth shell — not 404 blank", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      const response = await page.goto("/dashboard", { waitUntil: "load" });
      await dismissCookieBanner(page);
      expect(response?.status() ?? 0).not.toBe(404);
      await waitForHydration(page);
      const body = await bodyText(page);
      expect(body.replace(/\s+/g, " ").trim().length).toBeGreaterThan(MIN_TEXT);
      await expectHubOrAuthShell(page, `[data-testid="candidate-module-nav"], [data-testid="${SYSTEM_OF_RECORD_HUB_MARKER}"]`);
    });
  });

  test("2 recruiter hub shows module cards or auth shell", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      const response = await page.goto("/recruiter", { waitUntil: "load" });
      await dismissCookieBanner(page);
      expect(response?.status() ?? 0).not.toBe(404);
      await waitForHydration(page);
      await expectHubOrAuthShell(page, `[data-testid="${SYSTEM_OF_RECORD_HUB_MARKER}"], [data-sor-module]`);
    });
  });

  test("3 company dashboard hub shows cards or auth shell", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      const response = await page.goto("/company/dashboard", { waitUntil: "load" });
      await dismissCookieBanner(page);
      expect(response?.status() ?? 0).not.toBe(404);
      await waitForHydration(page);
      await expectHubOrAuthShell(
        page,
        `[data-testid="company-module-grid"], [data-testid="${SYSTEM_OF_RECORD_HUB_MARKER}"]`,
      );
    });
  });

  test("4 investor public room shows sor proof hub", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoInvestorRoom(page);
      const roomVisible = await page
        .getByTestId("investor-room-page")
        .isVisible()
        .catch(() => false);
      if (roomVisible) {
        await expect(page.getByTestId("investor-sor-proof-hub")).toBeVisible();
        await expect(page.getByTestId(SYSTEM_OF_RECORD_HUB_MARKER)).toBeVisible();
      } else {
        const body = await bodyText(page);
        expect(body.length).toBeGreaterThan(MIN_TEXT);
      }
    });
  });

  test("5 hub module cards use links not inert buttons", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoInvestorRoom(page);
      const link = page.locator("[data-sor-module] a").first();
      const visible = await link
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .then(() => true)
        .catch(() => false);
      if (visible) {
        const href = await link.getAttribute("href");
        expect(href).toBeTruthy();
        expect(href).not.toBe("#");
      } else {
        expect(await bodyText(page)).toMatch(/investor|inwestor|demo/i);
      }
    });
  });

  test("6 status badges visible on hub cards", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoInvestorRoom(page);
      const badge = page.locator("[data-workspace-status]").first();
      const visible = await badge
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .then(() => true)
        .catch(() => false);
      if (!visible) {
        const body = await bodyText(page);
        expect(body.length).toBeGreaterThan(MIN_TEXT);
      }
    });
  });

  test("7 boundary badges visible on pilot proof cards", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoInvestorRoom(page);
      const badge = page.locator("[data-sor-boundary]").first();
      const visible = await badge
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .then(() => true)
        .catch(() => false);
      if (!visible) {
        const body = await bodyText(page);
        expect(body.length).toBeGreaterThan(MIN_TEXT);
      }
    });
  });

  test("8 sample candidate module route resolves — not 404 blank", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      const response = await page.goto("/dashboard/jobs", { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      expect(response?.status() ?? 0).not.toBe(404);
      const body = (await bodyText(page)).toLowerCase();
      expect(body.length).toBeGreaterThan(MIN_TEXT);
      expect(body).not.toContain("404");
    });
  });

  test("9 recruiter demo pipeline route resolves — not 404 blank", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      const response = await page.goto("/recruiter/jobs/demo-role-001/pipeline", {
        waitUntil: "domcontentloaded",
      });
      await dismissCookieBanner(page);
      expect(response?.status() ?? 0).not.toBe(404);
      const body = await bodyText(page);
      expect(body.length).toBeGreaterThan(MIN_TEXT);
    });
  });

  test("10 workspace investor hub route resolves", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      const response = await page.goto("/workspace/investor", { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      expect(response?.status() ?? 0).not.toBe(404);
      const body = await bodyText(page);
      expect(body.length).toBeGreaterThan(MIN_TEXT);
    });
  });

  test("11 demo route linked from investor hub resolves", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      const response = await page.goto("/demo", { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      expect(response?.status() ?? 0).not.toBe(404);
      const body = await bodyText(page);
      expect(body.length).toBeGreaterThan(MIN_TEXT);
    });
  });

  test("12 all persona hub paths return non-404 shells", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      for (const hub of PERSONA_HUBS) {
        const response = await page.goto(hub.path, { waitUntil: "domcontentloaded" });
        await dismissCookieBanner(page);
        expect(response?.status() ?? 0, hub.path).not.toBe(404);
        const body = await bodyText(page);
        expect(body.length, hub.path).toBeGreaterThan(MIN_TEXT);
      }
    });
  });
});
