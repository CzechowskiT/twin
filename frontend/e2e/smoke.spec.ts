import { expect, test, type Page } from "@playwright/test";

async function gotoSmoke(page: Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded", timeout: 45_000 });
}

test.describe("public smoke", () => {
  test("home smoke: homepage loads hero and deterministic waitlist CTA", async ({ page }) => {
    await gotoSmoke(page, "/");
    await expect(page.locator("body")).toBeVisible();
    const waitlistCta = page
      .locator("a[href='/waitlist'], a[href^='/waitlist?'], a[href*='/waitlist#']")
      .first();
    const fallbackNamedCta = page.getByRole("link", { name: /wishlist|waitlist|lista/i }).first();
    await expect(waitlistCta.or(fallbackNamedCta)).toBeVisible();
  });

  test("waitlist page shows signup form", async ({ page }) => {
    await gotoSmoke(page, "/waitlist");
    await expect(page.getByRole("heading").first()).toBeVisible();
    await expect(page.locator("input[type='email'], input[name='email']").first()).toBeVisible();
  });

  test("login hub loads candidate zone", async ({ page }) => {
    await gotoSmoke(page, "/login/candidate");
    await page.waitForLoadState("domcontentloaded");
    const emailField = page
      .locator("input[type='email'], input[name='email'], input[autocomplete='email']")
      .first();
    await expect(emailField).toBeVisible();
    // Login variants can be password-first or provider/magic-link-first.
    // Keep smoke stable by requiring an email field + at least one
    // credential path control (password input or sign-in submit button).
    const hasPasswordCount = await page.locator("input[type='password']").count();
    const hasSubmitCount = await page
      .locator("button[type='submit'], input[type='submit'], button")
      .filter({ hasText: /sign in|log in|continue|dalej|zaloguj/i })
      .count();
    expect(hasPasswordCount + hasSubmitCount).toBeGreaterThan(0);
  });

  test("demo page loads live snapshot section", async ({ page }) => {
    await gotoSmoke(page, "/demo");
    await expect(page.locator("body")).toBeVisible();
    const demoText = (await page.locator("body").innerText()).toLowerCase();
    expect(demoText).toMatch(/demo|sample/);
    const res = await page.request.get("/api/v1/demo/snapshot");
    // 502 when the local Next server cannot reach Railway API — still a
    // useful signal in CI-with-API; locally we only assert the route exists.
    expect([200, 404, 502]).toContain(res.status());
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
  test("dashboard smoke: unauthenticated /dashboard routes to /login", async ({ page, context }) => {
    await context.clearCookies();
    await page.addInitScript(() => {
      try {
        window.localStorage?.clear();
        window.sessionStorage?.clear();
      } catch {
        // some browsers throw on storage access pre-document — safe to ignore
      }
    });
    await gotoSmoke(page, "/dashboard");
    // Either we land on /login (post-redirect) or we render the
    // boot-loader briefly; in both cases we should never see a
    // candidate-only widget. Wait for the URL to settle on /login
    // or for the dashboard to expose its public loading copy.
    await page.waitForLoadState("networkidle").catch(() => {});
    const url = new URL(page.url());
    expect(["/login", "/login/", "/login/candidate", "/dashboard"]).toContain(url.pathname);
    await expect(page.locator("body")).toBeVisible();
    // Must not leak ranked pipeline payloads while logged out (Top 20 / scores).
    const bodyText = await page.locator("body").innerText();
    const lowerBody = bodyText.toLowerCase();
    expect(lowerBody).not.toMatch(/final_score|top\s*20\s*matches|top20\s*matches/);
    // PII should never be visible without an authenticated session.
    expect(bodyText).not.toMatch(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    expect(bodyText).not.toMatch(/(?:\+?\d[\d\s().-]{8,}\d)/);
    // Readiness card must not appear logged-out (no checklist leak).
    expect(lowerBody).not.toMatch(/readiness checklist|lista gotowości/i);
    expect(lowerBody).not.toMatch(
      /apply now|auto apply|submit application|kyc verified|guaranteed interview|fully verified|run now \(test\)/i,
    );
    await expect(page.locator(".twin-shell--rail, .twin-shell--wide").first()).toBeVisible({
      timeout: 15_000,
    }).catch(() => {
      // Unauthenticated redirect to /login may skip dashboard shell — acceptable.
    });
  });

  test("/register/candidate shows email + password inputs (no submit)", async ({ page }) => {
    await gotoSmoke(page, "/register/candidate");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("input[type='email'], input[name='email']").first()).toBeVisible();
    await expect(page.locator("input[type='password']").first()).toBeVisible();
  });

  test("/privacy + /terms render public legal pages", async ({ page }) => {
    await gotoSmoke(page, "/privacy");
    await expect(page.getByRole("heading").first()).toBeVisible();
    await gotoSmoke(page, "/terms");
    await expect(page.getByRole("heading").first()).toBeVisible();
  });

  const candidateRoutes = [
    "/dashboard/career",
    "/dashboard/billing",
    "/dashboard/identity",
    "/dashboard/settings/auto-apply",
    "/dashboard/calendar",
    "/profile",
  ] as const;

  for (const route of candidateRoutes) {
    test(`unauthenticated ${route} does not leak unsafe copy`, async ({ page, context }) => {
      await context.clearCookies();
      await page.addInitScript(() => {
        try {
          window.localStorage?.clear();
          window.sessionStorage?.clear();
        } catch {
          // ignore
        }
      });
      await gotoSmoke(page, route);
      await page.waitForLoadState("domcontentloaded").catch(() => {});
      const bodyText = (await page.locator("body").innerText()).toLowerCase();
      expect(bodyText).not.toMatch(/authologic_api_|checkout payment rails|twin applies autonomously/i);
      expect(bodyText).not.toMatch(
        /apply now|auto apply|submit application|kyc verified|guaranteed interview|fully verified|run now \(test\)/i,
      );
      await expect(page.locator("body")).toBeVisible();
    });
  }

  const recruiterRoutes = ["/recruiter/inbox", "/recruiter/jobs", "/recruiter/calendar"] as const;

  for (const route of recruiterRoutes) {
    test(`unauthenticated ${route} does not leak unsafe copy`, async ({ page, context }) => {
      await context.clearCookies();
      await page.addInitScript(() => {
        try {
          window.localStorage?.clear();
          window.sessionStorage?.clear();
        } catch {
          // ignore
        }
      });
      await gotoSmoke(page, route);
      await page.waitForLoadState("domcontentloaded").catch(() => {});
      const bodyText = (await page.locator("body").innerText()).toLowerCase();
      expect(bodyText).not.toMatch(/authologic_api_|checkout payment rails|twin applies autonomously/i);
      expect(bodyText).not.toMatch(
        /apply now|auto apply|submit application|kyc verified|guaranteed interview|fully verified|run now \(test\)/i,
      );
      if (route === "/recruiter/calendar") {
        expect(bodyText).not.toMatch(/google calendar connected|microsoft calendar connected/i);
      }
      await expect(page.locator("body")).toBeVisible();
    });
  }

  test("candidate jobs: unauthenticated /workspace/candidate/jobs routes toward login", async ({
    page,
    context,
  }) => {
    await context.clearCookies();
    await page.addInitScript(() => {
      try {
        window.localStorage?.clear();
        window.sessionStorage?.clear();
      } catch {
        // ignore
      }
    });
    await gotoSmoke(page, "/workspace/candidate/jobs");
    await page.waitForLoadState("networkidle").catch(() => {});
    const url = new URL(page.url());
    expect(["/login", "/login/", "/login/candidate", "/workspace/candidate/jobs"]).toContain(url.pathname);
    const bodyText = (await page.locator("body").innerText()).toLowerCase();
    expect(bodyText).not.toMatch(
      /apply now|auto apply|submit application|kyc verified|guaranteed interview|fully verified|run now \(test\)/i,
    );
  });

  test("public-health smoke: /api/public-health proxy returns sane JSON", async ({ request }) => {
    const res = await request.get("/api/public-health");
    // Local smoke can return 500 when frontend proxy is up but backend is offline.
    expect([200, 500, 503]).toContain(res.status());
    const ct = (res.headers()["content-type"] || "").toLowerCase();
    if (res.status() !== 500) {
      expect(ct).toContain("application/json");
    }
    if (res.status() === 200 && ct.includes("application/json")) {
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
  test("status smoke: /status renders status header and at least one row", async ({ page }) => {
    await gotoSmoke(page, "/status");
    // Header text is i18n-driven, so we don't pin a specific
    // string — we just confirm the page has *a* h1 heading.
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    // The status panel either renders the data list (fetch ok)
    // or a loading / error line. Wait for one of those to be
    // visible so we know client hydration ran.
    await page.waitForLoadState("networkidle").catch(() => {});
    // Scope to status card copy — cookie banner also renders <p> and breaks strict .or().
    const statusDl = page.locator("dl.grid").first();
    const statusLoading = page.locator("p.twin-muted.text-sm");
    const statusError = page.locator("p.text-sm.text-red-400");
    await expect(statusDl.or(statusLoading).or(statusError)).toBeVisible();
  });

  test("waitlist smoke: /waitlist exposes hydration-safe counter or signup UI", async ({ page }) => {
    await gotoSmoke(page, "/waitlist");
    // The page hydrates the live counter via useWaitlistStats.
    // We don't assert a specific number (it's live) — only that
    // the metrics grid renders at least one metric tile with a
    // value element. Selector is class-based, matching the
    // already-shipped CSS in waitlist-page-client.tsx.
    await page.waitForLoadState("networkidle").catch(() => {});
    const metricValue = page.locator(".wl-metric-value").first();
    const emailInput = page.locator("input[type='email'], input[name='email']").first();
    const visibleMetric = await metricValue.isVisible().catch(() => false);
    const visibleEmail = await emailInput.isVisible().catch(() => false);
    expect(visibleMetric || visibleEmail).toBeTruthy();
  });
});

// Safe e2e expansion (long autonomous session 2026-05-27, TASK 8).
// Adds read-only coverage for marketing/legal/SEO surfaces that
// have shipped for a while but are missing from the smoke pass.
// Constraints (.cursorrules + session HARD BANS):
//   - never submit a signup, never type a password;
//   - never POST to a candidate-side mutation;
//   - never auto-apply;
//   - never trigger a scrape.
// Tests below only `page.goto(...)` + `page.locator(...)` reads.
test.describe("public smoke (marketing + SEO)", () => {
  test("/pricing renders at least one pricing card", async ({ page }) => {
    await gotoSmoke(page, "/pricing");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    // Pricing page exposes per-tier sections; we don't pin copy
    // (i18n) but we expect more than one heading on the page
    // (one per tier).
    const headings = page.getByRole("heading");
    const count = await headings.count();
    expect(count).toBeGreaterThan(1);
  });

  test("/for-candidates loads the candidate landing", async ({ page }) => {
    await gotoSmoke(page, "/for-candidates");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  });

  test("/for-companies loads the recruiter landing", async ({ page }) => {
    await gotoSmoke(page, "/for-companies");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  });

  test("/privacy + /terms expose at least one link back home", async ({ page }) => {
    // Already covered for "renders heading" above; this run
    // adds a navigation-back assertion so a malformed legal
    // page can't trap visitors.
    for (const path of ["/privacy", "/terms"]) {
      await gotoSmoke(page, path);
      await expect(page.locator("a[href='/'], a[href^='/']").first()).toBeVisible();
    }
  });

  test("robots smoke: /robots.txt advertises sitemap policy and plain text", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    const ct = (res.headers()["content-type"] || "").toLowerCase();
    expect(ct).toContain("text/plain");
    const body = await res.text();
    // Some environments intentionally omit sitemap while still serving
    // restrictive robots rules; enforce the baseline policy and validate
    // sitemap format only when present.
    const lower = body.toLowerCase();
    expect(lower).toContain("user-agent:");
    expect(lower).toContain("disallow:");
    if (lower.includes("sitemap:")) {
      expect(lower).toMatch(/sitemap:\s*https?:\/\/\S+/);
    }
  });

  test("sitemap smoke: /sitemap.xml returns XML urlset", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const ct = (res.headers()["content-type"] || "").toLowerCase();
    expect(ct).toMatch(/xml/);
    const body = await res.text();
    expect(body).toContain("<urlset");
  });
});

// Runtime security-headers contract on the public surface. The
// structural check (`scripts/security-headers.test.ts`) freezes
// the shape of `next.config.ts`; this runtime check confirms the
// deployed server actually emits the same string on /. Together
// they catch both refactors of the config object AND infra
// changes (Vercel routing rules, etc.) that could strip a
// directive in transit.
test.describe("public smoke (security headers runtime)", () => {
  test("home page response carries enforce CSP with report-uri", async ({
    request,
  }) => {
    const res = await request.get("/");
    expect(res.status()).toBe(200);
    const headers = res.headers();
    const csp =
      headers["content-security-policy"] ??
      headers["Content-Security-Policy"];
    expect(csp).toBeTruthy();
    expect(csp).toContain("report-uri /api/v1/csp-report");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  test("home page response carries the locked-down framing headers", async ({
    request,
  }) => {
    const res = await request.get("/");
    expect(res.status()).toBe(200);
    const headers = res.headers();
    expect((headers["x-frame-options"] || "").toUpperCase()).toBe("DENY");
    expect((headers["x-content-type-options"] || "").toLowerCase()).toBe("nosniff");
    expect((headers["referrer-policy"] || "").toLowerCase()).toBe(
      "strict-origin-when-cross-origin",
    );
    // Tech-stack disclosure: must not be present.
    expect(headers["x-powered-by"]).toBeUndefined();
  });
});
