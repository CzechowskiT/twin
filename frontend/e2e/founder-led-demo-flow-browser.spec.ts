/**
 * Founder-led demo flow — browser smoke (sequential, workers=1, withFreshContext).
 *
 * Local:
 *   PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 PLAYWRIGHT_ENABLE_WEBSERVER=1 npm run test:founder-led-demo-flow-browser
 *
 * Production (gated):
 *   PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 \
 *   PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app npm run test:founder-led-demo-flow-browser
 */
import { expect, test, type Page } from "@playwright/test";

import { withFreshContext } from "./helpers/browser-lifecycle";

const MIN_VISIBLE_TEXT = 32;
const ROUTE_SETTLE_MS = 8_000;

async function dismissCookieBanner(page: Page): Promise<void> {
  const accept = page.getByRole("button", { name: /accept cookies/i });
  if (await accept.isVisible().catch(() => false)) {
    await accept.click();
  }
}

async function visibleTextLength(page: Page): Promise<number> {
  return page.locator("body").innerText().then((t) => t.replace(/\s+/g, " ").trim().length);
}

async function assertNo404Blank(page: Page, path: string): Promise<void> {
  const response = await page.goto(path, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await dismissCookieBanner(page);
  expect(response?.status() ?? 0, `${path} HTTP status`).not.toBe(404);
  const textLen = await visibleTextLength(page);
  expect(textLen, `${path} visible text`).toBeGreaterThan(MIN_VISIBLE_TEXT);
  const title = await page.title();
  expect(title.toLowerCase(), `${path} title`).not.toContain("404");
}

test.describe("Founder-led demo flow browser", () => {
  test.describe.configure({ timeout: 120_000 });

  test("homepage Demo button links to /demo; player visible above journey", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      const demoLink = page.getByRole("link", { name: /demo/i }).first();
      await expect(demoLink).toBeVisible();
      await expect(demoLink).toHaveAttribute("href", /\/demo/);
      await page.goto("/demo", { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await expect(page.locator('[data-founder-led-demo="hero"]')).toBeVisible({ timeout: ROUTE_SETTLE_MS });
      await expect(page.locator("[data-interactive-demo-player]")).toBeVisible();
      const playerBox = await page.locator("[data-interactive-demo-player]").boundingBox();
      const journeyBox = await page.locator('[data-founder-led-demo="journey"]').boundingBox();
      expect(playerBox).toBeTruthy();
      expect(journeyBox).toBeTruthy();
      if (playerBox && journeyBox) {
        expect(playerBox.y).toBeLessThan(journeyBox.y);
      }
      await expect(page.locator('[data-founder-led-demo-cta="launch"]')).toBeVisible();
    });
  });

  test("role entry links avoid 404 and blank pages", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto("/demo", { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      const roleLinks = page.locator('[data-founder-led-demo-link^="role_"]');
      const count = await roleLinks.count();
      expect(count).toBeGreaterThanOrEqual(4);
      for (let i = 0; i < count; i += 1) {
        const link = roleLinks.nth(i);
        const href = await link.getAttribute("href");
        expect(href, `role link ${i} href`).toBeTruthy();
        await link.scrollIntoViewIfNeeded();
        await link.click();
        await page.waitForURL((url) => !url.pathname.endsWith("/demo") || url.search.length > 0, {
          timeout: ROUTE_SETTLE_MS,
        }).catch(() => page.waitForLoadState("domcontentloaded"));
        await page.waitForLoadState("domcontentloaded");
        expect(page.url().toLowerCase()).not.toContain("404");
        const textLen = await visibleTextLength(page);
        expect(textLen).toBeGreaterThan(MIN_VISIBLE_TEXT);
        await page.goto("/demo", { waitUntil: "domcontentloaded" });
        await dismissCookieBanner(page);
        await expect(page.locator("[data-interactive-demo-player]")).toBeVisible({ timeout: ROUTE_SETTLE_MS });
      }
    });
  });

  test("auth-gated recruiter role entry preserves next on login path", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto("/demo", { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      const recruiterLink = page.locator('[data-founder-led-demo-link="role_recruiter"]');
      await expect(recruiterLink).toBeVisible();
      const href = await recruiterLink.getAttribute("href");
      expect(href ?? "").toMatch(/next=%2Frecruiter|next=\/recruiter/);
      await recruiterLink.click();
      await page.waitForURL(/login|recruiter/, { timeout: ROUTE_SETTLE_MS });
      const url = page.url();
      const body = (await page.locator("body").innerText()).toLowerCase();
      const onLogin = url.includes("/login") || body.includes("sign in") || body.includes("zaloguj");
      const onRecruiter = url.includes("/recruiter");
      expect(onLogin || onRecruiter).toBeTruthy();
      if (onLogin) {
        expect(url).toMatch(/next=%2Frecruiter|next=\/recruiter/);
      }
    });
  });

  test("company role entry and boundaries section render", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await assertNo404Blank(page, "/demo");
      await expect(page.locator('[data-founder-led-demo="boundaries"]')).toBeVisible();
      const companyLink = page.locator('[data-founder-led-demo-link="role_company"]');
      await expect(companyLink).toHaveAttribute("href", /company\/dashboard|login/);
      await companyLink.click();
      await page.waitForURL(/company|login/, { timeout: ROUTE_SETTLE_MS });
      const textLen = await visibleTextLength(page);
      expect(textLen).toBeGreaterThan(MIN_VISIBLE_TEXT);
    });
  });
});
