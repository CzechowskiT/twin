/**
 * Phase 3B controlled multitab verification — ONE context per batch (≤8 tabs),
 * staggered open, idle 60–90s, CDP heap/DOM per route.
 */
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { withFreshContext } from "./helpers/browser-lifecycle";
import { loadLocalTestEnv } from "./helpers/load-local-test-env";
import {
  classifyPhase3bRouteAuth,
  classifyPhase3bRouteFailure,
  parsePhase3bPublicHealth,
  buildPhase3bPreflightSnapshot,
  type Phase3bDiagnosticClassification,
  type Phase3bPreflightSnapshot,
  type Phase3bRouteAuthTier,
} from "./helpers/phase3b-harness-diagnostics";
import {
  PHASE3B_DOM_FAIL, PHASE3B_DOM_WARN, PHASE3B_HEAP_FAIL_MB, PHASE3B_HEAP_WARN_MB,
  PHASE3B_IDLE_MS_MAX, PHASE3B_IDLE_MS_MIN, PHASE3B_ROUTE_BATCHES,
  PHASE3B_SAFE_MARQUEE_MAX_NODES, PHASE3B_FULL_MARQUEE_FAIL_NODES,
} from "./helpers/phase3b-controlled-routes";

// Safe local env fallback — loads root/frontend .env.local for Cursor-agent/npm
// shells that don't auto-source them. No-op when TWIN_ACCESS_TOKEN is already
// exported (CI, prod runners) or when no local env files exist.
loadLocalTestEnv();

