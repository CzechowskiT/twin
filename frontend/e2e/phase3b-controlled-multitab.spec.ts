/**
 * Phase 3B controlled multitab verification — ONE context per batch (≤8 tabs),
 * staggered open, idle 60–90s, CDP heap/DOM per route.
 */
import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
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
  assertNoWatchdogViolation,
  assertResourceSafeToStart,
  createPhase3bResourceWatchdog,
  requirePhase3bResourceWatchdogEnabled,
  type Phase3bResourceWatchdogHandle,
} from "./helpers/phase3b-resource-watchdog";
import {
  PHASE3B_DOM_FAIL, PHASE3B_DOM_WARN, PHASE3B_HEAP_FAIL_MB, PHASE3B_HEAP_WARN_MB,
  PHASE3B_IDLE_MS_MAX, PHASE3B_IDLE_MS_MIN, PHASE3B_MAX_TABS, selectPhase3bRouteBatches,
  selectPhase3bRoute, slugifyPhase3bRoute,
  PHASE3B_SAFE_MARQUEE_MAX_NODES, PHASE3B_FULL_MARQUEE_FAIL_NODES,
} from "./helpers/phase3b-controlled-routes";
import {
  writeGateEAttemptStatus,
  type GateERouteCounts,
} from "./helpers/gate-e-attempt-status";

// Local execution guard (2026-07-03) — defense in depth against a direct
// `playwright test e2e/phase3b-controlled-multitab.spec.ts` invocation that
// bypasses the npm script chain (and its earlier
// scripts/phase3b-prod-local-guard.ts check) entirely. The founder Mac is
// retired as a Phase 3B execution host — see
// docs/PHASE3B_LOCAL_EXECUTION_DISABLED_2026-07-03.md. This runs at module
// load, before any test() registers and before any browser/context/page is
// created by a Playwright fixture.
if (process.env.GITHUB_ACTIONS !== "true") {
  // eslint-disable-next-line no-console -- deliberate operator-facing message, exact text required
  console.error("Local Phase 3B execution is disabled. Use the GitHub Actions workflow.");
  process.exit(1);
}

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

// Cancellation-hardening (2026-07-03, see
// docs/gate-e-phase3b-attempt12-result-2026-07-03.md): attempt 12 dispatch 2
// (run 28652257796) went silent for ~4m21s between the last visible
// Playwright output and an unexplained job-level cancellation, with zero
// artifacts uploaded because the cancellation skipped every subsequent
// `if: always()` step, including "Upload diagnostics". GITHUB_RUN_ID/
// GITHUB_SHA are ambient on every GitHub Actions runner (no workflow env:
// wiring needed); both are null on a local run, which is fine — local
// Phase 3B execution is already hard-blocked above.
const GATE_E_RUN_ID = process.env.GITHUB_RUN_ID ?? null;
const GATE_E_REPO_SHA = process.env.GITHUB_SHA ?? null;
const GATE_E_HEARTBEAT_MS = 30_000;

// Gate E Phase 3B split-batch execution (2026-07-03, see
// docs/GATE_E_PHASE3B_SPLIT_BATCH_EXECUTION_PLAN_2026-07-03.md): when
// PHASE3B_BATCH is set to one of "public-candidate" | "recruiter" | "company"
// (as each isolated-runner matrix job now is), this run's route batches are
// filtered down to that single named batch. Unset (local full-run/legacy
// invocation) still resolves to all 3 batches, unchanged.
//
// Gate E Phase 3B route-level sharding (2026-07-06, see
// docs/GATE_E_PHASE3B_ROUTE_SHARDING_PLAN_2026-07-03.md): when PHASE3B_ROUTE
// is set to one of the 20 PHASE3B_ALL_ROUTES entries (as each route-sharded
// isolated-runner matrix job now is, superseding the 3-way batch matrix
// after attempt 14's RUNNER_SHUTDOWN_SIGNAL struck all 3 batches in one
// dispatch), this run's route batches are filtered down to a single
// one-route pseudo-batch instead — reusing the exact same shape
// (`{ label, routes }`) so every other reference in this file to
// PHASE3B_ROUTE_BATCHES (the batch loop, `.length`, `batchProgress.
// totalBatches`, per-route JSON/status file naming keyed off `batch.label`)
// stays byte-for-byte the same and simply operates on the filtered result
// below. selectPhase3bRoute throws if PHASE3B_ROUTE and PHASE3B_BATCH are
// both set, so a misconfigured matrix job can never silently run the wrong
// shape.
type Phase3bRouteBatch = { label: string; routes: readonly string[] };
const PHASE3B_ROUTE_ENV = selectPhase3bRoute(process.env);
const PHASE3B_ROUTE_BATCHES: readonly Phase3bRouteBatch[] = PHASE3B_ROUTE_ENV
  ? [{ label: slugifyPhase3bRoute(PHASE3B_ROUTE_ENV), routes: [PHASE3B_ROUTE_ENV] }]
  : selectPhase3bRouteBatches(process.env);
