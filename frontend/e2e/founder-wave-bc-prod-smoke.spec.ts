/**
 * Founder Wave B/C — authenticated production browser smoke (non-destructive).
 *
 * Wave B: demo@twin.career (DEMO_USER_PASSWORD) — career, trust subs, referrals, timeline.
 * Wave C: recruiter token — activation, talent pool, trust review, cockpit, prefs, saved views, timeline.
 *
 * Hard rules: no auto-apply, no referral POST, no trust mutations on demo@twin.career.
 */
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import { CANDIDATE_TRUST_CENTER_MARKERS, CANDIDATE_TRUST_CENTER_PAGE_MARKER } from "../src/lib/candidate-trust-center";
import {
  RECRUITER_INBOX_STORAGE_COMPANY,
  RECRUITER_INBOX_STORAGE_TOKEN,
  RECRUITER_DEMO_COMPANY_SLUG,
} from "../src/lib/recruiter-inbox";
import { RECRUITER_JWT_COMPANY_KEY, RECRUITER_JWT_STORAGE_KEY } from "../src/lib/recruiter-jwt";
import { withFreshContext } from "./helpers/browser-lifecycle";
import { loadLocalTestEnv } from "./helpers/load-local-test-env";

loadLocalTestEnv();

const DEMO_EMAIL = "demo@twin.career";
const DEMO_PASSWORD = process.env.DEMO_USER_PASSWORD?.trim() ?? "";
const RECRUITER_TOKEN =
  process.env.RECRUITER_TOKEN?.trim() || process.env.TWIN_RECRUITER_TOKEN?.trim() || "";
const COMPANY_SLUG = process.env.RECRUITER_DEMO_COMPANY_SLUG?.trim() || RECRUITER_DEMO_COMPANY_SLUG;
const IS_PROD = (process.env.PLAYWRIGHT_BASE_URL ?? "").includes("vercel.app");
const SETTLE_MS = 15_000;

const WAVE_B_TRUST_SUBS = [
  "/dashboard/trust",
  "/dashboard/trust/overview",
  "/dashboard/trust/consent-receipt",
  "/dashboard/trust/audit-export",
  "/dashboard/trust/activity-timeline",
] as const;

const WAVE_C_ROUTES = [
  { id: "C1_activation", path: "/recruiter/inbox", marker: "inbox" },
  { id: "C2_talent_pool", path: "/recruiter/talent-pool", marker: "data-recruiter-talent-pool" },
  { id: "C2_trust_review", path: "/recruiter/trust-review-queue", marker: "data-recruiter-trust-review" },
  { id: "C3_notification_prefs", path: "/recruiter/notification-preferences", marker: "data-recruiter-notification-prefs" },
  { id: "C5_activity_timeline", path: "/recruiter/activity-timeline", marker: "data-recruiter-activity-timeline" },
] as const;

async function dismissCookieBanner(page: Page): Promise<void> {
  const accept = page.getByRole("button", { name: /accept cookies/i });
  if (await accept.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await accept.click().catch(() => undefined);
  }
  const reject = page.getByRole("button", { name: /reject optional/i });
  if (await reject.isVisible({ timeout: 500 }).catch(() => false)) {
    await reject.click().catch(() => undefined);
  }
}

async function seedRecruiterInboxSession(page: Page, context: BrowserContext): Promise<void> {
  await injectRecruiterSession(context);
  await page.goto(`/recruiter/inbox?company_slug=${encodeURIComponent(COMPANY_SLUG)}`, {
    waitUntil: "domcontentloaded",
  });
  await dismissCookieBanner(page);
  await page.waitForTimeout(2_000);
}

async function loginCandidateViaApi(context: BrowserContext): Promise<string> {
  if (!DEMO_PASSWORD) throw new Error("DEMO_USER_PASSWORD UNSET");
  const base = process.env.PLAYWRIGHT_BASE_URL ?? "https://twin-sooty.vercel.app";
  const res = await context.request.post(`${base}/api/v1/auth/login/json`, {
    data: { email: DEMO_EMAIL, password: DEMO_PASSWORD },
  });
  expect(res.ok(), `candidate login HTTP ${res.status()}`).toBeTruthy();
  const body = (await res.json()) as { access_token?: string };
  expect(body.access_token?.length).toBeGreaterThan(10);
  return body.access_token!;
}

