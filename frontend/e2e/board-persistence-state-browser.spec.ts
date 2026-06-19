/**
 * Board persistence state — browser smoke (workers=1).
 */
import { expect, test, type Page } from "@playwright/test";

import { BOARD_IMPLEMENTATION_TRACKER_ROUTE } from "../src/lib/board-implementation-tracker";
import {
  BOARD_PERSISTENCE_BLOCKED_MARKER,
  BOARD_PERSISTENCE_SHIPPED_MARKER,
} from "../src/lib/board-persistence-state";
import { withFreshContext } from "./helpers/browser-lifecycle";

const SETTLE_MS = 12_000;
const PATH = BOARD_IMPLEMENTATION_TRACKER_ROUTE;

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

test.describe("Board persistence state browser", () => {
  test.describe.configure({ timeout: 120_000, mode: "serial" });

  test("1 board route renders page or auth shell — not blank", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      const response = await page.goto(PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      const status = response?.status() ?? 0;
      if (status === 404) {
        test.skip(true, "Route not deployed yet");
        return;
      }
      expect(status).toBeLessThan(500);
      await page
        .locator(
          `[data-testid="${BOARD_PERSISTENCE_SHIPPED_MARKER}"], [data-testid="${BOARD_PERSISTENCE_BLOCKED_MARKER}"], :text("Sign in required"), :text("Zaloguj")`,
        )
        .first()
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      expect((await bodyText(page)).length).toBeGreaterThan(32);
    });
  });

  test("2 shipped and blocked markers when pilot loads", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      const response = await page.goto(PATH, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      if ((response?.status() ?? 0) === 404) {
        test.skip(true, "Route not deployed yet");
        return;
      }
      await page
        .locator(
          `[data-testid="${BOARD_PERSISTENCE_SHIPPED_MARKER}"], [data-testid="${BOARD_PERSISTENCE_BLOCKED_MARKER}"], :text("Sign in required"), :text("Zaloguj")`,
        )
        .first()
        .waitFor({ state: "visible", timeout: SETTLE_MS })
        .catch(() => undefined);
      const body = (await bodyText(page)).toLowerCase();
      if (!isAuthShell(body)) {
        await expect(page.getByTestId(BOARD_PERSISTENCE_SHIPPED_MARKER)).toBeVisible();
        await expect(page.getByTestId(BOARD_PERSISTENCE_BLOCKED_MARKER)).toBeVisible();
      }
    });
  });
});
