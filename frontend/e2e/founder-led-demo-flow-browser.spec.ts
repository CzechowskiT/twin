/**
 * Founder-led demo flow — browser smoke (SalesDemoExperience selectors).
 *
 * Local:
 *   PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 PLAYWRIGHT_ENABLE_WEBSERVER=1 npm run test:founder-led-demo-flow-browser
 *
 * Production (gated):
 *   PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 \
 *   PLAYWRIGHT_BASE_URL=https://twin-society.vercel.app npm run test:founder-led-demo-flow-browser
 */
import { expect, test, type Page } from "@playwright/test";

import { withFreshContext } from "./helpers/browser-lifecycle";

const MIN_VISIBLE_TEXT = 32;
const ROUTE_SETTLE_MS = 20_000;
const ROLES = ["candidate", "recruiter", "company"] as const;

async function dismissCookieBanner(page: Page): Promise<void> {
  const accept = page.getByRole("button", { name: /accept cookies|akceptuj/i });
  if (await accept.isVisible().catch(() => false)) {
    await accept.click({ force: true }).catch(() => undefined);
  }
}

async function gotoDemo(page: Page): Promise<void> {
  await page.goto("/demo", { waitUntil: "domcontentloaded", timeout: 30_000 });
  await dismissCookieBanner(page);
  await expect(page.locator("[data-sales-demo-hero]").first()).toBeVisible({ timeout: ROUTE_SETTLE_MS });
}

async function skipToRoles(page: Page): Promise<void> {
  await dismissCookieBanner(page);
  const roles = page.locator("[data-sales-demo-roles]").first();
  if (await roles.isVisible().catch(() => false)) return;

  const skip = page.locator("[data-demo-video-skip]");
  await expect(skip).toBeVisible({ timeout: ROUTE_SETTLE_MS });
  await skip.click({ force: true });
  await expect(roles).toBeVisible({ timeout: ROUTE_SETTLE_MS });
}

test.describe("Founder-led demo flow browser", () => {
  test.describe.configure({ timeout: 120_000 });

  test("homepage Demo button links to /demo; video visible above role cards", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      const demoLink = page.getByRole("link", { name: /demo/i }).first();
      await expect(demoLink).toBeVisible();
      await expect(demoLink).toHaveAttribute("href", /\/demo/);
      await gotoDemo(page);
      await expect(page.locator("[data-demo-product-video]").first()).toBeVisible();
      await skipToRoles(page);
      await expect(page.locator("[data-sales-demo-roles]").first()).toBeVisible();
      await expect(page.locator('[data-demo-cta="watch"]')).toBeVisible();
      await expect(page.locator('[data-demo-cta="presentation"]')).toBeVisible();
    });
  });

  test("role cards open in-page flows without blank pages", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      for (const role of ROLES) {
        await gotoDemo(page);
        await skipToRoles(page);
        await page.locator(`[data-demo-role-card="${role}"]`).click();
        await expect(page.locator("[data-sales-demo-flow]").first()).toBeVisible({ timeout: ROUTE_SETTLE_MS });
        await expect(page.locator("[data-interactive-role-flow]").first()).toBeVisible({ timeout: ROUTE_SETTLE_MS });
        await expect(page.locator("[data-demo-interactive-stage]").first()).toBeVisible({ timeout: ROUTE_SETTLE_MS });
        const textLen = await page.locator("body").innerText().then((t) => t.replace(/\s+/g, " ").trim().length);
        expect(textLen).toBeGreaterThan(MIN_VISIBLE_TEXT);
      }
    });
  });

  test("pilot CTA section renders below experience", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoDemo(page);
      await expect(page.locator("[data-demo-pilot-cta]")).toBeVisible();
      const pilotLink = page.locator("[data-demo-pilot-cta] a[href='/waitlist']");
      await expect(pilotLink).toBeVisible();
    });
  });

  test("visual gate — no legacy opening film or below-fold junk", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoDemo(page);
      await expect(page.locator("[data-demo-opening-film]")).toHaveCount(0);
      await expect(page.locator("[data-interactive-demo-player]")).toHaveCount(0);
      await expect(page.locator('[data-founder-led-demo="journey"]')).toHaveCount(0);
      await expect(page.locator('[data-founder-led-demo="boundaries"]')).toHaveCount(0);
    });
  });
});
