/**
 * Landing auth-shell — fresh context must see login, not logout chrome (PL locale).
 *
 * Local:
 *   PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 PLAYWRIGHT_ENABLE_WEBSERVER=1 npm run test:landing-auth-shell-browser
 *
 * Production (gated):
 *   PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 \
 *   PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app npm run test:landing-auth-shell-browser
 */
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import { LOCALE_STORAGE_KEY } from "../src/lib/i18n";
import { withFreshContext } from "./helpers/browser-lifecycle";

const ROUTE_SETTLE_MS = 12_000;
const PL_LOCALE = "pl";

async function seedPlLocale(context: BrowserContext): Promise<void> {
  await context.addInitScript(
    ([key, locale]) => {
      try {
        window.localStorage.setItem(key, locale);
      } catch {
        /* ignore storage access errors */
      }
    },
    [LOCALE_STORAGE_KEY, PL_LOCALE] as const,
  );
}

async function seedExpiredAccessToken(context: BrowserContext): Promise<void> {
  await context.addInitScript(() => {
    const payload = btoa(JSON.stringify({ exp: 1 }))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    window.localStorage.setItem("twin_access_token", `aaa.${payload}.bbb`);
  });
}

async function dismissCookieBanner(page: Page): Promise<void> {
  const accept = page.getByRole("button", { name: /accept cookies|akceptuj/i });
  if (await accept.isVisible().catch(() => false)) {
    await accept.click();
  }
}

/** Wait for marketing header hydration — login link is the stable PL auth-shell signal. */
async function waitForLandingHydration(page: Page): Promise<void> {
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page
    .getByRole("link", { name: /^Zaloguj się$/i })
    .first()
    .waitFor({ state: "visible", timeout: ROUTE_SETTLE_MS })
    .catch(() => undefined);
  await page.waitForTimeout(300);
}

async function openLandingHome(page: Page): Promise<void> {
  const response = await page.goto("/", { waitUntil: "domcontentloaded", timeout: 30_000 });
  await dismissCookieBanner(page);
  const status = response?.status() ?? 0;
  expect(status, "/ HTTP status").not.toBe(404);
  await waitForLandingHydration(page);
}

async function assertGuestMarketingAuthShell(page: Page): Promise<void> {
  const loginLink = page.getByRole("link", { name: /^Zaloguj się$/i }).first();
  await expect(loginLink).toBeVisible();
  await expect(loginLink).toHaveAttribute("href", /\/login/);
  await expect(page.getByRole("button", { name: /^Wyloguj/i })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /^Panel$/i })).toHaveCount(0);
}

/** Authenticated workspace chrome exposes a persona badge — must not stick after stale JWT cleanup. */
async function assertNoAuthenticatedPersonaBadge(page: Page): Promise<void> {
  await expect(page.locator(".twin-persona-badge")).toHaveCount(0);
}

test.describe("landing auth-shell browser", () => {
  test.describe.configure({ mode: "serial", timeout: 60_000 });

  test("unauthenticated homepage shows login link and hides logout", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      await seedPlLocale(context);
      const page = await context.newPage();
      await openLandingHome(page);
      await assertGuestMarketingAuthShell(page);
    });
  });

  test("stale JWT in storage still shows login on homepage after reload", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      await seedPlLocale(context);
      await seedExpiredAccessToken(context);
      const page = await context.newPage();
      await openLandingHome(page);
      await page.reload({ waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await waitForLandingHydration(page);

      await assertGuestMarketingAuthShell(page);
      await assertNoAuthenticatedPersonaBadge(page);
      await expect
        .poll(async () => page.evaluate(() => window.localStorage.getItem("twin_access_token")))
        .toBeNull();
    });
  });
});
