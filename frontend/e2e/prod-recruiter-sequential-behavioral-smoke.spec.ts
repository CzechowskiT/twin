/**
 * P0 production behavioral validation — ONE browser, sequential recruiter routes.
 * No concurrent tabs. CDP metrics per route within 15s.
 *
 * Run (gated):
 *   PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 \
 *   PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app \
 *   npm run test:prod-recruiter-sequential-behavioral-smoke:raw
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
const ROUTE_SETTLE_MS = 15_000;
const ROUTE_GOTO_MS = 30_000;
const MIN_VISIBLE_TEXT = 40;
const MAX_HEAP_MB = 512;
const MAX_REDIRECTS = 2;

const RECRUITER_ROUTES = [
  "/recruiter",
  "/recruiter/inbox",
  "/recruiter/pipeline",
  "/recruiter/talent-radar",
  "/recruiter/talent-radar/digest",
  "/recruiter/talent-pool",
] as const;

type RouteMetrics = {
  route: string;
  authMode: "pilot-inbox" | "access-token" | "unauth";
  finalUrl: string;
  pathname: string;
  nextParam: string | null;
  readyState: string;
  title: string;
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
  consoleErrors: string[];
  failedRequests: { url: string; failure: string }[];
  getRequestCount: () => number;
  getRedirectCount: () => number;
};

function routeWithAuth(path: string): { target: string; authMode: RouteMetrics["authMode"] } {
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

function evaluateRoute(
  route: string,
  authMode: RouteMetrics["authMode"],
  dom: Awaited<ReturnType<typeof readDomState>>,
  finalUrl: string,
  tracker: RouteTracker,
  cdp: Awaited<ReturnType<typeof captureCdp>>,
): RouteMetrics {
  const failReasons: string[] = [];
  const loginWithNext = isLoginWithNext(dom.pathname, dom.nextParam, route);
  const stayedOnRoute = dom.pathname.replace(/\/$/, "") === route.replace(/\/$/, "");
  const hasContent =
    dom.visibleTextLength >= MIN_VISIBLE_TEXT ||
    dom.hasAuthCard ||
    dom.shellReady ||
    dom.mainVisible;

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

  let status: RouteMetrics["status"] = "PASS";
  if (failReasons.length > 0) {
    status = "FAIL";
  } else if (loginWithNext && authMode === "unauth") {
    status = "PARTIAL";
  }

  return {
    route,
    authMode,
    finalUrl,
    pathname: dom.pathname,
    nextParam: dom.nextParam,
    readyState: "complete",
    title: "",
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

function attachRouteTracker(page: Page, route: string): RouteTracker {
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
    consoleErrors,
    failedRequests,
    getRequestCount: () => requestCount,
    getRedirectCount: () => redirectCount,
  };
}

async function openRouteSequential(context: BrowserContext, path: string): Promise<RouteTracker> {
  const page = await context.newPage();
  const tracker = attachRouteTracker(page, path);
  const { target } = routeWithAuth(path);
  await page.goto(target, { waitUntil: "domcontentloaded", timeout: ROUTE_GOTO_MS });
  return tracker;
}

test.describe.configure({ mode: "serial", timeout: IS_PROD ? 180_000 : 120_000 });

test.describe("prod recruiter sequential behavioral smoke", () => {
  test.use({ baseURL: PROD_BASE });

  test("sequential routes settle within 15s with CDP metrics", async ({ browser }) => {
    mkdirSync(OUT_DIR, { recursive: true });
    const results: RouteMetrics[] = [];

    await withFreshContext(browser, async (context) => {
      await injectAccessToken(context);

      for (const route of RECRUITER_ROUTES) {
        const { authMode } = routeWithAuth(route);
        const tracker = await openRouteSequential(context, route);
        const { page } = tracker;

        await page.waitForTimeout(ROUTE_SETTLE_MS);

        const dom = await readDomState(page);
        const finalUrl = page.url();
        const title = await page.title().catch(() => "");
        const readyState = await page.evaluate(() => document.readyState).catch(() => "unknown");
        const cdp = await captureCdp(page);

        const metrics = evaluateRoute(route, authMode, dom, finalUrl, tracker, cdp);
        metrics.title = title;
        metrics.readyState = readyState;
        results.push(metrics);

        if (metrics.status === "FAIL") {
          const shot = join(OUT_DIR, `sequential-failure-${route.replace(/\//g, "_")}.png`);
          await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
        }

        await page.close();
      }
    });

    // Emit machine-readable report for docs/CI
    console.log(JSON.stringify({ auth: { pilotToken: Boolean(PILOT_TOKEN), accessToken: Boolean(ACCESS_TOKEN) }, results }, null, 2));

    const failures = results.filter((r) => r.status === "FAIL");
    const partials = results.filter((r) => r.status === "PARTIAL");

    expect(failures, `Failed routes: ${failures.map((f) => `${f.route} (${f.failReasons.join(",")})`).join("; ")}`).toEqual([]);
    // PARTIAL (unauth login?next=) is acceptable for P0 behavioral gate when no session token
    expect(partials.length + results.filter((r) => r.status === "PASS").length).toBe(RECRUITER_ROUTES.length);
  });
});
