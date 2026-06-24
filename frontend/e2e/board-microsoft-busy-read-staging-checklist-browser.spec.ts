/**
 * Board Microsoft busy-read staging checklist — browser smoke (workers=1).
 */
import { expect, test, type Page } from "@playwright/test";

import {
  BOARD_MICROSOFT_BUSY_READ_STAGING_CHECKLIST_MARKERS,
  BOARD_MICROSOFT_BUSY_READ_STAGING_CHECKLIST_PAGE_MARKER,
  BOARD_MICROSOFT_BUSY_READ_STAGING_CHECKLIST_ROUTE,
} from "../src/lib/board-microsoft-busy-read-staging-checklist";
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

test.describe("Board Microsoft busy-read staging checklist browser", () => {
  test.describe.configure({ timeout: 120_000 });

  test("checklist sections render or auth shell loads", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      const response = await page.goto(BOARD_MICROSOFT_BUSY_READ_STAGING_CHECKLIST_ROUTE, {
        waitUntil: "domcontentloaded",
      });
      await dismissCookieBanner(page);
      expect(response?.status() ?? 0).not.toBe(404);
      await page
        .locator(
          `[data-board-microsoft-busy-read-staging-checklist-page="${BOARD_MICROSOFT_BUSY_READ_STAGING_CHECKLIST_PAGE_MARKER}"], :text("Sign in"), :text("Zaloguj")`,
        )
        .first()
        .waitFor({ timeout: SETTLE_MS });
      const body = await bodyText(page);
      if (isAuthShell(body)) {
        expect(body.toLowerCase()).toMatch(/sign in|zaloguj|auth|logowanie/);
        return;
      }
      await expect(page.getByTestId(BOARD_MICROSOFT_BUSY_READ_STAGING_CHECKLIST_MARKERS.prodGates)).toBeVisible();
      await expect(page.getByTestId(BOARD_MICROSOFT_BUSY_READ_STAGING_CHECKLIST_MARKERS.smokeCommands)).toBeVisible();
      await expect(page.getByTestId(BOARD_MICROSOFT_BUSY_READ_STAGING_CHECKLIST_MARKERS.hardBans)).toBeVisible();
    });
  });
});
