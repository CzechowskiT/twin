/**
 * Performance-safe moving logo marquee — browser regression (sequential, workers=1).
 *
 * Local:
 *   PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 PLAYWRIGHT_ENABLE_WEBSERVER=1 \
 *   npm run test:performance-safe-moving-logo-marquee-browser
 *
 * Production smoke (post-deploy):
 *   PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 \
 *   PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app \
 *   npm run test:performance-safe-moving-logo-marquee-browser
 */
import { expect, test, type Page } from "@playwright/test";

import { withFreshContext } from "./helpers/browser-lifecycle";

const ROUTE_SETTLE_MS = 8_000;
const CURATED_SLUGS = [
  "apple",
  "microsoft",
  "google",
  "amazon",
  "nvidia",
  "meta",
  "visa",
  "salesforce",
  "netflix",
] as const;

async function dismissCookieBanner(page: Page): Promise<void> {
  const accept = page.getByRole("button", { name: /accept cookies/i });
  if (await accept.isVisible().catch(() => false)) {
    await accept.click();
  }
}

async function waitForSafeMarquee(page: Page): Promise<void> {
  await expect(page.locator(".performance-safe-logo-marquee")).toBeVisible({
    timeout: ROUTE_SETTLE_MS,
  });
}

test.describe("Performance-safe moving logo marquee browser", () => {
  test.describe.configure({ timeout: 120_000 });

  test("1 login route mounts safe marquee band", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto("/login", { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await waitForSafeMarquee(page);
    });
  });

  test("2 dashboard route mounts safe marquee band", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await waitForSafeMarquee(page);
    });
  });

  test("3 safe marquee uses three identical segments", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto("/login", { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await waitForSafeMarquee(page);
      await expect(page.locator(".performance-safe-marquee-segment")).toHaveCount(3);
    });
  });

  test("4 animated track sets segment CSS variable to 3", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto("/login", { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await waitForSafeMarquee(page);
      const segments = await page
        .locator(".performance-safe-marquee-track")
        .evaluate((el) => getComputedStyle(el).getPropertyValue("--performance-safe-marquee-segments"));
      expect(segments.trim()).toBe("3");
    });
  });

  test("5 every visible card has inline curated wordmark mark", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto("/login", { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await waitForSafeMarquee(page);
      const firstSegment = page.locator(".performance-safe-marquee-segment").first();
      const marks = firstSegment.locator("[data-performance-safe-logo-mark]");
      await expect(marks).toHaveCount(9);
      for (const slug of CURATED_SLUGS) {
        await expect(firstSegment.locator(`[data-performance-safe-logo-mark="${slug}"]`)).toHaveCount(1);
      }
      await expect(page.locator(".performance-safe-logo-marquee img")).toHaveCount(0);
    });
  });

  test("6 track width covers at least 2.5x viewport at 1440px", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto("/login", { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await waitForSafeMarquee(page);
      const widths = await page.locator(".performance-safe-marquee-track").evaluate((el) => ({
        track: el.scrollWidth,
        viewport: el.parentElement?.clientWidth ?? 0,
      }));
      expect(widths.track).toBeGreaterThanOrEqual(widths.viewport * 2.5);
    });
  });

  test("7 track width covers at least 2.5x viewport at 1920px", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto("/login", { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await waitForSafeMarquee(page);
      const widths = await page.locator(".performance-safe-marquee-track").evaluate((el) => ({
        track: el.scrollWidth,
        viewport: el.parentElement?.clientWidth ?? 0,
      }));
      expect(widths.track).toBeGreaterThanOrEqual(widths.viewport * 2.5);
    });
  });

  test("8 animation is running on visible tab", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto("/login", { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await waitForSafeMarquee(page);
      const state = await page.locator(".performance-safe-marquee-track").evaluate((el) => {
        const style = getComputedStyle(el);
        return {
          name: style.animationName,
          playState: style.animationPlayState,
        };
      });
      expect(state.name).toContain("performance-safe-marquee");
      expect(state.playState).toBe("running");
    });
  });

  test("9 hidden tab pauses animation via data-page-hidden", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto("/login", { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await waitForSafeMarquee(page);
      await page.evaluate(() => {
        document.documentElement.setAttribute("data-page-hidden", "true");
      });
      await page.waitForTimeout(50);
      const playState = await page
        .locator(".performance-safe-marquee-track")
        .evaluate((el) => getComputedStyle(el).animationPlayState);
      expect(playState).toBe("paused");
    });
  });

  test("10 reduced motion shows static strip (no animated track)", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/login", { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await expect(page.locator(".performance-safe-logo-marquee")).toBeVisible({
        timeout: ROUTE_SETTLE_MS,
      });
      await expect(page.locator(".performance-safe-marquee-track")).toHaveCount(0);
      await expect(page.locator(".performance-safe-marquee-segment")).toHaveCount(1);
    });
  });

  test("11 homepage uses full marketing marquee (not safe strip)", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await expect(page.locator(".company-logo-marquee")).toBeVisible({ timeout: ROUTE_SETTLE_MS });
      await expect(page.locator(".performance-safe-logo-marquee")).toHaveCount(0);
    });
  });

  test("12 DOM logo node count on login stays within 30", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto("/login", { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await waitForSafeMarquee(page);
      const count = await page.locator(".performance-safe-logo-marquee [role='img']").count();
      expect(count).toBeGreaterThanOrEqual(18);
      expect(count).toBeLessThanOrEqual(30);
    });
  });

  test("13 logo cards have balanced bounding boxes and readable content", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto("/login", { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await waitForSafeMarquee(page);
      const metrics = await page
        .locator(".performance-safe-marquee-segment")
        .first()
        .locator("[data-performance-safe-logo-card]")
        .evaluateAll((cards) =>
        cards.map((card) => {
          const svg = card.querySelector("svg.performance-safe-logo-mark");
          const cardBox = card.getBoundingClientRect();
          const svgBox = svg?.getBoundingClientRect() ?? { width: 0, height: 0 };
          const textLen = (svg?.textContent ?? "").trim().length;
          return {
            cardW: cardBox.width,
            cardH: cardBox.height,
            svgW: svgBox.width,
            svgH: svgBox.height,
            textLen,
            quality: card.getAttribute("data-quality-status"),
          };
        }),
      );
      expect(metrics.length).toBe(9);
      for (const m of metrics) {
        expect(m.textLen).toBeGreaterThan(0);
        expect(m.quality).toBe("verified-curated");
        expect(m.svgH).toBeGreaterThanOrEqual(10);
        expect(m.svgH).toBeLessThanOrEqual(18);
        expect(m.svgW).toBeGreaterThanOrEqual(36);
        expect(m.svgW / m.cardW).toBeLessThanOrEqual(0.92);
      }
    });
  });

  test("14 no simpleicons CDN requests on login safe marquee", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      const cdnHits: string[] = [];
      page.on("request", (req) => {
        const url = req.url();
        if (url.includes("simpleicons.org") || url.includes("simple-icons")) {
          cdnHits.push(url);
        }
      });
      await page.goto("/login", { waitUntil: "networkidle" });
      await dismissCookieBanner(page);
      await waitForSafeMarquee(page);
      expect(cdnHits).toEqual([]);
    });
  });

  test("15 demo route shows logo strip (marketing or safe)", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto("/demo", { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      const safe = page.locator(".performance-safe-logo-marquee");
      const marketing = page.locator(".company-logo-marquee");
      const safeVisible = await safe.isVisible().catch(() => false);
      const marketingVisible = await marketing.isVisible().catch(() => false);
      expect(safeVisible || marketingVisible).toBe(true);
    });
  });

  test("16 animation transform changes over time on visible tab", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto("/login", { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await waitForSafeMarquee(page);
      const readTransform = () =>
        page.locator(".performance-safe-marquee-track").evaluate((el) => getComputedStyle(el).transform);
      const t0 = await readTransform();
      await page.waitForTimeout(400);
      const t1 = await readTransform();
      expect(t0).not.toBe("none");
      expect(t1).not.toBe("none");
      expect(t0).not.toEqual(t1);
    });
  });
});