const PHASE3B_BATCH_ENV = PHASE3B_ROUTE_ENV
  ? slugifyPhase3bRoute(PHASE3B_ROUTE_ENV)
  : process.env.PHASE3B_BATCH?.trim() || null;

/**
 * Emits a `[gate-e-heartbeat]` console.log line every `GATE_E_HEARTBEAT_MS`
 * while waiting out `ms` of idle time. Plain Node `console.log` calls from
 * test code go straight to the process's own stdout — captured live by
 * GitHub Actions as the job runs, unlike an artifact upload, which needs a
 * later step to actually execute. This is what closes the ~4m21s silent
 * gap observed in attempt 12: even under a hard external cancellation that
 * skips every subsequent step, the log lines already streamed are
 * preserved and show exactly how far the run got.
 */
async function idleWithHeartbeat(ms: number, label: string): Promise<void> {
  let remaining = ms;
  while (remaining > 0) {
    const tick = Math.min(GATE_E_HEARTBEAT_MS, remaining);
    await new Promise((r) => setTimeout(r, tick));
    remaining -= tick;
    console.log(`[gate-e-heartbeat] batch ${label}: idle wait ${ms - remaining}/${ms}ms elapsed`);
  }
}

function statusForRouteKey(status: RouteStatus): keyof Omit<GateERouteCounts, "total"> {
  return status.toLowerCase() as keyof Omit<GateERouteCounts, "total">;
}

/** Running totals across batches, for cumulative `routeCounts`/`classifications` in the persisted status file. */
const cumulativeRouteCounts: GateERouteCounts = { total: 0, pass: 0, partial: 0, warn: 0, fail: 0 };
const cumulativeClassifications: Record<string, string> = {};
let completedBatchCount = 0;

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

/**
 * Best-effort extraction of the underlying OS PID for a Playwright `Browser`
 * fixture. `browser.process()` is NOT part of Playwright Test's public
 * `Browser` type (only `BrowserServer`/`ElectronApplication` expose it) —
 * this reads it defensively off the runtime object when present, and
 * returns null otherwise. A null result means ownership cannot be proven,
 * and the resource watchdog (phase3b-resource-watchdog.ts) correctly
 * degrades to NEEDS_MANUAL_REVIEW rather than guessing — see
 * docs/PHASE3B_MACOS_PROCESS_DETECTION_2026-07-03.md §2.
 */
