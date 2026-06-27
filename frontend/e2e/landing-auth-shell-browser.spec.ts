/**
 * Landing auth-shell — fresh context must see login, not logout chrome (PL locale).
 */
import { expect, test } from "@playwright/test";

import { withFreshContext } from "./helpers/browser-lifecycle";

async function dismissCookieBanner(page: import("@playwright/test").Page): Promise<void> {
  const accept = page.getByRole("button", { name: /accept cookies|akceptuj/i });
  if (await accept.isVisible().catch(() => false)) await accept.click();
}

test.describe("landing auth-shell browser", () => {
  test.describe.configure({ mode: "serial", timeout: 60_000 });

  test("unauthenticated homepage shows login link and hides logout", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);

      const loginLink = page.getByRole("link", { name: /zaloguj|log in/i }).first();
      await expect(loginLink).toBeVisible();
      await expect(loginLink).toHaveAttribute("href", /\/login/);

      const logoutButton = page.getByRole("button", { name: /wyloguj|log out/i });
      await expect(logoutButton).toHaveCount(0);
    });
  });

  test("stale JWT in storage still shows login on homepage", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      await context.addInitScript(() => {
        const payload = btoa(JSON.stringify({ exp: 1 }))
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/, "");
        window.localStorage.setItem("twin_access_token", `aaa.${payload}.bbb`);
      });
      const page = await context.newPage();
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);

      await expect(page.getByRole("link", { name: /zaloguj|log in/i }).first()).toBeVisible();
      await expect(page.getByRole("button", { name: /wyloguj|log out/i })).toHaveCount(0);
    });
  });
});
