/**
 * Interactive demo flows — EN/PL desktop/mobile browser smoke.
 *
 * Local:
 *   PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 PLAYWRIGHT_ENABLE_WEBSERVER=1 npm run test:interactive-demo-flow-browser
 *
 * Production (gated):
 *   PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 \
 *   PLAYWRIGHT_BASE_URL=https://twin-society.vercel.app npm run test:interactive-demo-flow-browser
 */
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import { LOCALE_STORAGE_KEY } from "../src/lib/i18n";
import { withFreshContext } from "./helpers/browser-lifecycle";

const ROLES = ["candidate", "recruiter", "company"] as const;
const SETTLE_MS = 20_000;

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
  const accept = page.getByRole("button", { name: /accept cookies|akceptuj/i });
  if (await accept.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await accept.click({ force: true }).catch(() => undefined);
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

async function gotoDemoAndSkipFilm(page: Page): Promise<void> {
  await page.goto("/demo", { waitUntil: "domcontentloaded", timeout: 30_000 });
  await dismissCookieBanner(page);
  await expect(page.locator("[data-sales-demo-hero]").first()).toBeVisible({ timeout: SETTLE_MS });
  const roles = page.locator("[data-sales-demo-roles]").first();
  if (!(await roles.isVisible().catch(() => false))) {
    await page.locator("[data-demo-video-skip]").click({ force: true });
    await expect(roles).toBeVisible({ timeout: SETTLE_MS });
  }
}

test.describe("Interactive demo flow browser", () => {
  test.describe.configure({ timeout: 180_000 });

  for (const { locale, label: localeLabel } of LOCALES) {
    for (const { label: vpLabel, width, height } of VIEWPORTS) {
      for (const role of ROLES) {
        test(`${localeLabel} ${vpLabel} ${role} — flow beats and decision UI`, async ({ browser }) => {
          await withFreshContext(browser, async (context) => {
            await seedLocale(context, locale);
            const page = await context.newPage();
            await page.setViewportSize({ width, height });
            await gotoDemoAndSkipFilm(page);
            await page.locator(`[data-demo-role-card="${role}"]`).click();
            const flow = page.locator("[data-interactive-role-flow]").first();
            await expect(flow).toBeVisible({ timeout: SETTLE_MS });
            await expect(page.locator("[data-demo-interactive-stage]").first()).toBeVisible();

            const initialPhase = await page.locator("[data-demo-flow-phase]").first().getAttribute("data-demo-flow-phase");
            expect(initialPhase).toBeTruthy();

            await page.waitForTimeout(2_500);
            const laterPhase = await page.locator("[data-demo-flow-phase]").first().getAttribute("data-demo-flow-phase");
            expect(laterPhase).not.toEqual(initialPhase);

            await page.locator("[data-demo-flow-play]").click({ force: true });
            await page.waitForTimeout(3_000);

            const decisionBtn = page.locator('[data-demo-flow-decision="accept"]').first();
            if (await decisionBtn.isVisible({ timeout: 8_000 }).catch(() => false)) {
              await decisionBtn.click({ force: true });
              await expect(page.locator("[data-demo-flow-loading], [data-demo-flow-success]").first()).toBeVisible({
                timeout: SETTLE_MS,
              });
            }

            await expect(page.locator("[data-demo-flow-caption]").first()).not.toBeEmpty();
          });
        });
      }
    }
  }

  test("audio toggle requires gesture — no autoplay", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await gotoDemoAndSkipFilm(page);
      await page.locator('[data-demo-role-card="candidate"]').click();
      const toggle = page.locator("[data-demo-audio-toggle]").first();
      await expect(toggle).toBeDisabled();
      await page.locator("[data-demo-flow-play]").click({ force: true });
      await expect(toggle).toBeEnabled();
      const audio = page.locator("[data-demo-audio]").first();
      await expect(audio).toHaveJSProperty("autoplay", false);
    });
  });
});