async function injectCandidateToken(context: BrowserContext, token: string): Promise<void> {
  await context.addInitScript((t: string) => {
    try {
      window.localStorage?.setItem("twin_access_token", t);
    } catch {
      /* ignore */
    }
  }, token);
}

async function exchangeRecruiterJwt(context: BrowserContext): Promise<string> {
  if (!RECRUITER_TOKEN) throw new Error("RECRUITER_TOKEN UNSET");
  const base = process.env.PLAYWRIGHT_BASE_URL ?? "https://twin-sooty.vercel.app";
  const res = await context.request.post(`${base}/api/v1/auth/recruiter/session`, {
    data: { access_token: RECRUITER_TOKEN, company_slug: COMPANY_SLUG },
  });
  expect(res.ok(), `recruiter JWT exchange HTTP ${res.status()}`).toBeTruthy();
  const body = (await res.json()) as { access_token?: string };
  expect(body.access_token?.length).toBeGreaterThan(10);
  return body.access_token!;
}

async function injectRecruiterSession(context: BrowserContext): Promise<void> {
  const jwt = await exchangeRecruiterJwt(context);
  await context.addInitScript(
    ({ token, slug, jwtKey, companyKey }: { token: string; slug: string; jwtKey: string; companyKey: string }) => {
      try {
        window.sessionStorage?.setItem(jwtKey, token);
        window.sessionStorage?.setItem(companyKey, slug);
        window.sessionStorage?.setItem("twin_recruiter_inbox_token", "");
        window.sessionStorage?.setItem("twin_recruiter_company_slug", slug);
      } catch {
        /* ignore */
      }
    },
    {
      token: jwt,
      slug: COMPANY_SLUG,
      jwtKey: RECRUITER_JWT_STORAGE_KEY,
      companyKey: RECRUITER_JWT_COMPANY_KEY,
    },
  );
}

function isAuthShell(body: string): boolean {
  const lower = body.toLowerCase();
  return (
    lower.includes("sign in") ||
    lower.includes("zaloguj") ||
    lower.includes("auth required") ||
    lower.includes("redirecting to sign in") ||
    lower.includes("wymagane logowanie")
  );
}

