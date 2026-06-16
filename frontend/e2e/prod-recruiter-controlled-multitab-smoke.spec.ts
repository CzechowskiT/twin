/**
 * P0 production controlled multitab — ONE context, 6 recruiter routes staggered open.
 * Checks at 15s and 30s per page. CDP heap/DOM/Performance per tab.
 *
 * Run (gated):
 *   PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 \
 *   PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app \
 *   npm run test:prod-recruiter-controlled-multitab-smoke
 */
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { withFreshContext } from "./helpers/browser-lifecycle";

const PROD_BASE = process.env.PLAYWRIGHT_BASE_URL ?? "https://twin-sooty.vercel.app";
const IS_PROD = PROD_BASE.includes("vercel.app");
const PILOT_TOKEN = process.env.RECRUITER_INBOX_TOKEN?.trim() ?? "";
const ACCESS_TOKEN = process.env.TWIN_ACCESS_TOKEN?.trim() ?? "";
const COMPANY_SLUG = process.env.RECRUITER_DEMO_COMPANY_SLUG?.trim() ?? "nova-hiring-pl";
const OUT_DIR = join(process.cwd(), ".diagnostics");
const CHECKPOINTS_MS = [15_000, 30_000] as const;
const ROUTE_GOTO_MS = 30_000;
const STAGGER_MIN_MS = 500;
const STAGGER_MAX_MS = 1_000;
const MIN_VISIBLE_TEXT = 40;
const MAX_HEAP_MB = 512;
const MAX_REDIRECTS = 2;
const MIN_SETTLED_AT_30S = 6;

const RECRUITER_ROUTES = [
  "/recruiter",
  "/recruiter/inbox",
  "/recruiter/pipeline",
  "/recruiter/talent-radar",
  "/recruiter/talent-radar/digest",
  "/recruiter/talent-pool",
] as const;

type AuthMode = "pilot-inbox" | "access-token" | "unauth";

type TabCheckpoint = {
  route: string;
  checkpointMs: number;
  finalUrl: string;
  pathname: string;
  nextParam: string | null;
  visibleTextLength: number;
  mainVisible: boolean;
  shellReady: boolean;
  shellSkeleton: boolean;
  hasAuthCard: boolean;
  requestCount: number;
  failedRequestCount: number;
  consoleErrorCount: number;
  redirectCount: number;
  jsHeapUsedMb: number | null;
  domNodes: number | null;
  layoutCount: number | null;
  status: "PASS" | "PARTIAL" | "FAIL";
  failReasons: string[];
};

type RouteTracker = {
  route: string;
  page: Page;
  authMode: AuthMode;
  consoleErrors: string[];
  failedRequests: { url: string; failure: string }[];
  getRequestCount: () => number;
  getRedirectCount: () => number;
};

function routeWithAuth(path: string): { target: string; authMode: AuthMode } {
  if (PILOT_TOKEN && path.includes("/inbox")) {
    const sep = path.includes("?") ? "&" : "?";
    return {
      target: `${path}${sep}token=${encodeURIComponent(PILOT_TOKEN)}&company_slug=${encodeURIComponent(COMPANY_SLUG)}`,
      authMode: "pilot-inbox",
    };
  }
  return { target: path, authMode: ACCESS_TOKEN ? "access-token" : "unauth" };
}

async function injectAccessToken(context: BrowserContext): Promise<void> {
  if (!ACCESS_TOKEN) return;
  await context.addInitScript((token: string) => {
    try {
      window.localStorage?.setItem("twin_access_token", token);
    } catch {
      /* ignore */
    }
  }, ACCESS_TOKEN);
}

function staggerDelayMs(index: number): number {
  const span = STAGGER_MAX_MS - STAGGER_MIN_MS;
  return STAGGER_MIN_MS + ((index * 137) % (span + 1));
}

async function readDomState(page: Page) {
  const evaluateDom = page.evaluate(() => {
    const main = document.querySelector("main");
    const visibleText = (document.body?.innerText ?? "").replace(/\s+/g, " ").trim();
    return {
      visibleTextLength: visibleText.length,
      mainVisible: Boolean(main && (main as HTMLElement).offsetParent !== null),
      shellReady: Boolean(document.querySelector("[data-testid='lightweight-route-shell-ready']")),
      shellSkeleton: Boolean(document.querySelector("[data-testid='lightweight-route-shell-skeleton']")),
      hasAuthCard: /sign in|zaloguj|auth required|wymagane logowanie|przekierowanie|redirecting to sign in|go to sign in|przejdź do logowania/i.test(
        document.body?.innerText ?? "",
      ),
      pathname: window.location.pathname,
      nextParam: new URL(window.location.href).searchParams.get("next"),
    };
  });
  try {
    return await Promise.race([
      evaluateDom,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("dom-eval-timeout")), 8_000),
      ),
    ]);
  } catch {
    return {
      visibleTextLength: 0,
      mainVisible: false,
      shellReady: false,
      shellSkeleton: false,
      hasAuthCard: false,
      pathname: "",
      nextParam: null,
    };
  }
}

