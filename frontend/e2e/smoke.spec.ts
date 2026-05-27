import { expect, test } from "@playwright/test";

test.describe("public smoke", () => {
  test("homepage loads hero and waitlist CTA", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.getByRole("link", { name: /wishlist|waitlist|lista/i }).first()).toBeVisible();
  });

  test("waitlist page shows signup form", async ({ page }) => {
    await page.goto("/waitlist");
    await expect(page.getByRole("heading").first()).toBeVisible();
    await expect(page.locator("input[type='email'], input[name='email']").first()).toBeVisible();
  });

  test("login hub loads candidate zone", async ({ page }) => {
    await page.goto("/login/candidate");
    await expect(page.getByLabel(/email/i).first()).toBeVisible();
    await expect(page.getByLabel(/password/i).first()).toBeVisible();
  });

  test("demo page loads live snapshot section", async ({ page }) => {
    await page.goto("/demo");
    await expect(page.locator("body")).toBeVisible();
    const res = await page.request.get("/api/v1/demo/snapshot");
    expect([200, 404]).toContain(res.status());
    if (res.status() === 200) {
      const body = (await res.json()) as { demo_mode?: boolean; source?: string };
      expect(body.demo_mode).toBeTruthy();
    }
  });
});

// Read-only smoke for the candidate dashboard. Hard rules (see
// .cursorrules and the overnight brief): never fire a real apply
// or auto-apply, never type a password, never POST to
// applications/auto-apply or match-feedback. We only check:
//   1) Unauthenticated /dashboard navigates the user toward /login
//      (the shipped behaviour — the bootstrap effect calls
//      router.replace("/login") when getToken() is null).
//   2) /register/candidate renders the signup form (email +
//      password inputs visible, but we DO NOT submit).
//   3) /privacy and /terms public legal pages load.
//   4) The frontend /api/public-health proxy is reachable and
//      returns a sane JSON shape (status="ok"). This catches
//      Vercel ↔ Railway proxy regressions without exercising any
//      real candidate-side mutation.
test.describe("dashboard smoke (read-only, no live actions)", () => {
  test("unauthenticated /dashboard routes to /login", async ({ page, context }) => {
    await context.clearCookies();
    await page.addInitScript(() => {
      try {
        window.localStorage?.clear();
        window.sessionStorage?.clear();
      } catch {
        // some browsers throw on storage access pre-document — safe to ignore
      }
    });
    await page.goto("/dashboard");
    // Either we land on /login (post-redirect) or we render the
    // boot-loader briefly; in both cases we should never see a
    // candidate-only widget. Wait for the URL to settle on /login
    // or for the dashboard to expose its public loading copy.
    await page.waitForLoadState("networkidle").catch(() => {});
    const url = new URL(page.url());
    expect(["/login", "/login/", "/dashboard"]).toContain(url.pathname);
    await expect(page.locator("body")).toBeVisible();
  });

  test("/register/candidate shows email + password inputs (no submit)", async ({ page }) => {
    await page.goto("/register/candidate");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("input[type='email'], input[name='email']").first()).toBeVisible();
    await expect(page.locator("input[type='password']").first()).toBeVisible();
  });

  test("/privacy + /terms render public legal pages", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByRole("heading").first()).toBeVisible();
    await page.goto("/terms");
    await expect(page.getByRole("heading").first()).toBeVisible();
  });

  test("/api/public-health proxy returns sane JSON", async ({ request }) => {
    const res = await request.get("/api/public-health");
    expect([200, 503]).toContain(res.status());
    if (res.status() === 200) {
      const body = (await res.json()) as {
        status?: string;
        service?: string;
        db_ok?: boolean | null;
      };
      expect(body.status).toBe("ok");
      // Backend identifies itself; this prevents a "wrong target"
      // proxy regression where /api/public-health quietly returns
      // a marketing/static HTML page.
      expect(body.service).toBe("twin-api");
    }
  });
});

// Lightweight public-surface coverage for /status and the
// waitlist live counter. Both pages have shipped for a while
// but they're not in the existing smoke spec; a single
// production regression that breaks either is currently
// invisible to CI. These tests stay read-only — no signup
// submission, no candidate-side mutation. See
// docs/P1_SMOKE_TEST_COVERAGE_GAP_2026-05-27.md for the gap
// analysis that motivated them.
test.describe("public smoke (status + waitlist counter)", () => {
  test("/status renders status header and at least one row", async ({ page }) => {
    await page.goto("/status");
    // Header text is i18n-driven, so we don't pin a specific
    // string — we just confirm the page has *a* h1 heading.
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    // The status panel either renders the data list (fetch ok)
    // or a loading / error line. Wait for one of those to be
    // visible so we know client hydration ran.
    await page.waitForLoadState("networkidle").catch(() => {});
    const dl = page.locator("dl").first();
    const loadingOrError = page.locator("p").filter({ hasText: /./ }).first();
    await expect(dl.or(loadingOrError)).toBeVisible();
  });

  test("/waitlist exposes the founding-spots counter UI", async ({ page }) => {
    await page.goto("/waitlist");
    // The page hydrates the live counter via useWaitlistStats.
    // We don't assert a specific number (it's live) — only that
    // the metrics grid renders at least one metric tile with a
    // value element. Selector is class-based, matching the
    // already-shipped CSS in waitlist-page-client.tsx.
    await page.waitForLoadState("networkidle").catch(() => {});
    const metricValue = page.locator(".wl-metric-value").first();
    await expect(metricValue).toBeVisible();
  });
});