test.describe("Founder Wave B/C prod smoke", () => {
  test.describe.configure({ timeout: 180_000 });

  test.beforeAll(() => {
    if (IS_PROD && process.env.PLAYWRIGHT_ALLOW_PROD_SMOKE !== "1") {
      throw new Error("Set PLAYWRIGHT_ALLOW_PROD_SMOKE=1 for production founder smoke");
    }
    if (!DEMO_PASSWORD) throw new Error("DEMO_USER_PASSWORD UNSET — run preflight:founder-smoke-env");
    if (!RECRUITER_TOKEN) throw new Error("RECRUITER_TOKEN UNSET — run preflight:founder-smoke-env");
  });

  test("RBAC-1 unauthenticated /dashboard/career routes toward login", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto("/dashboard/career", { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await page.waitForTimeout(2_000);
      const url = page.url();
      const body = await page.locator("body").innerText();
      expect(url.includes("/login") || isAuthShell(body)).toBeTruthy();
    });
  });

  test("RBAC-2 recruiter routes without token do not expose workspace", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await context.newPage();
      await page.goto("/recruiter/talent-pool", { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await page.waitForTimeout(3_000);
      const poolLoaded = await page
        .locator('[data-testid="recruiter-talent-pool-page"]')
        .isVisible()
        .catch(() => false);
      const url = page.url();
      expect(poolLoaded).toBeFalsy();
      expect(url.includes("/login") || url.includes("/recruiter")).toBeTruthy();
    });
  });

  test("B1 career compass loads authenticated (read-only)", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const token = await loginCandidateViaApi(context);
      await injectCandidateToken(context, token);
      const page = await context.newPage();
      const res = await page.goto("/dashboard/career", { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      expect(res?.status()).not.toBe(404);
      await expect(
        page.locator(
          "[data-career-compass-form], [data-career-compass-loading], [data-career-compass-empty]",
        ).first(),
      ).toBeVisible({ timeout: SETTLE_MS });
    });
  });

  for (const path of WAVE_B_TRUST_SUBS) {
    test(`B2 trust sub ${path} loads authenticated`, async ({ browser }) => {
      await withFreshContext(browser, async (context) => {
        const token = await loginCandidateViaApi(context);
        await injectCandidateToken(context, token);
        const page = await context.newPage();
        const res = await page.goto(path, { waitUntil: "domcontentloaded" });
        await dismissCookieBanner(page);
        expect(res?.status()).not.toBe(404);
        const body = await page.locator("body").innerText();
        expect(body.length).toBeGreaterThan(40);
        if (path === "/dashboard/trust") {
          await expect(
            page.locator(`[data-candidate-trust-center-page="${CANDIDATE_TRUST_CENTER_PAGE_MARKER}"]`).or(
              page.locator(`[data-testid="${CANDIDATE_TRUST_CENTER_MARKERS.boundary}"]`),
            ),
          ).toBeVisible({ timeout: SETTLE_MS });
        }
        if (path === "/dashboard/trust/activity-timeline") {
          await expect(page.locator("[data-candidate-activity-timeline]")).toBeVisible({ timeout: SETTLE_MS });
        }
      });
    });
  }

  test("B3 referrals loads authenticated with pilot boundary (read-only)", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const token = await loginCandidateViaApi(context);
      await injectCandidateToken(context, token);
      const page = await context.newPage();
      await page.goto("/dashboard/referrals", { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await expect(
        page
          .locator("[data-seven-day-referrals-pilot-boundary]")
          .or(page.getByRole("heading", { name: /limited pilot/i }))
          .or(page.getByRole("heading", { name: /refer friends|poleć/i }))
          .first(),
      ).toBeVisible({ timeout: SETTLE_MS });
    });
  });

  for (const route of WAVE_C_ROUTES) {
    test(`Wave C ${route.id} ${route.path} loads with recruiter token`, async ({ browser }) => {
      await withFreshContext(browser, async (context) => {
        const page = await context.newPage();
        await seedRecruiterInboxSession(page, context);
        const sep = route.path.includes("?") ? "&" : "?";
        const res = await page.goto(
          `${route.path}${sep}company_slug=${encodeURIComponent(COMPANY_SLUG)}`,
          { waitUntil: "domcontentloaded" },
        );
        await dismissCookieBanner(page);
        expect(res?.status()).not.toBe(404);
        const body = await page.locator("body").innerText();
        expect(body.length).toBeGreaterThan(40);
        if (route.id === "C1_activation") {
          await expect(
            page.getByRole("heading").filter({ hasText: /inbox|skrzynka|decision|decyzj/i }).first(),
          ).toBeVisible({ timeout: SETTLE_MS });
        }
        if (route.id === "C2_talent_pool") {
          await expect(page.locator('[data-testid="recruiter-talent-pool-page"]').first()).toBeVisible({
            timeout: SETTLE_MS,
          });
        }
        if (route.id === "C2_trust_review") {
          await expect(
            page.locator('[data-recruiter-trust-review-queue-page="recruiter-trust-review-queue-page"]').first(),
          ).toBeVisible({ timeout: SETTLE_MS });
        }
        if (route.id === "C3_notification_prefs") {
          await expect(page.locator('[data-testid="recruiter-notification-prefs-panel"]').first()).toBeVisible({
            timeout: SETTLE_MS,
          });
        }
        if (route.id === "C5_activity_timeline") {
          await expect(page.locator("[data-recruiter-activity-timeline]").first()).toBeVisible({
            timeout: SETTLE_MS,
          });
        }
      });
    });
  }

  test("C4 saved views API returns sane JSON with recruiter token", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const q = new URLSearchParams({ token: RECRUITER_TOKEN, company_slug: COMPANY_SLUG });
      const res = await context.request.get(`/api/recruiter/saved-views?${q.toString()}`);
      expect([200, 401, 404, 503]).toContain(res.status());
      if (res.status() === 200) {
        const body = await res.json();
        expect(body).toBeTruthy();
      }
    });
  });

  test("RBAC-3 candidate JWT does not unlock recruiter activation panel", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const token = await loginCandidateViaApi(context);
      await injectCandidateToken(context, token);
      const page = await context.newPage();
      await page.goto("/recruiter", { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);
      await page.waitForTimeout(2_000);
      const panelVisible = await page
        .locator("[data-recruiter-activation-panel]")
        .isVisible()
        .catch(() => false);
      expect(panelVisible).toBeFalsy();
    });
  });
});
