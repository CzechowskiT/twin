/**
 * Phase 3B controlled multitab verification — ONE context per batch (≤8 tabs),
 * staggered open, idle 60–90s, CDP heap/DOM per route.
 */
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { withFreshContext } from "./helpers/browser-lifecycle";
import {
  PHASE3B_DOM_FAIL, PHASE3B_DOM_WARN, PHASE3B_HEAP_FAIL_MB, PHASE3B_HEAP_WARN_MB,
  PHASE3B_IDLE_MS_MAX, PHASE3B_IDLE_MS_MIN, PHASE3B_ROUTE_BATCHES,
  PHASE3B_SAFE_MARQUEE_MAX_NODES, PHASE3B_FULL_MARQUEE_FAIL_NODES,
} from "./helpers/phase3b-controlled-routes";

const PROD_BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const IS_PROD = PROD_BASE.includes("vercel.app");
const EXPECTED_PROD_COMMIT = "fda75677c306aec76dbb83f65c483f8ba7cbe885";
const ACCESS_TOKEN = process.env.TWIN_ACCESS_TOKEN?.trim() ?? "";
const OUT_DIR = join(process.cwd(), ".diagnostics");
const ROUTE_GOTO_MS = 30_000;
const STAGGER_MIN_MS = 500;
const STAGGER_MAX_MS = 1_000;
const MIN_VISIBLE_TEXT = 40;
const MAX_REDIRECTS = 2;
const MAX_CONSOLE_ERRORS = 12;
const MAX_PUBLIC_HEALTH_REQUESTS = 4;
const MAX_AUTH_GATE_NAVIGATIONS = 3;

type RouteStatus = "PASS" | "PARTIAL" | "WARN" | "FAIL";
type RouteReport = {
  batch: string; route: string; finalUrl: string; pathname: string; httpStatus: number | null;
  visibleTextLength: number; mainVisible: boolean; shellReady: boolean; shellSkeleton: boolean;
  hasAuthCard: boolean; hasNotFound: boolean; redirectCount: number; consoleErrorCount: number;
  publicHealthRequestCount: number; authGateNavCount: number; marqueeRemountCount: number;
  marketingLogoNodes: number; safeMarqueeLogoNodes: number; jsHeapUsedMb: number | null;
  domNodes: number | null; layoutCount: number | null; status: RouteStatus;
  failReasons: string[]; warnReasons: string[];
};
type RouteTracker = {
  route: string; page: Page; httpStatus: number | null; consoleErrors: string[];
  publicHealthRequests: number; authGateNavCount: number; marqueeRemountCount: number;
  lastMarqueeSignature: string; getRedirectCount: () => number;
};

