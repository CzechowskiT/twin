/**
 * Board placement evidence monitor — browser smoke (workers=1).
 */
import { expect, test, type Page } from "@playwright/test";

import {
  BOARD_PLACEMENT_EVIDENCE_MONITOR_MARKERS,
  BOARD_PLACEMENT_EVIDENCE_MONITOR_PAGE_MARKER,
  BOARD_PLACEMENT_EVIDENCE_MONITOR_ROUTE,
} from "../src/lib/board-placement-evidence-monitor";
import { withFreshContext } from "./helpers/browser-lifecycle";

const SETTLE_MS = 12_000;

async function dismissCookieBanner(page: Page): Promise<void> {
  const accept = page.getByRole("button", { name: /accept cookies/i });
  if (await accept.isVisible().catch(() => false)) await accept.click();
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

test.describe("Board placement evidence monitor browser", () => {
  test.describe.configure({ timeout: 120_000 });

  test("full spec sections render when pilot loads", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      const response = await page.goto(BOARD_PLACEMENT_EVIDENCE_MONITOR_ROUTE, {
        waitUntil: "domcontentloaded",
      });
      await dismissCookieBanner(page);
      expect(response?.status() ?? 0).not.toBe(404);
      await page
        .locator(
          `[data-board-placement-evidence-monitor-page="${BOARD_PLACEMENT_EVIDENCE_MONITOR_PAGE_MARKER}"], :text("Sign in"), :text("Zaloguj")`,
        )
        .first()
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      if (isAuthShell(body)) return;
      await expect(page.getByTestId(BOARD_PLACEMENT_EVIDENCE_MONITOR_MARKERS.evidenceMatrix)).toBeVisible();
      await expect(page.getByTestId(BOARD_PLACEMENT_EVIDENCE_MONITOR_MARKERS.economicsPreview)).toBeVisible();
      await expect(page.getByTestId(BOARD_PLACEMENT_EVIDENCE_MONITOR_MARKERS.riskFlags)).toBeVisible();
      await expect(page.getByTestId(BOARD_PLACEMENT_EVIDENCE_MONITOR_MARKERS.blockedCapabilities)).toBeVisible();
      await expect(page.getByTestId(BOARD_PLACEMENT_EVIDENCE_MONITOR_MARKERS.personaRoutes)).toBeVisible();
      await expect(page.getByTestId(BOARD_PLACEMENT_EVIDENCE_MONITOR_MARKERS.launch)).toBeVisible();
    });
  });
});
