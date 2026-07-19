/**
 * Production Founder Command Center — session auth, readable UI, Start without token paste.
 *
 * Requires:
 * - PLAYWRIGHT_ALLOW_PROD_SMOKE=1
 * - DEMO_USER_PASSWORD (or FOUNDER_E2E_EMAIL + FOUNDER_E2E_PASSWORD)
 * - Vercel FOUNDER_COMMAND_ALLOWLIST includes the login email
 * - Vercel FOUNDER_COMMAND_TOKEN (or OPS_ADMIN_TOKEN) + Railway FCC enabled
 */
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { withFreshContext } from "./helpers/browser-lifecycle";
import { loadLocalTestEnv } from "./helpers/load-local-test-env";

loadLocalTestEnv();

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "https://twin-sooty.vercel.app";
const EMAIL =
  process.env.FOUNDER_E2E_EMAIL?.trim() ||
  process.env.TWIN_FOUNDER_E2E_EMAIL?.trim() ||
  "demo@twin.career";
const PASSWORD =
  process.env.FOUNDER_E2E_PASSWORD?.trim() ||
  process.env.TWIN_FOUNDER_E2E_PASSWORD?.trim() ||
  process.env.DEMO_USER_PASSWORD?.trim() ||
  "";

const EVIDENCE_DIR = join(process.cwd(), "test-results", "fcc-prod-e2e");

async function dismissCookieBanner(page: Page): Promise<void> {
  const accept = page.getByRole("button", { name: /accept cookies|akceptuj/i });
  if (await accept.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await accept.click().catch(() => undefined);
  }
}

async function loginViaApi(context: BrowserContext): Promise<string> {
  if (!PASSWORD) throw new Error("FOUNDER_E2E_PASSWORD or DEMO_USER_PASSWORD UNSET");
  const res = await context.request.post(`${BASE}/api/v1/auth/login/json`, {
    data: { email: EMAIL, password: PASSWORD },
  });
  expect(res.ok(), `login HTTP ${res.status()}`).toBeTruthy();
  const body = (await res.json()) as { access_token?: string };
  expect(body.access_token?.length).toBeGreaterThan(10);
  return body.access_token!;
}

async function injectToken(context: BrowserContext, token: string): Promise<void> {
  await context.addInitScript((t: string) => {
    try {
      localStorage.setItem("twin_access_token", t);
      sessionStorage.setItem("twin_access_token", t);
    } catch {
      /* ignore */
    }
  }, token);
}

test.describe("FCC production session UX", () => {
  test.beforeAll(() => {
    mkdirSync(EVIDENCE_DIR, { recursive: true });
  });

  test("unauthenticated redirects to login (no token form)", async ({ browser }) => {
    test.skip(process.env.PLAYWRIGHT_ALLOW_PROD_SMOKE !== "1", "Set PLAYWRIGHT_ALLOW_PROD_SMOKE=1");
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto(`${BASE}/admin/founder-command`, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await page.waitForURL(/\/login/, { timeout: 20_000 });
      await expect(page.getByText(/FOUNDER_COMMAND_TOKEN/i)).toHaveCount(0);
      await page.screenshot({ path: join(EVIDENCE_DIR, "fcc-unauth-redirect.png"), fullPage: true });
    });
  });

  test("login → FCC readable → Start → command id", async ({ browser }) => {
    test.skip(process.env.PLAYWRIGHT_ALLOW_PROD_SMOKE !== "1", "Set PLAYWRIGHT_ALLOW_PROD_SMOKE=1");
    test.skip(!PASSWORD, "FOUNDER_E2E_PASSWORD or DEMO_USER_PASSWORD required");

    await withFreshContext(browser, async (context) => {
      const token = await loginViaApi(context);
      await injectToken(context, token);
      const page = await context.newPage();

      await page.goto(`${BASE}/admin/founder-command`, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);

      await expect(page.locator("[data-fcc-ready='1']")).toBeVisible({ timeout: 45_000 });
      await expect(page.locator("[data-fcc-session='ready']")).toBeVisible();
      await expect(page.getByText(/FOUNDER_COMMAND_TOKEN/i)).toHaveCount(0);
      await expect(page.locator("[data-fcc-start]")).toBeEnabled({ timeout: 10_000 });

      await page.screenshot({ path: join(EVIDENCE_DIR, "fcc-ready-readable.png"), fullPage: true });

      const direction = page.locator("[data-fcc-direction]");
      await direction.fill(
        "Diagnostyczny batch tylko do odczytu — zachowaj Gate F PASS i Launch GO. Bez mutacji produkcji.",
      );

      await page.locator("[data-fcc-start]").click();
      await expect(page.locator("[data-fcc-command-id]")).toBeVisible({ timeout: 60_000 });
      const commandId = (await page.locator("[data-fcc-command-id]").innerText()).trim();
      expect(commandId.length).toBeGreaterThan(8);
      await expect(page.locator("[data-fcc-status]")).toBeVisible();

      await page.waitForTimeout(3_000);
      await page.screenshot({ path: join(EVIDENCE_DIR, "fcc-started-command.png"), fullPage: true });

      const cursor = page.locator("[data-fcc-cursor-url]");
      const dispatch = page.locator("[data-fcc-dispatch-run]");
      const hasCursor = await cursor.isVisible().catch(() => false);
      const hasDispatch = await dispatch.isVisible().catch(() => false);
      expect(commandId).toBeTruthy();
      if (hasCursor) {
        const href = await cursor.getAttribute("href");
        expect(href ?? "").toMatch(/^https?:\/\//);
      }
      if (hasDispatch) {
        await expect(dispatch).not.toBeEmpty();
      }
    });
  });
});