function isWorkspaceOrAuthPath(pathname: string): boolean {
  return pathname.startsWith("/dashboard") || pathname.startsWith("/profile") ||
    pathname.startsWith("/recruiter") || pathname.startsWith("/company") ||
    pathname.startsWith("/login") || pathname.startsWith("/register");
}
function staggerDelayMs(index: number): number {
  return STAGGER_MIN_MS + ((index * 137) % (STAGGER_MAX_MS - STAGGER_MIN_MS + 1));
}
async function injectAccessToken(context: BrowserContext): Promise<void> {
  if (!ACCESS_TOKEN) return;
  await context.addInitScript((token: string) => {
    try { window.localStorage?.setItem("twin_access_token", token); } catch { /* ignore */ }
  }, ACCESS_TOKEN);
}
async function dismissCookieBanner(page: Page): Promise<void> {
  const accept = page.getByRole("button", { name: /accept cookies/i });
  if (await accept.isVisible({ timeout: 1_500 }).catch(() => false)) {
    await accept.click({ timeout: 2_000 }).catch(() => {});
  }
}
function attachRouteTracker(page: Page, route: string, httpStatus: number | null): RouteTracker {
  const consoleErrors: string[] = [];
  let redirectCount = 0, lastUrl = "", publicHealthRequests = 0, authGateNavCount = 0;
  let marqueeRemountCount = 0, lastMarqueeSignature = "";
  page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
  page.on("request", (req) => { if (req.url().includes("/api/public-health")) publicHealthRequests += 1; });
  page.on("framenavigated", (frame) => {
    if (frame !== page.mainFrame()) return;
    const u = frame.url();
    if (lastUrl && u !== lastUrl) redirectCount += 1;
    lastUrl = u;
    if (u.includes("/login") && !route.startsWith("/login")) authGateNavCount += 1;
  });
  page.on("domcontentloaded", async () => {
    try {
      const sig = await page.evaluate(() => {
        const safe = document.querySelectorAll(".performance-safe-logo-marquee [role='img']").length;
        const marketing = document.querySelectorAll(".company-logo-marquee [role='img'], .company-logo-marquee img").length;
        return `${safe}:${marketing}`;
      });
      if (lastMarqueeSignature && sig !== lastMarqueeSignature) marqueeRemountCount += 1;
      lastMarqueeSignature = sig;
    } catch { /* ignore */ }
  });
  return { route, page, httpStatus, consoleErrors, publicHealthRequests, authGateNavCount,
    marqueeRemountCount, lastMarqueeSignature, getRedirectCount: () => redirectCount };
}
async function readDomState(page: Page) {
  try {
    return await Promise.race([
      page.evaluate(() => {
        const main = document.querySelector("main");
        const visibleText = (document.body?.innerText ?? "").replace(/\s+/g, " ").trim();
        const bodyLower = visibleText.toLowerCase();
        return {
          visibleTextLength: visibleText.length,
          mainVisible: Boolean(main && (main as HTMLElement).offsetParent !== null),
          shellReady: Boolean(document.querySelector("[data-testid='lightweight-route-shell-ready']")),
          shellSkeleton: Boolean(document.querySelector("[data-testid='lightweight-route-shell-skeleton']")),
          hasAuthCard: /sign in|zaloguj|auth required|wymagane logowanie|przekierowanie|redirecting to sign in|go to sign in|przejdź do logowania/i.test(visibleText),
          hasNotFound: bodyLower.includes("404") || bodyLower.includes("not found") || bodyLower.includes("nie znaleziono"),
          pathname: window.location.pathname,
          marketingLogoNodes: document.querySelectorAll(".company-logo-marquee [role='img'], .company-logo-marquee img").length,
          safeMarqueeLogoNodes: document.querySelectorAll(".performance-safe-logo-marquee [role='img']").length,
        };
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("dom-eval-timeout")), 8_000)),
    ]);
  } catch {
    return { visibleTextLength: 0, mainVisible: false, shellReady: false, shellSkeleton: false,
      hasAuthCard: false, hasNotFound: false, pathname: "", marketingLogoNodes: 0, safeMarqueeLogoNodes: 0 };
  }
}
async function captureCdp(page: Page) {
  try {
    const client = await page.context().newCDPSession(page);
    const [heap, counters, perf] = await Promise.race([
      Promise.all([client.send("Runtime.getHeapUsage"), client.send("Memory.getDOMCounters"), client.send("Performance.getMetrics")]),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("cdp-timeout")), 5_000)),
    ]);
    return { jsHeapUsedMb: Math.round(heap.usedSize / (1024 * 1024)), domNodes: counters.nodes,
      layoutCount: perf.metrics.find((m) => m.name === "LayoutCount")?.value ?? null };
  } catch {
    return { jsHeapUsedMb: null, domNodes: null, layoutCount: null };
  }
}
function evaluateRoute(batch: string, tracker: RouteTracker, dom: Awaited<ReturnType<typeof readDomState>>, cdp: Awaited<ReturnType<typeof captureCdp>>): RouteReport {
  const failReasons: string[] = [], warnReasons: string[] = [];
  const loginWithNext = dom.pathname.includes("/login") && !tracker.route.startsWith("/login");
  if (tracker.httpStatus === 404) failReasons.push("http-404");
  if (dom.hasNotFound && dom.visibleTextLength < MIN_VISIBLE_TEXT) failReasons.push("not-found-page");
  const hasContent = dom.visibleTextLength >= MIN_VISIBLE_TEXT || dom.hasAuthCard || dom.shellReady || dom.mainVisible;
  if (!hasContent && !loginWithNext) failReasons.push("blank-or-no-content");
  if (dom.shellSkeleton && !dom.shellReady && !dom.hasAuthCard && dom.visibleTextLength < MIN_VISIBLE_TEXT) failReasons.push("stuck-skeleton");
  if (tracker.getRedirectCount() > MAX_REDIRECTS) failReasons.push(`redirect-storm:${tracker.getRedirectCount()}`);
  if (tracker.consoleErrors.length > MAX_CONSOLE_ERRORS) failReasons.push(`console-burst:${tracker.consoleErrors.length}`);
  if (tracker.publicHealthRequests > MAX_PUBLIC_HEALTH_REQUESTS) failReasons.push(`public-health-loop:${tracker.publicHealthRequests}`);
  if (tracker.authGateNavCount > MAX_AUTH_GATE_NAVIGATIONS) failReasons.push(`auth-gate-loop:${tracker.authGateNavCount}`);
  if (tracker.marqueeRemountCount > 2) failReasons.push(`marquee-remount-loop:${tracker.marqueeRemountCount}`);
  if (isWorkspaceOrAuthPath(dom.pathname)) {
    if (dom.marketingLogoNodes >= PHASE3B_FULL_MARQUEE_FAIL_NODES) failReasons.push(`89-logo-dom:${dom.marketingLogoNodes}`);
    if (dom.safeMarqueeLogoNodes > PHASE3B_SAFE_MARQUEE_MAX_NODES) failReasons.push(`safe-marquee-overflow:${dom.safeMarqueeLogoNodes}`);
  }
  if (cdp.jsHeapUsedMb !== null) {
    if (cdp.jsHeapUsedMb > PHASE3B_HEAP_FAIL_MB) failReasons.push(`heap-fail:${cdp.jsHeapUsedMb}MB`);
    else if (cdp.jsHeapUsedMb > PHASE3B_HEAP_WARN_MB) warnReasons.push(`heap-warn:${cdp.jsHeapUsedMb}MB`);
  }
  if (cdp.domNodes !== null) {
    if (cdp.domNodes > PHASE3B_DOM_FAIL) failReasons.push(`dom-fail:${cdp.domNodes}`);
    else if (cdp.domNodes > PHASE3B_DOM_WARN) warnReasons.push(`dom-warn:${cdp.domNodes}`);
  }
  let status: RouteStatus = "PASS";
  if (failReasons.length > 0) status = "FAIL";
  else if (loginWithNext && !ACCESS_TOKEN) status = "PARTIAL";
  else if (warnReasons.length > 0) status = "WARN";
  return { batch, route: tracker.route, finalUrl: tracker.page.url(), pathname: dom.pathname,
    httpStatus: tracker.httpStatus, visibleTextLength: dom.visibleTextLength, mainVisible: dom.mainVisible,
    shellReady: dom.shellReady, shellSkeleton: dom.shellSkeleton, hasAuthCard: dom.hasAuthCard,
    hasNotFound: dom.hasNotFound, redirectCount: tracker.getRedirectCount(), consoleErrorCount: tracker.consoleErrors.length,
    publicHealthRequestCount: tracker.publicHealthRequests, authGateNavCount: tracker.authGateNavCount,
    marqueeRemountCount: tracker.marqueeRemountCount, marketingLogoNodes: dom.marketingLogoNodes,
    safeMarqueeLogoNodes: dom.safeMarqueeLogoNodes, jsHeapUsedMb: cdp.jsHeapUsedMb, domNodes: cdp.domNodes,
    layoutCount: cdp.layoutCount, status, failReasons, warnReasons };
}
async function openRouteStaggered(context: BrowserContext, path: string): Promise<RouteTracker> {
  const page = await context.newPage();
  const response = await page.goto(path, { waitUntil: "domcontentloaded", timeout: ROUTE_GOTO_MS });
  await dismissCookieBanner(page);
  return attachRouteTracker(page, path, response?.status() ?? null);
}
async function settleTabForMetrics(page: Page): Promise<void> {
  await page.bringToFront();
  await page.waitForTimeout(400);
}
async function pollPublicHealth(): Promise<{ ok: boolean; gitCommit: string | null }> {
  try {
    const res = await fetch(`${PROD_BASE}/api/public-health`, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return { ok: false, gitCommit: null };
    const json = (await res.json()) as { status?: string; git_commit?: string };
    return { ok: json.status === "ok", gitCommit: json.git_commit ?? null };
  } catch { return { ok: false, gitCommit: null }; }
}

test.describe.configure({ timeout: IS_PROD ? 900_000 : 1_200_000 });
let prodCommitActual: string | null = null;
let prodCommitMismatch = false;

test.describe("Phase 3B controlled multitab verification", () => {
  test.use({ baseURL: PROD_BASE });
  test.beforeAll(async () => {
    if (!IS_PROD) return;
    const health = await pollPublicHealth();
    prodCommitActual = health.gitCommit;
    prodCommitMismatch = health.gitCommit !== EXPECTED_PROD_COMMIT;
    if (prodCommitMismatch) console.warn(`PHASE3B_COMMIT_MISMATCH expected=${EXPECTED_PROD_COMMIT} actual=${health.gitCommit}`);
  });
  for (const batch of PHASE3B_ROUTE_BATCHES) {
    test(`batch ${batch.label}: ${batch.routes.length} tabs idle ${PHASE3B_IDLE_MS_MIN / 1000}s–${PHASE3B_IDLE_MS_MAX / 1000}s`, async ({ browser }) => {
      expect(batch.routes.length).toBeLessThanOrEqual(8);
      mkdirSync(OUT_DIR, { recursive: true });
      const reports: RouteReport[] = [];
      await withFreshContext(browser, async (context) => {
        await injectAccessToken(context);
        const trackers: RouteTracker[] = [];
        for (let i = 0; i < batch.routes.length; i += 1) {
          trackers.push(await openRouteStaggered(context, batch.routes[i]!));
          if (i < batch.routes.length - 1) await new Promise((r) => setTimeout(r, staggerDelayMs(i)));
        }
        const idleMs = PHASE3B_IDLE_MS_MIN + Math.floor((PHASE3B_IDLE_MS_MAX - PHASE3B_IDLE_MS_MIN) * (batch.routes.length / 8));
        await new Promise((r) => setTimeout(r, idleMs));
        for (const tracker of trackers) {
          await settleTabForMetrics(tracker.page);
          reports.push(evaluateRoute(batch.label, tracker, await readDomState(tracker.page), await captureCdp(tracker.page)));
        }
      });
      const payload = { phase: "3B-controlled-multitab", batch: batch.label, baseUrl: PROD_BASE,
        prodCommitExpected: EXPECTED_PROD_COMMIT, prodCommitActual, prodCommitMismatch,
        idleMs: PHASE3B_IDLE_MS_MIN + Math.floor((PHASE3B_IDLE_MS_MAX - PHASE3B_IDLE_MS_MIN) * (batch.routes.length / 8)),
        accessToken: Boolean(ACCESS_TOKEN), routes: reports };
      writeFileSync(join(OUT_DIR, `phase3b-controlled-multitab-${batch.label}.json`), JSON.stringify(payload, null, 2));
      for (const report of reports) {
        expect.soft(report.status, `${report.route}: ${report.failReasons.join(",")}`).not.toBe("FAIL");
        expect(report.httpStatus, `${report.route} HTTP`).not.toBe(404);
        expect(report.redirectCount).toBeLessThanOrEqual(MAX_REDIRECTS);
        if (report.jsHeapUsedMb !== null) expect(report.jsHeapUsedMb).toBeLessThanOrEqual(PHASE3B_HEAP_FAIL_MB);
        if (report.domNodes !== null) expect(report.domNodes).toBeLessThanOrEqual(PHASE3B_DOM_FAIL);
      }
    });
  }
  test("prod frontend commit matches fda7567 (post-route gate)", async () => {
    test.skip(!IS_PROD, "prod commit gate only on vercel.app");
    expect(prodCommitMismatch, `git_commit mismatch: ${prodCommitActual}`).toBe(false);
  });
});
