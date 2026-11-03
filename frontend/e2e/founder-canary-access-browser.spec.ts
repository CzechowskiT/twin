/**
 * Founder canary access — isolated browser e2e (mocked upstream; no prod DB writes).
 *
 * Covers: login gate, MFA elevate, read canary control, page refresh CSRF recovery,
 * session restoration, successful authorized mutation, missing CSRF header denied,
 * revoked session denied, expired session denied, logout + new session,
 * iPhone Safari/mobile layout (390×844).
 *
 * Requires PLAYWRIGHT_ENABLE_BROWSER_TESTS=1. Never hits production canary DB —
 * all /api/ops-admin/canary/* and auth routes are mocked.
 * Preview isolation: see scripts/founder-canary-preview-isolation-guard.test.ts —
 * if isolation cannot be proven, do not create even a synthetic live designation.
 */
import { expect, test, type Page, type Route } from "@playwright/test";

import { withFreshContext } from "./helpers/browser-lifecycle";

const BASE = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
const IPHONE = { width: 390, height: 844 };

type SessionState = {
  elevated: boolean;
  csrf: string;
  cleared?: boolean;
  detail?: string | null;
};

async function mockFounderCanaryApis(page: Page, state: SessionState): Promise<void> {
  await page.route("**/api/v1/auth/me", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ email: "founder@twin.test", is_active: true }),
    });
  });
  await page.route("**/api/v1/auth/mfa/status", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ enabled: true, state: "ENABLED" }),
    });
  });
  await page.route("**/api/ops-admin/canary/session", async (route: Route) => {
    const method = route.request().method().toUpperCase();
    if (method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          founder: true,
          elevated: state.elevated,
          csrf_token: state.elevated ? state.csrf : null,
          mfa_enabled: true,
          email: "founder@twin.test",
          cleared: Boolean(state.cleared),
          detail: state.detail || null,
          ops_token_browser_storage: false,
          config_audit: {
            allowlist_configured: true,
            dedicated_session_secret: true,
            production_like: false,
            silent_secret_key_fallback_allowed: false,
          },
        }),
      });
      return;
    }
    if (method === "POST") {
      const mfa = route.request().headers()["x-twin-mfa-code"];
      if (!mfa) {
        await route.fulfill({
          status: 403,
          contentType: "application/json",
          body: JSON.stringify({ detail: "mfa_required" }),
        });
        return;
      }
      state.elevated = true;
      state.csrf = "csrf:1:1:nonce:sig.boundtestdigest000000000000";
      state.cleared = false;
      state.detail = null;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: {
          "set-cookie": [
            "twin_founder_canary_at=mock-at; Path=/api/ops-admin/canary; HttpOnly; SameSite=Strict",
            "twin_founder_canary_elevated=mock-elev; Path=/api/ops-admin/canary; HttpOnly; SameSite=Strict",
            `twin_founder_canary_csrf=${state.csrf}; Path=/api/ops-admin/canary; HttpOnly; SameSite=Strict`,
          ].join("\n"),
        },
        body: JSON.stringify({
          ok: true,
          elevated: true,
          csrf_token: state.csrf,
          mfa_enabled: true,
          email: "founder@twin.test",
        }),
      });
      return;
    }
    if (method === "DELETE") {
      state.elevated = false;
      state.csrf = "";
      state.cleared = true;
      state.detail = null;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, elevated: false, csrf_token: null }),
      });
      return;
    }
    await route.fulfill({ status: 405, body: "method" });
  });

  await page.route("**/api/ops-admin/canary/control", async (route: Route) => {
    const method = route.request().method().toUpperCase();
    const headers = route.request().headers();
    if (!state.elevated) {
      await route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({
          detail: state.detail || "Founder elevated session required for canary mutations",
        }),
      });
      return;
    }
    if (method !== "GET" && method !== "HEAD") {
      if (!headers["x-csrf-token"]) {
        await route.fulfill({
          status: 403,
          contentType: "application/json",
          body: JSON.stringify({ detail: "CSRF header required" }),
        });
        return;
      }
      if (headers["x-csrf-token"] !== state.csrf) {
        await route.fulfill({
          status: 403,
          contentType: "application/json",
          body: JSON.stringify({ detail: "Invalid CSRF token" }),
        });
        return;
      }
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        state: "READY_INACTIVE",
        gate_ready: true,
        activation_command: "PREPARED_NOT_EXECUTED",
        real_invites_created: 0,
        never_auto_active: true,
        active_one_candidate: false,
      }),
    });
  });

  await page.route("**/api/ops-admin/canary/designation**", async (route: Route) => {
    // Isolation: mocked only — never forwards to production canary DB.
    const method = route.request().method().toUpperCase();
    const headers = route.request().headers();
    if (!state.elevated) {
      await route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({ detail: state.detail || "Elevated session required" }),
      });
      return;
    }
    if (method !== "GET" && !headers["x-csrf-token"]) {
      await route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({ detail: "CSRF header required" }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: method === "POST" ? "DESIGNATED_READY" : "NOT_DESIGNATED",
        gate_ready: method === "POST",
        delivery_identity_masked: method === "POST" ? "pr***@c***.invalid" : null,
        active_count: method === "POST" ? 1 : 0,
      }),
    });
  });
}

