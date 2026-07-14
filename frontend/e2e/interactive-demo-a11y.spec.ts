/**
 * Interactive demo a11y — axe-core on homepage story + /demo sales experience.
 *
 * Local:
 *   PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 PLAYWRIGHT_ENABLE_WEBSERVER=1 npm run test:interactive-demo-a11y
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { withFreshContext } from "./helpers/browser-lifecycle";

async function dismissCookieBanner(page: import("@playwright/test").Page): Promise<void> {
  const accept = page.getByRole("button", { name: /accept cookies|akceptuj/i });
  if (await accept.isVisible().catch(() => false)) {
    await accept.click({ force: true }).catch(() => undefined);
  }
}

test.describe("Interactive demo a11y", () => {
  test.describe.configure({ timeout: 120_000 });

  test("homepage candidate story has no serious axe violations", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      const section = page.locator('[data-testid="homepage-candidate-story-section"]');
      await section.scrollIntoViewIfNeeded();
      await expect(page.locator('[data-testid="homepage-candidate-story"]')).toBeVisible({ timeout: 15_000 });

      const results = await new AxeBuilder({ page })
        .include('[data-testid="homepage-candidate-story-section"]')
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(serious, serious.map((v) => `${v.id}: ${v.help}`).join("; ")).toEqual([]);
    });
  });

  test("/demo sales experience has no serious axe violations", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto("/demo", { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await expect(page.locator("[data-sales-demo]").first()).toBeVisible({ timeout: 15_000 });

      const results = await new AxeBuilder({ page })
        .include("[data-sales-demo]")
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(serious, serious.map((v) => `${v.id}: ${v.help}`).join("; ")).toEqual([]);
    });
  });
});