function tryGetBrowserPid(browser: Browser): number | null {
  const maybeProcess = (browser as unknown as { process?: () => { pid?: number } | null }).process;
  if (typeof maybeProcess !== "function") return null;
  try {
    const child = maybeProcess.call(browser);
    return typeof child?.pid === "number" ? child.pid : null;
  } catch {
    return null;
  }
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
/**
 * Gate E attempt 7 execution guarantee (2026-06-29): hard runtime ceiling on
 * concurrent tabs, independent of the route-batch data itself. Even if
 * PHASE3B_ROUTE_BATCHES is ever edited to exceed PHASE3B_MAX_TABS, this
 * throws before a new tab/page (and its renderer process) is created,
 * instead of silently fanning out. See
 * docs/GATE_E_ATTEMPT7_EXECUTION_GUARANTEE_2026-06-29.md.
 */
function assertTabBudget(context: BrowserContext): void {
  const openPages = context.pages().length;
  if (openPages >= PHASE3B_MAX_TABS) {
    throw new Error(
      `phase3b tab budget exceeded: ${openPages} pages already open (max ${PHASE3B_MAX_TABS}); refusing to open another`,
    );
  }
}

/**
 * Gate E attempt 7 execution guarantee (2026-06-29): before opening a fresh
 * batch context, assert the shared worker browser has zero live contexts.
 * A non-zero count here means the previous batch's withFreshContext cleanup
 * did not run (or did not complete) — exactly the failure mode that could
 * let contexts/pages accumulate across sequential batches. Fails loudly
 * instead of silently stacking browser resources.
 */
function assertNoLeakedContextsFromPriorBatch(browser: Browser): void {
  const liveContexts = browser.contexts().length;
  if (liveContexts !== 0) {
    throw new Error(
      `phase3b context leak detected: ${liveContexts} browser context(s) still open before starting a new batch (expected 0)`,
    );
  }
}

async function openRouteStaggered(context: BrowserContext, path: string): Promise<RouteTracker> {
  assertTabBudget(context);
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

// Gate E attempt 7 execution guarantee (2026-06-29): retries pinned to 0 at the
// describe level, independent of playwright.config.ts's CI-conditional global
// `retries`. Phase 3B must never auto-retry (hard ban, see
// GATE_E_ATTEMPT7_SAFETY_PLAN_2026-06-29.md §4.5) even if this spec is ever
// invoked with CI=1 set in the environment.
test.describe.configure({ mode: "serial", retries: 0, timeout: IS_PROD ? 900_000 : 1_200_000 });
let preflight: Phase3bPreflightSnapshot | null = null;

/**
 * Gate E attempt 9 follow-up (2026-07-03): production Phase 3B runs must not
 * start without a code-enforced resource watchdog. Attempt 9 was manually
 * aborted before any Playwright invocation precisely because this guard did
 * not exist yet — see docs/gate-e-phase3b-attempt9-result-2026-07-02.md and
 * docs/PHASE3B_RESOURCE_WATCHDOG_2026-07-03.md. Evaluated at module load, so
 * a prod run refuses before any browser is launched, not just before the
 * first assertion runs.
 */
requirePhase3bResourceWatchdogEnabled(IS_PROD);

let resourceWatchdog: Phase3bResourceWatchdogHandle | null = null;

test.describe("Phase 3B controlled multitab verification", () => {
  test.use({ baseURL: PROD_BASE });

  test.afterAll(() => {
    // Attempt 10 macOS process-detection hardening (2026-07-03): record the
    // owned Chrome-family PID tree one last time before stopping, so a
    // NEEDS_MANUAL_REVIEW status (unowned Chrome-family matches — e.g. a
    // real daily-driver Chrome) is visible in .diagnostics even when no
    // PROCESS_COUNT_EXCEEDED/RUN_TIMEOUT_EXCEEDED violation ever fired.
    if (resourceWatchdog) {
      const finalOwnership = resourceWatchdog.captureOwnershipSnapshot();
      try {
        mkdirSync(OUT_DIR, { recursive: true });
        writeFileSync(
          join(OUT_DIR, "phase3b-process-ownership-final.json"),
          JSON.stringify(finalOwnership, null, 2),
        );
      } catch {
        /* diagnostics are best-effort; never fail the run over a write error */
      }
    }
    // Cancellation-hardening (2026-07-03): final checkpoint, so a completed
    // (pass, fail, or timed-out) run's status file always reaches
    // "final-cleanup" — distinguishable from a run whose last persisted
    // stage was "batch-start"/"batch-complete", which means it never got
    // this far (a hard external cancellation, per attempt 12).
    console.log("[gate-e-heartbeat] final-cleanup: afterAll reached, stopping resource watchdog");
    writeGateEAttemptStatus({
      stage: "final-cleanup",
      batch: PHASE3B_BATCH_ENV,
      runId: GATE_E_RUN_ID,
      repoSha: GATE_E_REPO_SHA,
      healthStatus: "ok",
      smokeStatus: "ok",
      batchProgress: { totalBatches: PHASE3B_ROUTE_BATCHES.length, completedBatches: completedBatchCount, currentBatch: null },
      routeCounts: { ...cumulativeRouteCounts },
      classifications: { ...cumulativeClassifications },
    });
    resourceWatchdog?.stop();
  });

  test("prod preflight — public-health + frontend_commit alignment", async () => {
    test.skip(!IS_PROD, "prod preflight only on vercel.app");
    if (IS_PROD) {
      assertResourceSafeToStart();
      resourceWatchdog = createPhase3bResourceWatchdog();
    }
    const health = await pollPublicHealth();
    expect(health, "public-health unavailable").not.toBeNull();
    preflight = buildPhase3bPreflightSnapshot(health!);
    expect(preflight.publicHealthStatus, "public-health status").toBe("ok");
    expect(preflight.publicHealthDbOk, "public-health db_ok").toBe(true);
    expect(preflight.frontendCommitActual, "frontend_commit present").toBeTruthy();
    expect(preflight.apiCommitActual, "api_commit present").toBeTruthy();
    expect(preflight.classification, `preflight: expected=${preflight.frontendCommitExpected} actual=${preflight.frontendCommitActual}`).not.toBe("COMMIT_MISMATCH");
    expect(preflight.ok, "preflight ok").toBe(true);
    // Cancellation-hardening (2026-07-03): the "prod preflight" sub-test was
    // the last thing attempt 12 (dispatch 2) completed before ~4m21s of
    // silence and an unexplained cancellation — see
    // docs/gate-e-phase3b-attempt12-result-2026-07-03.md §2. Logging and
    // persisting immediately after preflight passes means a future
    // cancellation at exactly this point leaves both a log line and a
    // status file confirming preflight succeeded, instead of silence.
    console.log("[gate-e-heartbeat] preflight-complete: public-health + frontend_commit alignment PASSED, starting route batches");
    writeGateEAttemptStatus({
      stage: "preflight-complete",
      batch: PHASE3B_BATCH_ENV,
      runId: GATE_E_RUN_ID,
      repoSha: GATE_E_REPO_SHA,
      healthStatus: "ok",
      smokeStatus: "ok",
      batchProgress: { totalBatches: PHASE3B_ROUTE_BATCHES.length, completedBatches: 0, currentBatch: null },
    });
  });

  for (const batch of PHASE3B_ROUTE_BATCHES) {
    test(`batch ${batch.label}: ${batch.routes.length} tabs idle ${PHASE3B_IDLE_MS_MIN / 1000}s–${PHASE3B_IDLE_MS_MAX / 1000}s`, async ({ browser }) => {
      if (IS_PROD && preflight && !preflight.ok) {
        test.skip(true, `preflight failed: ${preflight.classification}`);
      }
      // Cancellation-hardening (2026-07-03): log + persist status before
      // opening any tab, so a batch that never reaches "batch-complete" is
      // visibly distinguishable (in both the live log stream and, if the
      // upload step gets a chance to run, the uploaded status file) from a
      // batch that completed or never started at all.
      console.log(`[gate-e-heartbeat] batch-start: ${batch.label} (${batch.routes.length} routes)`);
      writeGateEAttemptStatus({
        stage: "batch-start",
        batch: PHASE3B_BATCH_ENV,
        runId: GATE_E_RUN_ID,
        repoSha: GATE_E_REPO_SHA,
        healthStatus: "ok",
        smokeStatus: "ok",
        batchProgress: { totalBatches: PHASE3B_ROUTE_BATCHES.length, completedBatches: completedBatchCount, currentBatch: batch.label },
      });
      // Attempt 10 macOS process-detection hardening (2026-07-03): bind the
      // watchdog to the actual Playwright browser PID as soon as it's known,
      // so ownership-based cleanup (see phase3b-resource-watchdog.ts) can
      // scope itself to this run's real process tree — not just the
      // chrome-headless-shell name, which undercounted a real Chrome/Chromium
      // channel's process pressure. Never widens what gets killed; only
      // narrows/confirms it.
      resourceWatchdog?.setBrowserPid(tryGetBrowserPid(browser));
      if (resourceWatchdog) assertNoWatchdogViolation(resourceWatchdog);
      expect(batch.routes.length).toBeLessThanOrEqual(PHASE3B_MAX_TABS);
      assertNoLeakedContextsFromPriorBatch(browser);
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
        // Cancellation-hardening (2026-07-03): this idle wait (60-90s) was
        // exactly the kind of silent gap that made attempt 12's ~4m21s
        // silence-then-cancellation ambiguous to diagnose after the fact —
        // emit a heartbeat every 30s instead of waiting silently.
        await idleWithHeartbeat(idleMs, batch.label);
        if (resourceWatchdog) assertNoWatchdogViolation(resourceWatchdog);
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
      // Cancellation-hardening (2026-07-03): accumulate cumulative
      // route-level totals/classifications and persist status immediately
      // after this batch's own evidence file is written — before the
      // `expect.soft` assertions below run, so a batch that fails an
      // assertion still leaves "batch-complete" (with this batch's own
      // route data already recorded) rather than nothing at all.
      completedBatchCount += 1;
      for (const report of reports) {
        cumulativeRouteCounts.total += 1;
        cumulativeRouteCounts[statusForRouteKey(report.status)] += 1;
        cumulativeClassifications[report.route] = report.classification;
      }
      console.log(`[gate-e-heartbeat] batch-complete: ${batch.label} (${completedBatchCount}/${PHASE3B_ROUTE_BATCHES.length} batches done, ${cumulativeRouteCounts.total} routes evaluated so far)`);
      writeGateEAttemptStatus({
        stage: "batch-complete",
        batch: PHASE3B_BATCH_ENV,
        runId: GATE_E_RUN_ID,
        repoSha: GATE_E_REPO_SHA,
        healthStatus: "ok",
        smokeStatus: "ok",
        batchProgress: { totalBatches: PHASE3B_ROUTE_BATCHES.length, completedBatches: completedBatchCount, currentBatch: batch.label },
        routeCounts: { ...cumulativeRouteCounts },
        classifications: { ...cumulativeClassifications },
      });
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
