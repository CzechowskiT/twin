/**
 * Safe locale/copy browser smoke — 1 worker, localStorage locale, no auth, no destructive clicks.
 *
 * Local:
 *   PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 PLAYWRIGHT_ENABLE_WEBSERVER=1 npm run test:i18n-native-copy-quality-browser
 *
 * Production (gated):
 *   PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 \
 *   PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app npm run test:i18n-native-copy-quality-browser
 */
import { expect, test, type Page } from "@playwright/test";

import { LOCALE_STORAGE_KEY } from "../src/lib/i18n";
import { withFreshContext } from "./helpers/browser-lifecycle";

const RAW_PLACEHOLDER = /\{(company|role|candidate|count|done|total)\}/;

type LocaleRouteCase = {
  locale: string;
  path: string;
  expectedText: string;
};

const CASES: LocaleRouteCase[] = [
  {
    locale: "pl",
    path: "/",
    expectedText: "kalendarz akceptacji",
  },
  {
    locale: "es",
    path: "/",
    expectedText: "Agente de carrera autónomo",
  },
  {
    locale: "de",
    path: "/",
    expectedText: "Autonomer Karriere-Agent",
  },
];

async function dismissCookieBanner(page: Page): Promise<void> {
  const accept = page.getByRole("button", { name: /accept cookies/i });
  if (await accept.isVisible().catch(() => false)) {
    await accept.click();
  }
}

test.describe.configure({ mode: "serial" });

test("locale-specific copy renders without raw placeholders on representative routes", async ({ browser }) => {
  await withFreshContext(browser, async (context) => {
    for (const { locale, path, expectedText } of CASES) {
      const page = await context.newPage();
      await page.addInitScript(
        ([key, loc]) => {
          try {
            window.localStorage.setItem(key, loc);
          } catch {
            /* ignore */
          }
        },
        [LOCALE_STORAGE_KEY, locale] as const,
      );
      const response = await page.goto(path, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await dismissCookieBanner(page);
      const status = response?.status() ?? 0;
      expect(status, `${path} HTTP status`).not.toBe(404);
      await page.waitForTimeout(1500);
      const bodyText = await page.locator("body").innerText();
      expect(bodyText, `${locale} ${path} expected copy`).toContain(expectedText);
      expect(RAW_PLACEHOLDER.test(bodyText), `${locale} ${path} raw placeholder`).toBe(false);
      const title = await page.title();
      expect(title.toLowerCase(), `${path} title`).not.toContain("404");
      await page.close();
    }
  });
});