async function captureCdp(page: Page) {
  try {
    const client = await page.context().newCDPSession(page);
    const cdpCall = Promise.all([
      client.send("Runtime.getHeapUsage"),
      client.send("Memory.getDOMCounters"),
      client.send("Performance.getMetrics"),
    ]);
    const [heap, counters, perf] = await Promise.race([
      cdpCall,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("cdp-timeout")), 5_000),
      ),
    ]);
    const layoutCount = perf.metrics.find((m) => m.name === "LayoutCount")?.value ?? null;
    return {
      jsHeapUsedMb: Math.round(heap.usedSize / (1024 * 1024)),
      domNodes: counters.nodes,
      layoutCount,
    };
  } catch {
    return { jsHeapUsedMb: null, domNodes: null, layoutCount: null };
  }
}

function isLoginWithNext(pathname: string, nextParam: string | null, route: string): boolean {
  return pathname.includes("/login") && nextParam === route;
}

function isGenericHubBounce(pathname: string): boolean {
  const norm = pathname.replace(/\/$/, "");
  return norm === "/workspace/candidate" || norm === "/workspace/recruiter";
}

function isSettled(dom: Awaited<ReturnType<typeof readDomState>>): boolean {
  return (
    dom.visibleTextLength >= MIN_VISIBLE_TEXT ||
    dom.hasAuthCard ||
    dom.shellReady ||
    dom.mainVisible
  );
}

function evaluateCheckpoint(
  route: string,
  authMode: AuthMode,
  checkpointMs: number,
  dom: Awaited<ReturnType<typeof readDomState>>,
  finalUrl: string,
  tracker: RouteTracker,
  cdp: Awaited<ReturnType<typeof captureCdp>>,
): TabCheckpoint {
  const failReasons: string[] = [];
  const loginWithNext = isLoginWithNext(dom.pathname, dom.nextParam, route);
  const hasContent = isSettled(dom);

  if (isGenericHubBounce(dom.pathname)) {
    failReasons.push("generic-hub-bounce");
  }
  if (!hasContent && !loginWithNext) {
    failReasons.push("blank-or-no-content");
  }
  if (dom.shellSkeleton && !dom.shellReady && !dom.hasAuthCard && dom.visibleTextLength < MIN_VISIBLE_TEXT) {
    failReasons.push("stuck-skeleton");
  }
  if (tracker.getRedirectCount() > MAX_REDIRECTS) {
    failReasons.push(`redirect-storm:${tracker.getRedirectCount()}`);
  }
  if (cdp.jsHeapUsedMb !== null && cdp.jsHeapUsedMb > MAX_HEAP_MB) {
    failReasons.push(`heap-runaway:${cdp.jsHeapUsedMb}MB`);
  }

  let status: TabCheckpoint["status"] = "PASS";
  if (failReasons.length > 0) {
    status = "FAIL";
  } else if (loginWithNext && authMode === "unauth") {
    status = "PARTIAL";
  }

  return {
    route,
    checkpointMs,
    finalUrl,
    pathname: dom.pathname,
    nextParam: dom.nextParam,
    visibleTextLength: dom.visibleTextLength,
    mainVisible: dom.mainVisible,
    shellReady: dom.shellReady,
    shellSkeleton: dom.shellSkeleton,
    hasAuthCard: dom.hasAuthCard,
    requestCount: tracker.getRequestCount(),
    failedRequestCount: tracker.failedRequests.length,
    consoleErrorCount: tracker.consoleErrors.length,
    redirectCount: tracker.getRedirectCount(),
    jsHeapUsedMb: cdp.jsHeapUsedMb,
    domNodes: cdp.domNodes,
    layoutCount: cdp.layoutCount,
    status,
    failReasons,
  };
}

function attachRouteTracker(page: Page, route: string, authMode: AuthMode): RouteTracker {
  const consoleErrors: string[] = [];
  const failedRequests: { url: string; failure: string }[] = [];
  let requestCount = 0;
  let redirectCount = 0;
  let lastUrl = "";

  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("request", () => {
    requestCount += 1;
  });
  page.on("requestfailed", (req) => {
    failedRequests.push({ url: req.url(), failure: req.failure()?.errorText ?? "unknown" });
  });
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) {
      const u = frame.url();
      if (lastUrl && u !== lastUrl) redirectCount += 1;
      lastUrl = u;
    }
  });

  return {
    route,
    page,
    authMode,
    consoleErrors,
    failedRequests,
    getRequestCount: () => requestCount,
    getRedirectCount: () => redirectCount,
  };
}

