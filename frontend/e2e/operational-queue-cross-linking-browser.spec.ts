/**
 * Operational queue cross-linking — browser smoke (workers=1).
 */
import { expect, test, type Page } from "@playwright/test";

import { OPERATIONAL_CROSS_LINKS, OPERATIONAL_CROSS_LINKS_MARKER } from "../src/lib/operational-cross-links";
import {
  RECRUITER_DAILY_COCKPIT_PAGE_MARKER,
  RECRUITER_DAILY_COCKPIT_ROUTE,
} from "../src/lib/recruiter-daily-operating-cockpit";
import { withFreshContext } from "./helpers/browser-lifecycle";

const SETTLE_MS = 12_000;
const GOTO_TIMEOUT_MS = 45_000;
const PATH = RECRUITER_DAILY_COCKPIT_ROUTE;

async function dismissCookieBanner(page: Page): Promise<void> {
  const accept = page.getByRole("button", { name: /accept cookies/i });
  if (await accept.isVisible().catch(() => false)) await accept.click();
}

async function gotoRoute(page: Page, path: string) {
  return page.goto(path, { waitUntil: "domcontentloaded", timeout: GOTO_TIMEOUT_MS });
}

async function bodyText(page: Page): Promise<string> {
  return page.locator("body").innerText().catch(() => "");
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

function pageRootLocator(page: Page) {
  return page.locator(
    `[data-recruiter-daily-cockpit-page="${RECRUITER_DAILY_COCKPIT_PAGE_MARKER}"], :text("Sign in required"), :text("Zaloguj")`,
  );
}

test.describe("Operational queue cross-linking browser", () => {
  test.describe.configure({ timeout: 120_000 });

  test("1 daily cockpit route renders page or auth shell — not blank", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      const response = await gotoRoute(page, PATH);
      await dismissCookieBanner(page);
      expect(response?.status() ?? 0).toBeLessThan(500);
      await pageRootLocator(page).first().waitFor({ state: "visible", timeout: SETTLE_MS }).catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      expect(body.length).toBeGreaterThan(32);
      if (!isAuthShell(body)) {
        await expect(
          page.locator(`[data-recruiter-daily-cockpit-page="${RECRUITER_DAILY_COCKPIT_PAGE_MARKER}"]`),
        ).toBeVisible();
      }
    });
  });

  test("2 operational cross-links panel when pilot loads", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoRoute(page, PATH);
      await dismissCookieBanner(page);
      await pageRootLocator(page).first().waitFor({ state: "visible", timeout: SETTLE_MS }).catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      if (isAuthShell(body)) return;
      const panel = page.getByTestId(OPERATIONAL_CROSS_LINKS_MARKER);
      if (!(await panel.isVisible().catch(() => false))) return;
      for (const link of OPERATIONAL_CROSS_LINKS) {
        await expect(page.getByTestId(`operational-cross-link-${link.id}`)).toBeVisible({ timeout: SETTLE_MS });
      }
    });
  });

  test("3 key cross-link hrefs resolve without 404", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoRoute(page, PATH);
      await dismissCookieBanner(page);
      await pageRootLocator(page).first().waitFor({ state: "visible", timeout: SETTLE_MS }).catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      if (isAuthShell(body)) return;
      if (!(await page.getByTestId(OPERATIONAL_CROSS_LINKS_MARKER).isVisible().catch(() => false))) return;
      for (const linkId of ["daily_cockpit", "request_intake", "board_monitor", "trust_overview"] as const) {
        const href = OPERATIONAL_CROSS_LINKS.find((link) => link.id === linkId)?.href;
        if (!href) continue;
        const response = await gotoRoute(page, href);
        expect(response?.status() ?? 0).not.toBe(404);
        await page
          .locator("body")
          .waitFor({ state: "visible", timeout: SETTLE_MS })
          .catch(() => undefined);
        expect((await bodyText(page)).length).toBeGreaterThan(32);
      }
    });
  });
});
