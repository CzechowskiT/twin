/**
 * Candidate offers/matches real content — browser smoke (workers=1).
 */
import { expect, test, type Page } from "@playwright/test";

import {
  CANDIDATE_MATCHES_PAGE_MARKER,
  CANDIDATE_OFFERS_PAGE_MARKER,
} from "../src/lib/candidate-offers-matches-demo-data";
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
    lower.includes("candidate workspace only") ||
    lower.includes("tylko dla kandydatów") ||
    lower.includes("redirecting to sign in")
  );
}

async function waitForOffersOrAuthShell(page: Page): Promise<void> {
  await dismissCookieBanner(page);
  await page
    .locator(
      `[data-candidate-offers-page="${CANDIDATE_OFFERS_PAGE_MARKER}"], :text("Sign in required"), :text("Candidate workspace only"), :text("Zaloguj")`,
    )
    .first()
    .waitFor({ state: "visible", timeout: SETTLE_MS })
    .catch(() => undefined);
}

async function waitForMatchesOrAuthShell(page: Page): Promise<void> {
  await dismissCookieBanner(page);
  await page
    .locator(
      `[data-candidate-matches-page="${CANDIDATE_MATCHES_PAGE_MARKER}"], :text("Sign in required"), :text("Candidate workspace only"), :text("Zaloguj")`,
    )
    .first()
    .waitFor({ state: "visible", timeout: SETTLE_MS })
    .catch(() => undefined);
}

test.describe("Candidate offers and matches real content", () => {
  test.describe.configure({ timeout: 120_000 });

  test("Oferty opens distinct offers route with route-specific or auth shell", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);

      const offersLink = page.locator('[data-workspace-module="jobs"] a').first();
      if (await offersLink.isVisible().catch(() => false)) {
        await offersLink.click();
        await page.waitForURL(/\/dashboard\/jobs/, { timeout: SETTLE_MS });
      } else {
        await page.goto("/dashboard/jobs", { waitUntil: "domcontentloaded" });
      }

      expect(page.url()).toMatch(/\/dashboard\/jobs/);
      expect(page.url()).not.toMatch(/\/dashboard\/?(\?|#|$)/);
      await waitForOffersOrAuthShell(page);
      const body = (await bodyText(page)).toLowerCase();
      if (isAuthShell(body)) {
        expect(body.length).toBeGreaterThan(40);
        return;
      }
      await expect(page.locator(`[data-candidate-offers-page="${CANDIDATE_OFFERS_PAGE_MARKER}"]`)).toBeVisible();
      expect(body).toMatch(/offer|ofert|job|discovery/);
    });
  });

  test("Dopasowania opens distinct matches route with route-specific or auth shell", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);

      const matchesLink = page.locator('[data-workspace-module="matches"] a').first();
      if (await matchesLink.isVisible().catch(() => false)) {
        await matchesLink.click();
        await page.waitForURL(/\/dashboard\/matches/, { timeout: SETTLE_MS });
      } else {
        await page.goto("/dashboard/matches", { waitUntil: "domcontentloaded" });
      }

      expect(page.url()).toMatch(/\/dashboard\/matches/);
      expect(page.url()).not.toMatch(/\/dashboard\/?(\?|#|$)/);
      await waitForMatchesOrAuthShell(page);
      const body = (await bodyText(page)).toLowerCase();
      if (isAuthShell(body)) {
        expect(body.length).toBeGreaterThan(40);
        return;
      }
      await expect(page.locator(`[data-candidate-matches-page="${CANDIDATE_MATCHES_PAGE_MARKER}"]`)).toBeVisible();
      expect(body).toMatch(/match|dopasow/);
    });
  });

  test("direct routes stay off generic dashboard without anchor bounce", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      for (const path of ["/dashboard/jobs", "/dashboard/matches"]) {
        await page.goto(path, { waitUntil: "domcontentloaded" });
        await dismissCookieBanner(page);
        await page.waitForTimeout(800);
        expect(page.url()).toContain(path);
        expect(page.url()).not.toContain("#dashboard-");
        expect((await bodyText(page)).replace(/\s+/g, " ").trim().length).toBeGreaterThan(40);
      }
    });
  });
});
