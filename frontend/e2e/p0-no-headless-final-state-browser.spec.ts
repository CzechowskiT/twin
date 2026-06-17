/**
 * P0 no headless final state — sequential browser smoke (workers=1, ONE page at a time).
 *
 * Local:
 *   PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 PLAYWRIGHT_ENABLE_WEBSERVER=1 \
 *   npm run test:p0-no-headless-final-state-browser
 *
 * Production (gated):
 *   PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 \
 *   PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app \
 *   npm run test:p0-no-headless-final-state-browser
 */
import { expect, test, type Page } from "@playwright/test";

import { withFreshContext } from "./helpers/browser-lifecycle";
import {
  P0_CRITICAL_ALL_ROUTES,
  P0_PAGE_MARKER_SELECTORS,
  evaluateFinalState,
  snapshotFinalStateDom,
} from "./helpers/p0-no-headless-final-state";

const ROUTE_SETTLE_MS = 12_000;
const ROUTE_GOTO_MS = 30_000;

async function dismissCookieBanner(page: Page): Promise<void> {
  const accept = page.getByRole("button", { name: /accept cookies/i });
  if (await accept.isVisible().catch(() => false)) {
    await accept.click();
  }
}

async function waitForMeaningfulPaint(page: Page, path: string): Promise<void> {
  const markerSelector = P0_PAGE_MARKER_SELECTORS.join(", ");
  await page
    .locator(
      `${markerSelector}, [data-testid='lightweight-route-shell-ready'], [data-testid='lightweight-route-shell-skeleton'], a[href*='next='], :text('Sign in'), :text('Zaloguj')`,
    )
    .first()
    .waitFor({ state: "visible", timeout: ROUTE_SETTLE_MS })
    .catch(() => undefined);
  await page.waitForTimeout(300);
  void path;
}

test.describe("P0 no headless final state browser", () => {
  test.describe.configure({ timeout: 900_000 });

  for (const path of P0_CRITICAL_ALL_ROUTES) {
    test(`route ${path} — meaningful final state, not shell-only`, async ({ browser }) => {
      await withFreshContext(browser, async (context) => {
        const page = await context.newPage();
        const response = await page.goto(path, {
          waitUntil: "domcontentloaded",
          timeout: ROUTE_GOTO_MS,
        });
        await dismissCookieBanner(page);
        expect(response?.status() ?? 0, `${path} HTTP status`).not.toBe(404);

        await waitForMeaningfulPaint(page, path);

        const dom = await page.evaluate(snapshotFinalStateDom);
        const verdict = evaluateFinalState(dom);
        const title = await page.title();

        expect(title.toLowerCase(), `${path} document title`).not.toContain("404");
        expect(
          verdict.pass,
          `${path} final state: ${verdict.reason} | main=${dom.mainContentLength} visible=${dom.visibleTextLength} chromeOnly=${dom.isChromeOnly} auth=${dom.hasAuthCard} skeleton=${dom.shellSkeleton}`,
        ).toBe(true);
      });
    });
  }
});
