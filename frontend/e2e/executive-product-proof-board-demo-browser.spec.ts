/**
 * Executive Product Proof / Board Demo — browser smoke (workers=1).
 */
import { expect, test, type Page } from "@playwright/test";

import {
  EXECUTIVE_PRODUCT_PROOF_MARKERS,
  EXECUTIVE_PRODUCT_PROOF_PAGE_MARKER,
  EXECUTIVE_PRODUCT_PROOF_PUBLIC_ROUTE,
  EXECUTIVE_PRODUCT_PROOF_WORKSPACE_ROUTE,
} from "../src/lib/executive-product-proof";
import { withFreshContext } from "./helpers/browser-lifecycle";

const SETTLE_MS = 12_000;

async function dismissCookieBanner(page: Page): Promise<void> {
  const accept = page.getByRole("button", { name: /accept cookies/i });
  if (await accept.isVisible().catch(() => false)) {
    await accept.click();
  }
}

test.describe("Executive Product Proof Board Demo browser", () => {
  test.describe.configure({ timeout: 120_000 });

  test("public product-proof route renders board or auth shell — not 404", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      const response = await page.goto(EXECUTIVE_PRODUCT_PROOF_PUBLIC_ROUTE, {
        waitUntil: "domcontentloaded",
      });
      await dismissCookieBanner(page);
      expect(response?.status() ?? 0).not.toBe(404);
      await page
        .locator(
          `[data-executive-product-proof-page="${EXECUTIVE_PRODUCT_PROOF_PAGE_MARKER}"], :text("Sign in"), :text("Zaloguj")`,
        )
        .first()
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = await page.locator("body").innerText();
      expect(body.length).toBeGreaterThan(32);
      await expect(
        page.locator(`[data-testid="${EXECUTIVE_PRODUCT_PROOF_MARKERS.launchStatus}"]`),
      ).toBeVisible();
    });
  });

  test("workspace alias resolves board or gate — not 404", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      const response = await page.goto(EXECUTIVE_PRODUCT_PROOF_WORKSPACE_ROUTE, {
        waitUntil: "domcontentloaded",
      });
      await dismissCookieBanner(page);
      expect(response?.status() ?? 0).not.toBe(404);
      await page
        .locator(
          `[data-executive-product-proof-page="${EXECUTIVE_PRODUCT_PROOF_PAGE_MARKER}"], :text("Sign in"), :text("Zaloguj"), :text("workspace")`,
        )
        .first()
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = await page.locator("body").innerText();
      expect(body.length).toBeGreaterThan(32);
    });
  });

  test("demo links section includes decision memory href", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(EXECUTIVE_PRODUCT_PROOF_PUBLIC_ROUTE, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      const href = await page
        .locator('[data-testid="executive-product-proof-link-decision_memory"]')
        .getAttribute("href");
      expect(href).toContain("/decision-memory");
    });
  });
});