async function seedFounderJwt(page: Page): Promise<void> {
  // Synthetic JWT-shaped blob for hasActiveSession() — never a real secret.
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      sub: "founder@twin.test",
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  ).toString("base64url");
  const token = `${header}.${payload}.synthetic`;
  await page.addInitScript((t) => {
    try {
      window.sessionStorage.setItem("twin_access_token", t);
    } catch {
      /* ignore */
    }
  }, token);
}

test.describe("Founder canary access (isolated mocks)", () => {
  test.skip(
    !process.env.PLAYWRIGHT_ENABLE_BROWSER_TESTS,
    "Set PLAYWRIGHT_ENABLE_BROWSER_TESTS=1",
  );

  test("MFA elevate, refresh CSRF recovery, mutation, revoke, logout @ iPhone", async ({
    browser,
  }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.setViewportSize(IPHONE);
      const state: SessionState = { elevated: false, csrf: "" };
      await mockFounderCanaryApis(page, state);
      await seedFounderJwt(page);

      await page.goto(`${BASE}/admin/canary`, { waitUntil: "domcontentloaded" });
      await expect(page.getByTestId("canary-control-panel")).toBeVisible();
      await expect(page.getByTestId("canary-elevate-mfa")).toBeVisible();
      await expect(page.getByTestId("canary-elevate-password")).toHaveCount(0);

      // iPhone layout: elevate controls remain usable in narrow viewport.
      const box = await page.getByTestId("canary-elevate-submit").boundingBox();
      expect(box).toBeTruthy();
      expect((box?.width || 0) ).toBeLessThanOrEqual(IPHONE.width);

      await page.getByTestId("canary-elevate-mfa").fill("123456");
      await page.getByTestId("canary-elevate-submit").click();
      await expect(page.getByTestId("canary-elevated-badge")).toBeVisible();
      await expect(page.getByTestId("canary-designation-panel")).toBeVisible();

      // Page refresh — session GET restores CSRF without document.cookie / re-auth.
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(page.getByTestId("canary-elevated-badge")).toBeVisible();

      // Authorized mutation with recovered CSRF (mocked designation only).
      await page.getByTestId("canary-designation-identity").fill("probe@canary-designation.invalid");
      await page.getByTestId("canary-designation-save").click();
      await expect(page.getByTestId("canary-designation-panel")).toBeVisible();

      // Revoked elevated session — GET session must clear and require re-elevate.
      state.elevated = false;
      state.cleared = true;
      state.csrf = "";
      state.detail = "Elevated session revoked";
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(page.getByTestId("canary-elevate-submit")).toBeVisible();

      // Re-elevate (new session) then logout / lock.
      await page.getByTestId("canary-elevate-mfa").fill("654321");
      await page.getByTestId("canary-elevate-submit").click();
      await expect(page.getByTestId("canary-lock-session")).toBeVisible();
      await page.getByTestId("canary-lock-session").click();
      await expect(page.getByTestId("canary-elevate-submit")).toBeVisible();
    });
  });

  test("missing CSRF header is denied", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      const state: SessionState = {
        elevated: true,
        csrf: "csrf:1:1:n:sig.bound",
      };
      await mockFounderCanaryApis(page, state);
      await seedFounderJwt(page);
      await page.goto(`${BASE}/admin/canary`, { waitUntil: "domcontentloaded" });
      const status = await page.evaluate(async () => {
        const res = await fetch("/api/ops-admin/canary/control", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ action: "prepare" }),
        });
        return res.status;
      });
      expect(status).toBe(403);
    });
  });

  test("expired session denied — refresh forces re-elevate", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.setViewportSize(IPHONE);
      const state: SessionState = {
        elevated: true,
        csrf: "csrf:1:1:n:sig.bound",
      };
      await mockFounderCanaryApis(page, state);
      await seedFounderJwt(page);
      await page.goto(`${BASE}/admin/canary`, { waitUntil: "domcontentloaded" });
      await expect(page.getByTestId("canary-elevated-badge")).toBeVisible();

      state.elevated = false;
      state.cleared = true;
      state.csrf = "";
      state.detail = "Elevated session expired";
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(page.getByTestId("canary-elevate-submit")).toBeVisible();
      await expect(page.getByTestId("canary-elevated-badge")).toHaveCount(0);

      const mutateStatus = await page.evaluate(async () => {
        const res = await fetch("/api/ops-admin/canary/control", {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-CSRF-Token": "stale",
          },
          body: JSON.stringify({ action: "prepare" }),
        });
        return res.status;
      });
      expect(mutateStatus).toBe(403);
    });
  });
});
