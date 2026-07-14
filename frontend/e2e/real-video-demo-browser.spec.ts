/**
 * Real video /demo — MP4/WebM player, role flows, CTAs (EN/PL, multi-viewport).
 *
 * Local:
 *   PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 PLAYWRIGHT_ENABLE_WEBSERVER=1 npm run test:real-video-demo-browser
 */
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

import { LOCALE_STORAGE_KEY } from "../src/lib/i18n";
import { withFreshContext } from "./helpers/browser-lifecycle";

const SETTLE_MS = 20_000;
const SCREENSHOT_DIR = join(process.cwd(), "test-results", "real-video-demo");

type ViewportCase = { label: string; width: number; height: number };
type LocaleCase = { locale: "en" | "pl"; label: string };

const VIEWPORTS: ViewportCase[] = [
  { label: "1920x1080", width: 1920, height: 1080 },
  { label: "1440x900", width: 1440, height: 900 },
  { label: "1280x800", width: 1280, height: 800 },
  { label: "390x844", width: 390, height: 844 },
  { label: "375x667", width: 375, height: 667 },
];

const LOCALES: LocaleCase[] = [
  { locale: "en", label: "EN" },
  { locale: "pl", label: "PL" },
];

const ROLES = ["candidate", "recruiter", "company"] as const;

async function dismissCookieBanner(page: Page): Promise<void> {
  const accept = page.getByRole("button", {
    name: /accept cookies|akceptuję pliki cookie|akceptuj pliki/i,
  });
  if (await accept.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await accept.click({ force: true }).catch(() => undefined);
    await page.waitForTimeout(200);
  }
}

async function seedLocale(context: BrowserContext, locale: string): Promise<void> {
  await context.addInitScript(
    (args: readonly [string, string]) => {
      const [key, value] = args;
      try {
        window.localStorage?.setItem(key, value);
      } catch {
        /* ignore */
      }
    },
    [LOCALE_STORAGE_KEY, locale] as const,
  );
}

async function gotoDemo(page: Page): Promise<void> {
  await page.goto("/demo", { waitUntil: "domcontentloaded", timeout: 30_000 });
  await dismissCookieBanner(page);
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await expect(page.locator("[data-sales-demo-hero]").first()).toBeVisible({ timeout: SETTLE_MS });
}

async function screenshot(page: Page, name: string): Promise<void> {
  if (!existsSync(SCREENSHOT_DIR)) mkdirSync(SCREENSHOT_DIR, { recursive: true });
  await page.screenshot({ path: join(SCREENSHOT_DIR, `${name}.png`), fullPage: false });
}

test.describe("Real video demo browser", () => {
  test.describe.configure({ timeout: 300_000 });

  for (const viewport of VIEWPORTS.slice(0, 3)) {
    for (const localeCase of LOCALES) {
      test(`${viewport.label} ${localeCase.label} — real video element and sources`, async ({ browser }) => {
        await withFreshContext(browser, async (context) => {
          await seedLocale(context, localeCase.locale);
          const page = await context.newPage();
          await page.setViewportSize({ width: viewport.width, height: viewport.height });
          await gotoDemo(page);

          const video = page.locator("[data-demo-product-video]").first();
          await expect(video).toBeVisible({ timeout: SETTLE_MS });

          const duration = await video.evaluate((el: HTMLVideoElement) => el.duration);
          expect(duration).toBeGreaterThanOrEqual(30);

          const currentSrc = await video.evaluate((el: HTMLVideoElement) => el.currentSrc);
          expect(currentSrc).toMatch(/\.(mp4|webm)/);

          const poster = await video.getAttribute("poster");
          expect(poster).toMatch(/twin-product-film-poster/);

          await screenshot(page, `hero-${viewport.label}-${localeCase.label}`);
        });
      });
    }
  }

  test("EN — play pause seek skip captions", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      await seedLocale(context, "en");
      const page = await context.newPage();
      await page.setViewportSize({ width: 1280, height: 800 });
      await gotoDemo(page);

      const video = page.locator("[data-demo-product-video]").first();
      await page.locator("[data-demo-video-play]").click();
      await page.waitForTimeout(500);
      await page.locator("[data-demo-video-pause]").click();

      await page.locator("[data-demo-video-play]").click();
      await video.evaluate((el: HTMLVideoElement) => {
        el.currentTime = 10;
      });
      await page.waitForTimeout(300);
      await screenshot(page, "video-10s-EN");

      await video.evaluate((el: HTMLVideoElement) => {
        el.currentTime = 22;
      });
      await page.waitForTimeout(300);
      await screenshot(page, "video-22s-EN");

      await page.locator("[data-demo-video-captions]").click();
      await page.locator("[data-demo-video-skip]").click();
      await expect(page.locator("[data-sales-demo-roles]").first()).toBeVisible();
    });
  });

  for (const role of ROLES) {
    test(`1280 EN — role ${role} flow and outcome`, async ({ browser }) => {
      await withFreshContext(browser, async (context) => {
        await seedLocale(context, "en");
        const page = await context.newPage();
        await page.setViewportSize({ width: 1280, height: 800 });
        await gotoDemo(page);

        await page.locator("[data-demo-video-skip]").click();
        await page.locator(`[data-demo-role-card="${role}"]`).click();
        await expect(page.locator("[data-sales-demo-flow]").first()).toBeVisible({ timeout: SETTLE_MS });
        await expect(page.locator("[data-demo-animated-surface]").first()).toBeVisible({ timeout: SETTLE_MS });
        await screenshot(page, `role-${role}-EN`);
      });
    });
  }

  test("PL — CTAs and mobile sticky", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      await seedLocale(context, "pl");
      const page = await context.newPage();
      await page.setViewportSize({ width: 390, height: 844 });
      await gotoDemo(page);

      await expect(page.getByRole("link", { name: /umów prezentację/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /zobacz demo/i })).toBeVisible();
      await screenshot(page, "mobile-PL-hero");
    });
  });

  test("visual gate — page must not use dark opening film", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.setViewportSize({ width: 1280, height: 800 });
      await gotoDemo(page);

      const darkFilm = page.locator("[data-demo-opening-film]");
      await expect(darkFilm).toHaveCount(0);

      const hero = page.locator("[data-sales-demo-hero]").first();
      const bg = await hero.evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(bg).not.toBe("rgb(15, 23, 42)");
    });
  });
});
