/**
 * Interactive demo — 8 full-product-story scenes with data-testid (EN/PL, desktop/mobile).
 *
 * Local:
 *   PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 PLAYWRIGHT_ENABLE_WEBSERVER=1 npm run test:interactive-demo-scenes-browser
 *
 * Production (gated):
 *   PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 \
 *   PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app npm run test:interactive-demo-scenes-browser
 */
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import { DEMO_SEQUENCES } from "../src/lib/demo/demo-scene-manifest";
import { LOCALE_STORAGE_KEY } from "../src/lib/i18n";
import { withFreshContext } from "./helpers/browser-lifecycle";

const FULL_DEMO_SCENE_IDS = DEMO_SEQUENCES["full-product-story"].sceneIds;
const SETTLE_MS = 12_000;

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

async function dismissCookieBanner(page: Page): Promise<void> {
  const accept = page.getByRole("button", {
    name: /accept cookies|akceptuję pliki cookie|akceptuj pliki/i,
  });
  if (await accept.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await accept.click({ force: true }).catch(() => undefined);
    await page.waitForTimeout(200);
  }
  const reject = page.getByRole("button", { name: /reject optional|odrzuć opcjonalne/i });
  if (await reject.isVisible({ timeout: 500 }).catch(() => false)) {
    await reject.click({ force: true }).catch(() => undefined);
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

async function gotoDemoPlayer(page: Page): Promise<void> {
  await page.goto("/demo", { waitUntil: "domcontentloaded", timeout: 30_000 });
  await dismissCookieBanner(page);
  await page.waitForLoadState("networkidle").catch(() => undefined);
  const player = page.locator("#interactive-story").first();
  await expect(player).toBeVisible({ timeout: SETTLE_MS });
  await page.locator("[data-demo-hero-cta]").first().click({ timeout: 5_000 }).catch(() => undefined);
  await page.locator("[data-demo-timeline] button").first().waitFor({ state: "visible", timeout: SETTLE_MS });
}

async function selectSceneByIndex(page: Page, index: number, viewportWidth: number): Promise<void> {
  await dismissCookieBanner(page);
  const useChapters = viewportWidth >= 1024;
  const chapter = useChapters
    ? page.locator("[data-demo-chapters] button").nth(index)
    : page.locator("[data-demo-timeline] .flex.flex-wrap button").nth(index);
  await chapter.scrollIntoViewIfNeeded();
  await chapter.click({ force: true });
  await page.waitForTimeout(300);
}

test.describe("Interactive demo scenes browser", () => {
  test.describe.configure({ timeout: 180_000 });

  for (const { locale, label: localeLabel } of LOCALES) {
    for (const { label: vpLabel, width, height } of VIEWPORTS) {
      test(`${localeLabel} ${vpLabel} — all 8 full-demo scenes expose data-testid`, async ({ browser }) => {
        await withFreshContext(browser, async (context) => {
          await seedLocale(context, locale);
          const page = await context.newPage();
          await page.setViewportSize({ width, height });
          await gotoDemoPlayer(page);
          await page.reload({ waitUntil: "domcontentloaded" });
          await dismissCookieBanner(page);
          const player = page.locator("#interactive-story").first();
          await player.scrollIntoViewIfNeeded();
          await expect(player).toBeVisible({ timeout: SETTLE_MS });

          for (let i = 0; i < FULL_DEMO_SCENE_IDS.length; i += 1) {
            const sceneId = FULL_DEMO_SCENE_IDS[i]!;
            await selectSceneByIndex(page, i, width);
            const scene = player.locator(`[data-testid="demo-scene-${sceneId}"]`);
            await expect(scene, `${localeLabel} ${vpLabel} scene ${sceneId}`).toBeVisible({ timeout: SETTLE_MS });
            const box = await scene.boundingBox();
            expect(box?.height ?? 0, `${sceneId} height`).toBeGreaterThan(80);
          }
        });
      });
    }
  }
});
