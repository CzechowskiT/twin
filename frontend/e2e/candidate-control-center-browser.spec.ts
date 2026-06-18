/**
 * Candidate Control Center — browser smoke (workers=1, 7 assertions).
 */
import { expect, test, type Page } from "@playwright/test";

import {
  CANDIDATE_CONTROL_CENTER_MARKERS,
  CANDIDATE_CONTROL_CENTER_PAGE_MARKER,
} from "../src/lib/candidate-control-center";

import { withFreshContext } from "./helpers/browser-lifecycle";

const SETTLE_MS = 12_000;
const DEMO_PATH = "/dashboard/trust/controls";
const PROFILE_ALIAS_PATH = "/profile/trust/controls";

async function dismissCookieBanner(page: Page): Promise<void> {
  const accept = page.getByRole("button", { name: /accept cookies/i });
  if (await accept.isVisible().catch(() => false)) {
    await accept.click();
  }
}

async function bodyText(page: Page): Promise<string> {
  return page.locator("body").innerText();
}

function isAuthShell(body: string): boolean {
  const lower = body.toLowerCase();
  return (
    lower.includes("sign in") ||
    lower.includes("zaloguj") ||
    lower.includes("auth required") ||
    lower.includes("redirecting to sign in") ||
    lower.includes("workspace only") ||
    lower.includes("tylko dla") ||
    lower.includes("wymagane logowanie")
  );
}

test.describe("Candidate Control Center browser", () => {
  test.describe.configure({ timeout: 120_000, mode: "serial" });

  test("1 dashboard/trust/controls shows control center or auth shell — not 404 blank", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      const response = await page.goto(DEMO_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      expect(response?.status() ?? 0).not.toBe(404);
      await page
        .locator(
          `[data-candidate-control-center-page="${CANDIDATE_CONTROL_CENTER_PAGE_MARKER}"], [data-testid="${CANDIDATE_CONTROL_CENTER_MARKERS.notFound}"], :text("Sign in")`,
        )
        .first()
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      expect(body.length).toBeGreaterThan(32);
      if (!isAuthShell(body)) {
        await expect(
          page.locator(`[data-candidate-control-center-page="${CANDIDATE_CONTROL_CENTER_PAGE_MARKER}"]`),
        ).toBeVisible();
      }
    });
  });

  test("2 boundary section visible when authenticated pilot content loads", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(DEMO_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await page
        .locator(`[data-candidate-control-center-page="${CANDIDATE_CONTROL_CENTER_PAGE_MARKER}"]`)
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      if (!isAuthShell(body)) {
        await expect(page.locator(`[data-testid="${CANDIDATE_CONTROL_CENTER_MARKERS.boundary}"]`)).toBeVisible();
      }
    });
  });

  test("3 visibility controls section marker present on pilot page", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(DEMO_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await page
        .locator(`[data-candidate-control-center-page="${CANDIDATE_CONTROL_CENTER_PAGE_MARKER}"]`)
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      if (!isAuthShell(body)) {
        await expect(
          page.locator(`[data-testid="${CANDIDATE_CONTROL_CENTER_MARKERS.visibilityControls}"]`),
        ).toBeVisible();
      }
    });
  });

  test("4 profile/trust/controls alias resolves same pilot or auth shell", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      const response = await page.goto(PROFILE_ALIAS_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      expect(response?.status() ?? 0).not.toBe(404);
      await page
        .locator(
          `[data-candidate-control-center-page="${CANDIDATE_CONTROL_CENTER_PAGE_MARKER}"], [data-testid="${CANDIDATE_CONTROL_CENTER_MARKERS.notFound}"], :text("Sign in"), :text("Zaloguj")`,
        )
        .first()
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      expect(body.length).toBeGreaterThan(32);
      if (!isAuthShell(body)) {
        await expect(
          page.locator(
            `[data-candidate-control-center-page="${CANDIDATE_CONTROL_CENTER_PAGE_MARKER}"], [data-testid="${CANDIDATE_CONTROL_CENTER_MARKERS.notFound}"]`,
          ).first(),
        ).toBeVisible();
      }
    });
  });

  test("5 page title is not a 404 shell", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(DEMO_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      const title = await page.title();
      expect(title.toLowerCase()).not.toContain("404");
    });
  });

  test("6 revoke/delete section shows disabled actions on pilot", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(DEMO_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await page
        .locator(`[data-candidate-control-center-page="${CANDIDATE_CONTROL_CENTER_PAGE_MARKER}"]`)
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      if (!isAuthShell(body)) {
        const controls = page.locator(`[data-testid="${CANDIDATE_CONTROL_CENTER_MARKERS.revokeDeletePlanned}"]`);
        await expect(controls).toBeVisible();
        await expect(controls.locator("button[disabled]")).toHaveCount(2);
      }
    });
  });

  test("7 audit timeline section visible on pilot page", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(DEMO_PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await page
        .locator(`[data-candidate-control-center-page="${CANDIDATE_CONTROL_CENTER_PAGE_MARKER}"]`)
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      if (!isAuthShell(body)) {
        await expect(
          page.locator(`[data-testid="${CANDIDATE_CONTROL_CENTER_MARKERS.auditTimeline}"]`),
        ).toBeVisible();
      }
    });
  });
});