async function openRouteStaggered(context: BrowserContext, path: string, authMode: AuthMode): Promise<RouteTracker> {
  const page = await context.newPage();
  const tracker = attachRouteTracker(page, path, authMode);
  const { target } = routeWithAuth(path);
  await page.goto(target, { waitUntil: "domcontentloaded", timeout: ROUTE_GOTO_MS });
  return tracker;
}

async function captureAllCheckpoints(
  trackers: RouteTracker[],
  checkpointMs: number,
): Promise<TabCheckpoint[]> {
  return Promise.all(
    trackers.map(async (tracker) => {
      const dom = await readDomState(tracker.page);
      const cdp = await captureCdp(tracker.page);
      return evaluateCheckpoint(
        tracker.route,
        tracker.authMode,
        checkpointMs,
        dom,
        tracker.page.url(),
        tracker,
        cdp,
      );
    }),
  );
}

test.describe.configure({ mode: "serial", timeout: IS_PROD ? 240_000 : 180_000 });

test.describe("prod recruiter controlled multitab smoke", () => {
  test.use({ baseURL: PROD_BASE });

  test("6 staggered tabs settle by 30s with CDP metrics", async ({ browser }) => {
    mkdirSync(OUT_DIR, { recursive: true });
    const allCheckpoints: TabCheckpoint[] = [];

    await withFreshContext(browser, async (context) => {
      await injectAccessToken(context);

      const trackers: RouteTracker[] = [];
      for (let i = 0; i < RECRUITER_ROUTES.length; i += 1) {
        const route = RECRUITER_ROUTES[i]!;
        const { authMode } = routeWithAuth(route);
        trackers.push(await openRouteStaggered(context, route, authMode));
        if (i < RECRUITER_ROUTES.length - 1) {
          await new Promise((r) => setTimeout(r, staggerDelayMs(i)));
        }
      }

      let elapsed = 0;
      for (const checkpointMs of CHECKPOINTS_MS) {
        await new Promise((r) => setTimeout(r, checkpointMs - elapsed));
        elapsed = checkpointMs;
        const snapshots = await captureAllCheckpoints(trackers, checkpointMs);
        allCheckpoints.push(...snapshots);

        if (checkpointMs === 30_000) {
          for (const snap of snapshots) {
            if (snap.status !== "FAIL") continue;
            const tracker = trackers.find((t) => t.route === snap.route);
            if (!tracker) continue;
            const shot = join(
              OUT_DIR,
              `controlled-multitab-failure-${snap.route.replace(/\//g, "_")}-30s.png`,
            );
            await tracker.page.screenshot({ path: shot, fullPage: true }).catch(() => {});
          }
        }
      }
    });

    console.log(
      JSON.stringify(
        {
          auth: { pilotToken: Boolean(PILOT_TOKEN), accessToken: Boolean(ACCESS_TOKEN) },
          checkpoints: allCheckpoints,
        },
        null,
        2,
      ),
    );

    const at30s = allCheckpoints.filter((c) => c.checkpointMs === 30_000);
    const failuresAt30s = at30s.filter((c) => c.status === "FAIL");
    const settledAt30s = at30s.filter((c) => c.status === "PASS" || c.status === "PARTIAL");

    expect(
      failuresAt30s,
      `Failed at 30s: ${failuresAt30s.map((f) => `${f.route} (${f.failReasons.join(",")})`).join("; ")}`,
    ).toEqual([]);
    expect(settledAt30s.length).toBeGreaterThanOrEqual(MIN_SETTLED_AT_30S);

    const stuckAt15s = allCheckpoints.filter(
      (c) =>
        c.checkpointMs === 15_000 &&
        c.shellSkeleton &&
        !c.shellReady &&
        !c.hasAuthCard &&
        c.visibleTextLength < MIN_VISIBLE_TEXT,
    );
    expect(stuckAt15s.map((s) => s.route)).toEqual([]);

    for (const snap of at30s) {
      expect(snap.redirectCount).toBeLessThanOrEqual(MAX_REDIRECTS);
      if (snap.jsHeapUsedMb !== null) {
        expect(snap.jsHeapUsedMb).toBeLessThan(MAX_HEAP_MB);
      }
    }
  });
});