const PROD_BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const IS_PROD = PROD_BASE.includes("vercel.app");
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
  batch: string;
  route: string;
  authTier: Phase3bRouteAuthTier;
  classification: Phase3bDiagnosticClassification;
  finalUrl: string;
  pathname: string;
  documentTitle: string;
  rootPresent: boolean;
  httpStatus: number | null;
  visibleTextLength: number;
  mainVisible: boolean;
  shellReady: boolean;
  shellSkeleton: boolean;
  hasAuthCard: boolean;
  hasNotFound: boolean;
  redirectCount: number;
  consoleErrorCount: number;
  pageErrorCount: number;
  consoleErrors: string[];
  pageErrors: string[];
  publicHealthRequestCount: number;
  authGateNavCount: number;
  marqueeRemountCount: number;
  marketingLogoNodes: number;
  safeMarqueeLogoNodes: number;
  jsHeapUsedMb: number | null;
  domNodes: number | null;
  layoutCount: number | null;
  cdpStatus: "ok" | "unavailable" | "timeout";
  status: RouteStatus;
  failReasons: string[];
  warnReasons: string[];
};
type RouteTracker = {
  route: string;
  page: Page;
  httpStatus: number | null;
  consoleErrors: string[];
  pageErrors: string[];
  publicHealthRequests: number;
  authGateNavCount: number;
  marqueeRemountCount: number;
  lastMarqueeSignature: string;
  getRedirectCount: () => number;
};

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
  const pageErrors: string[] = [];
  let redirectCount = 0, lastUrl = "", publicHealthRequests = 0, authGateNavCount = 0;
  let marqueeRemountCount = 0, lastMarqueeSignature = "";
  page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
  page.on("pageerror", (err) => { pageErrors.push(String(err)); });
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
  return { route, page, httpStatus, consoleErrors, pageErrors, publicHealthRequests, authGateNavCount,
    marqueeRemountCount, lastMarqueeSignature, getRedirectCount: () => redirectCount };
}
async function readDomState(page: Page) {
  try {
    return await Promise.race([
      page.evaluate(() => {
        const main = document.querySelector("main");
        const visibleText = (document.body?.innerText ?? "").replace(/\s+/g, " ").trim();
        const bodyLower = visibleText.toLowerCase();
        const root = document.getElementById("__next") ?? document.querySelector("#root") ?? document.body;
        return {
          visibleTextLength: visibleText.length,
          mainVisible: Boolean(main && (main as HTMLElement).offsetParent !== null),
          shellReady: Boolean(document.querySelector("[data-testid='lightweight-route-shell-ready']")),
          shellSkeleton: Boolean(document.querySelector("[data-testid='lightweight-route-shell-skeleton']")),
          hasAuthCard: /sign in|zaloguj|auth required|wymagane logowanie|przekierowanie|redirecting to sign in|go to sign in|przejdź do logowania/i.test(visibleText),
          hasNotFound: bodyLower.includes("404") || bodyLower.includes("not found") || bodyLower.includes("nie znaleziono"),
          pathname: window.location.pathname,
          documentTitle: document.title ?? "",
          rootPresent: Boolean(root && root.childElementCount > 0),
          marketingLogoNodes: document.querySelectorAll(".company-logo-marquee [role='img'], .company-logo-marquee img").length,
          safeMarqueeLogoNodes: document.querySelectorAll(".performance-safe-logo-marquee [role='img']").length,
        };
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("dom-eval-timeout")), 8_000)),
    ]);
  } catch {
    return { visibleTextLength: 0, mainVisible: false, shellReady: false, shellSkeleton: false,
      hasAuthCard: false, hasNotFound: false, pathname: "", documentTitle: "", rootPresent: false,
      marketingLogoNodes: 0, safeMarqueeLogoNodes: 0 };
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
      layoutCount: perf.metrics.find((m) => m.name === "LayoutCount")?.value ?? null, cdpStatus: "ok" as const };
  } catch (err) {
    const cdpStatus = String(err).includes("cdp-timeout") ? "timeout" as const : "unavailable" as const;
    return { jsHeapUsedMb: null, domNodes: null, layoutCount: null, cdpStatus };
  }
}
function evaluateRoute(batch: string, tracker: RouteTracker, dom: Awaited<ReturnType<typeof readDomState>>,
  cdp: Awaited<ReturnType<typeof captureCdp>>): RouteReport {
  const authTier = classifyPhase3bRouteAuth(tracker.route);
  const verdict = classifyPhase3bRouteFailure({
    route: tracker.route, authTier, hasAccessToken: Boolean(ACCESS_TOKEN),
    httpStatus: tracker.httpStatus, dom, cdp,
    redirectCount: tracker.getRedirectCount(), consoleErrorCount: tracker.consoleErrors.length,
    pageErrorCount: tracker.pageErrors.length, publicHealthRequestCount: tracker.publicHealthRequests,
    authGateNavCount: tracker.authGateNavCount, marqueeRemountCount: tracker.marqueeRemountCount,
    maxRedirects: MAX_REDIRECTS, maxConsoleErrors: MAX_CONSOLE_ERRORS,
    maxPublicHealthRequests: MAX_PUBLIC_HEALTH_REQUESTS, maxAuthGateNavigations: MAX_AUTH_GATE_NAVIGATIONS,
    minVisibleText: MIN_VISIBLE_TEXT, heapFailMb: PHASE3B_HEAP_FAIL_MB, heapWarnMb: PHASE3B_HEAP_WARN_MB,
    domFail: PHASE3B_DOM_FAIL, domWarn: PHASE3B_DOM_WARN,
    safeMarqueeMaxNodes: PHASE3B_SAFE_MARQUEE_MAX_NODES, fullMarqueeFailNodes: PHASE3B_FULL_MARQUEE_FAIL_NODES,
  });
  return { batch, route: tracker.route, authTier, classification: verdict.classification,
    finalUrl: tracker.page.url(), pathname: dom.pathname, documentTitle: dom.documentTitle,
    rootPresent: dom.rootPresent, httpStatus: tracker.httpStatus, visibleTextLength: dom.visibleTextLength,
    mainVisible: dom.mainVisible, shellReady: dom.shellReady, shellSkeleton: dom.shellSkeleton,
    hasAuthCard: dom.hasAuthCard, hasNotFound: dom.hasNotFound, redirectCount: tracker.getRedirectCount(),
    consoleErrorCount: tracker.consoleErrors.length, pageErrorCount: tracker.pageErrors.length,
    consoleErrors: tracker.consoleErrors.slice(0, 5), pageErrors: tracker.pageErrors.slice(0, 5),
    publicHealthRequestCount: tracker.publicHealthRequests, authGateNavCount: tracker.authGateNavCount,
    marqueeRemountCount: tracker.marqueeRemountCount, marketingLogoNodes: dom.marketingLogoNodes,
    safeMarqueeLogoNodes: dom.safeMarqueeLogoNodes, jsHeapUsedMb: cdp.jsHeapUsedMb, domNodes: cdp.domNodes,
    layoutCount: cdp.layoutCount, cdpStatus: cdp.cdpStatus, status: verdict.status,
    failReasons: verdict.failReasons, warnReasons: verdict.warnReasons };
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
async function pollPublicHealth() {
  try {
    const res = await fetch(`${PROD_BASE}/api/public-health`, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return null;
    return parsePhase3bPublicHealth((await res.json()) as Record<string, unknown>);
  } catch { return null; }
}

test.describe.configure({ mode: "serial", timeout: IS_PROD ? 900_000 : 1_200_000 });
let preflight: Phase3bPreflightSnapshot | null = null;

test.describe("Phase 3B controlled multitab verification", () => {
  test.use({ baseURL: PROD_BASE });

  test("prod preflight — public-health + frontend_commit alignment", async () => {
    test.skip(!IS_PROD, "prod preflight only on vercel.app");
    const health = await pollPublicHealth();
    expect(health, "public-health unavailable").not.toBeNull();
    preflight = buildPhase3bPreflightSnapshot(health!);
    expect(preflight.publicHealthStatus, "public-health status").toBe("ok");
    expect(preflight.publicHealthDbOk, "public-health db_ok").toBe(true);
    expect(preflight.frontendCommitActual, "frontend_commit present").toBeTruthy();
    expect(preflight.apiCommitActual, "api_commit present").toBeTruthy();
    expect(preflight.classification, `preflight: expected=${preflight.frontendCommitExpected} actual=${preflight.frontendCommitActual}`).not.toBe("COMMIT_MISMATCH");
    expect(preflight.ok, "preflight ok").toBe(true);
  });

  for (const batch of PHASE3B_ROUTE_BATCHES) {
    test(`batch ${batch.label}: ${batch.routes.length} tabs idle ${PHASE3B_IDLE_MS_MIN / 1000}s–${PHASE3B_IDLE_MS_MAX / 1000}s`, async ({ browser }) => {
      if (IS_PROD && preflight && !preflight.ok) {
        test.skip(true, `preflight failed: ${preflight.classification}`);
      }
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
      const payload = {
        phase: "3B-controlled-multitab",
        batch: batch.label,
        baseUrl: PROD_BASE,
        preflight: preflight ?? { classification: "PREFLIGHT_OK", ok: true },
        frontendCommitExpected: preflight?.frontendCommitExpected ?? null,
        frontendCommitActual: preflight?.frontendCommitActual ?? null,
        apiCommitActual: preflight?.apiCommitActual ?? null,
        frontendCommitMismatch: preflight?.frontendCommitMismatch ?? false,
        idleMs: PHASE3B_IDLE_MS_MIN + Math.floor((PHASE3B_IDLE_MS_MAX - PHASE3B_IDLE_MS_MIN) * (batch.routes.length / 8)),
        accessToken: Boolean(ACCESS_TOKEN),
        routes: reports,
      };
      writeFileSync(join(OUT_DIR, `phase3b-controlled-multitab-${batch.label}.json`), JSON.stringify(payload, null, 2));
      for (const report of reports) {
        expect.soft(report.status, `${report.route}: ${report.classification} ${report.failReasons.join(",")}`).not.toBe("FAIL");
        expect(report.httpStatus, `${report.route} HTTP`).not.toBe(404);
        expect(report.redirectCount).toBeLessThanOrEqual(MAX_REDIRECTS);
        if (report.jsHeapUsedMb !== null) expect(report.jsHeapUsedMb).toBeLessThanOrEqual(PHASE3B_HEAP_FAIL_MB);
        if (report.domNodes !== null) expect(report.domNodes).toBeLessThanOrEqual(PHASE3B_DOM_FAIL);
      }
    });
  }
});
