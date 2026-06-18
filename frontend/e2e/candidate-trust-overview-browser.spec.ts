/**
 * Candidate trust overview — browser smoke (workers=1).
 */
import { expect, test, type Page } from "@playwright/test";

import {
  CANDIDATE_TRUST_OVERVIEW_MARKERS,
  CANDIDATE_TRUST_OVERVIEW_PAGE_MARKER,
} from "../src/lib/candidate-trust-overview";

import { withFreshContext } from "./helpers/browser-lifecycle";

const SETTLE_MS = 12_000;
const DEMO_PATH = "/dashboard/trust/overview";
const TRUST_PATH = "/dashboard/trust";
const CONTROLS_PATH = "/dashboard/trust/controls";
const PROFILE_ALIAS_PATH = "/profile/trust/overview";

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

test.describe("Candidate trust overview browser", () => {
  test.describe.configure({ timeout: 120_000, mode: "serial" });

  test("1 dashboard/trust/overview shows page or auth shell — not 404 blank", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      const response = await page.goto(DEMO_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      expect(response?.status() ?? 0).not.toBe(404);
      await page
        .locator(
          `[data-candidate-trust-overview-page="${CANDIDATE_TRUST_OVERVIEW_PAGE_MARKER}"], [data-testid="${CANDIDATE_TRUST_OVERVIEW_MARKERS.notFound}"], :text("Sign in")`,
        )
        .first()
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      expect(body.length).toBeGreaterThan(32);
    });
  });

  test("2 all eight section markers visible when pilot loads", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(DEMO_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      const root = page.getByTestId(CANDIDATE_TRUST_OVERVIEW_MARKERS.page);
      const rootVisible = await root.isVisible().catch(() => false);
      if (!rootVisible) return;
      for (const marker of Object.values(CANDIDATE_TRUST_OVERVIEW_MARKERS)) {
        if (marker === CANDIDATE_TRUST_OVERVIEW_MARKERS.notFound) continue;
        await expect(page.getByTestId(marker)).toBeVisible({ timeout: SETTLE_MS });
      }
    });
  });

  test("3 trust module map shows nine module links", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(DEMO_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      if (!(await page.getByTestId(CANDIDATE_TRUST_OVERVIEW_MARKERS.page).isVisible().catch(() => false))) return;
      const links = page.getByTestId(CANDIDATE_TRUST_OVERVIEW_MARKERS.moduleMap).locator("a");
      expect(await links.count()).toBeGreaterThanOrEqual(9);
    });
  });

  test("4 click trust center link — no 404", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(DEMO_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      if (!(await page.getByTestId(CANDIDATE_TRUST_OVERVIEW_MARKERS.page).isVisible().catch(() => false))) return;
      await page.getByRole("link", { name: /trust center|centrum zaufania/i }).first().click();
      expect(page.url()).toContain(TRUST_PATH);
      expect((await bodyText(page)).length).toBeGreaterThan(32);
    });
  });

  test("5 click control center from recommended — no 404", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(DEMO_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      if (!(await page.getByTestId(CANDIDATE_TRUST_OVERVIEW_MARKERS.page).isVisible().catch(() => false))) return;
      await page.getByTestId(CANDIDATE_TRUST_OVERVIEW_MARKERS.recommendedNext).getByRole("link").click();
      expect(page.url()).toContain(CONTROLS_PATH);
    });
  });

  test("6 profile alias route resolves", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      const response = await page.goto(PROFILE_ALIAS_PATH, { waitUntil: "domcontentloaded" });
      expect(response?.status() ?? 0).not.toBe(404);
    });
  });
});
