/**
 * Cinematic /demo — hero, opening film, role journeys (EN/PL, desktop/mobile).
 *
 * Local:
 *   PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 PLAYWRIGHT_ENABLE_WEBSERVER=1 npm run test:cinematic-demo-browser
 */
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import { LOCALE_STORAGE_KEY } from "../src/lib/i18n";
import { withFreshContext } from "./helpers/browser-lifecycle";

const SETTLE_MS = 15_000;

type ViewportCase = { label: string; width: number; height: number };
type LocaleCase = { locale: "en" | "pl"; label: string };

const VIEWPORTS: ViewportCase[] = [
  { label: "desktop", width: 1280, height: 800 },
  { label: "mobile", width: 390, height: 844 },
];

const LOCALES: LocaleCase[] = [
  { locale: "en", label: "EN" },
  { locale: "pl", label: "PL" },
];

const ROLES = ["overview", "candidate", "recruiter", "company"] as const;

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
  const hero = page.locator("[data-demo-hero]").first();
  await expect(hero).toBeVisible({ timeout: SETTLE_MS });
}

async function startJourney(page: Page): Promise<void> {
  const skip = page.getByRole("button", { name: /skip to interactive|pomiń do interaktywnej/i });
  if (await skip.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await skip.click();
  } else {
    await page.locator("[data-demo-hero-cta]").first().click();
  }
  const story = page.locator("#interactive-story").first();
  await expect(story.locator("[data-demo-timeline]")).toBeVisible({ timeout: SETTLE_MS });
}

test.describe("Cinematic demo browser", () => {
  test.describe.configure({ timeout: 180_000 });

  for (const viewport of VIEWPORTS) {
    for (const localeCase of LOCALES) {
      test(`${viewport.label} ${localeCase.label} — hero and experience mount`, async ({ browser }) => {
        await withFreshContext(browser, async (context) => {
          await seedLocale(context, localeCase.locale);
          const page = await context.newPage();
          await page.setViewportSize({ width: viewport.width, height: viewport.height });
          await gotoDemo(page);

          await expect(page.locator("[data-demo-hero]").first()).toBeVisible();
          await expect(page.locator("[data-demo-hero] [data-demo-role-selector]").first()).toBeVisible();
          await expect(page.locator("#interactive-story").first()).toBeVisible();
        });
      });

      test(`${viewport.label} ${localeCase.label} — skip film and start journey`, async ({ browser }) => {
        await withFreshContext(browser, async (context) => {
          await seedLocale(context, localeCase.locale);
          const page = await context.newPage();
          await page.setViewportSize({ width: viewport.width, height: viewport.height });
          await gotoDemo(page);
          await startJourney(page);
          await expect(page.locator("[data-demo-controls] button").first()).toBeVisible();
        });
      });

      for (const role of ROLES) {
        test(`${viewport.label} ${localeCase.label} — role ${role} surfaces render`, async ({ browser }) => {
          await withFreshContext(browser, async (context) => {
            await seedLocale(context, localeCase.locale);
            const page = await context.newPage();
            await page.setViewportSize({ width: viewport.width, height: viewport.height });
            await gotoDemo(page);
            await startJourney(page);

            const story = page.locator("#interactive-story").first();
            const index = ROLES.indexOf(role);
            await story.locator("[data-demo-role-selector] button").nth(index).click();

            await expect(story.locator("[data-demo-animated-surface]")).toBeVisible({ timeout: SETTLE_MS });
            await expect(story.locator("[data-testid^='demo-scene-']").first()).toBeVisible();
          });
        });
      }
    }
  }

  test("keyboard — timeline progressbar present", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoDemo(page);
      await startJourney(page);
      const story = page.locator("#interactive-story").first();
      await expect(story.locator('[role="progressbar"]')).toBeVisible({ timeout: SETTLE_MS });
    });
  });
});
