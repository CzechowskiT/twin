import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import { withFreshContext } from "./helpers/browser-lifecycle";

const PROD_BASE = process.env.PLAYWRIGHT_BASE_URL ?? "https://twin-sooty.vercel.app";
const IS_PROD = PROD_BASE.includes("vercel.app");

const RECRUITER_ROUTES = [
  "/recruiter",
  "/recruiter/inbox",
  "/recruiter/pipeline",
  "/recruiter/search",
  "/recruiter/talent-radar",
  "/recruiter/talent-radar/digest",
  "/recruiter/talent-pool",
  "/recruiter/talent-pool/import",
  "/recruiter/analytics",
  "/recruiter/integrations",
] as const;

const SNAPSHOT_WAIT_MS = [5_000, 15_000, 30_000] as const;
const ROUTE_GOTO_MS = 30_000;
const MIN_VISIBLE_TEXT = 40;

type RouteSnapshot = {
  route: string;
  url: string;
  readyState: string;
  title: string;
  visibleTextLength: number;
  mainVisible: boolean;
  shellReady: boolean;
  shellSkeleton: boolean;
  hasAuthCard: boolean;
  jsHeapUsedMb: number | null;
  domNodes: number | null;
  redirectCount: number;
  consoleErrorCount: number;
  failedRequestCount: number;
};

async function openRoute(context: BrowserContext, path: string): Promise<Page> {
  const page = await context.newPage();
  await page.goto(path, { waitUntil: "domcontentloaded", timeout: ROUTE_GOTO_MS });
  return page;
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
    };
  }
}

async function captureSnapshot(
  page: Page,
  route: string,
  redirectCount: number,
  consoleErrors: string[],
  failedRequests: unknown[],
): Promise<RouteSnapshot> {
  const url = page.url();
  const readyState = await page.evaluate(() => document.readyState).catch(() => "unknown");
  const title = await page.title().catch(() => "");
  const dom = await readDomState(page);

  let jsHeapUsedMb: number | null = null;
  let domNodes: number | null = null;
  try {
    const client = await page.context().newCDPSession(page);
    const cdpCall = Promise.all([
      client.send("Runtime.getHeapUsage"),
      client.send("Memory.getDOMCounters"),
    ]);
    const [heap, counters] = await Promise.race([
      cdpCall,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("cdp-timeout")), 5_000),
      ),
    ]);
    jsHeapUsedMb = Math.round(heap.usedSize / (1024 * 1024));
    domNodes = counters.nodes;
  } catch {
    /* CDP optional */
  }

  return {
    route,
    url,
    readyState,
    title,
    ...dom,
    jsHeapUsedMb,
    domNodes,
    redirectCount,
    consoleErrorCount: consoleErrors.length,
    failedRequestCount: failedRequests.length,
  };
}

function isRouteSettled(snapshot: RouteSnapshot): boolean {
  if (snapshot.visibleTextLength >= MIN_VISIBLE_TEXT) return true;
  if (snapshot.hasAuthCard) return true;
  if (snapshot.shellReady) return true;
  return false;
}

test.describe.configure({ mode: "serial", timeout: IS_PROD ? 240_000 : 180_000 });

test.describe("prod recruiter multitab stuck routes", () => {
  test.use({ baseURL: PROD_BASE });

  test("1 opens 10 recruiter routes concurrently", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const pages = await Promise.all(RECRUITER_ROUTES.map((route) => openRoute(context, route)));
      expect(pages.length).toBe(10);
    });
  });

  test("2 routes settle with visible content or auth card by 30s", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const trackers = await Promise.all(
        RECRUITER_ROUTES.map(async (route) => {
          const page = await context.newPage();
          const consoleErrors: string[] = [];
          const failedRequests: unknown[] = [];
          let redirectCount = 0;
          let lastUrl = "";
          page.on("console", (msg) => {
            if (msg.type() === "error") consoleErrors.push(msg.text());
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
          await page.goto(route, { waitUntil: "domcontentloaded", timeout: ROUTE_GOTO_MS });
          return { route, page, consoleErrors, failedRequests, redirectCount: () => redirectCount };
        }),
      );

      let snapshots: RouteSnapshot[] = [];
      let elapsed = 0;
      for (const waitMs of SNAPSHOT_WAIT_MS) {
        await pageWait(waitMs - elapsed);
        elapsed = waitMs;
        snapshots = await Promise.all(
          trackers.map(({ route, page, consoleErrors, failedRequests, redirectCount }) =>
            captureSnapshot(page, route, redirectCount(), consoleErrors, failedRequests),
          ),
        );
        const settled = snapshots.filter(isRouteSettled).length;
        if (settled >= 8) break;
      }

      const settledCount = snapshots.filter(isRouteSettled).length;
      expect(settledCount).toBeGreaterThanOrEqual(8);

      const shellReadyCount = snapshots.filter((s) => s.shellReady).length;
      expect(shellReadyCount).toBeGreaterThanOrEqual(6);

      const stuckSkeleton = snapshots.filter(
        (s) => s.shellSkeleton && !s.shellReady && !s.hasAuthCard && s.visibleTextLength < MIN_VISIBLE_TEXT,
      );
      expect(stuckSkeleton.map((s) => s.route)).toEqual([]);

    for (const snap of snapshots) {
      expect(snap.redirectCount).toBeLessThanOrEqual(2);
      if (snap.jsHeapUsedMb !== null) {
        expect(snap.jsHeapUsedMb).toBeLessThan(512);
      }
    }
    });
  });

  test("3 hidden-tab simulation still reaches shell-ready", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await openRoute(context, "/recruiter/talent-radar");
      await page.evaluate(() => {
        Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
        document.dispatchEvent(new Event("visibilitychange"));
      });
      await expect(page.locator("[data-testid='lightweight-route-shell-ready']")).toBeAttached({
        timeout: 10_000,
      });
    });
  });

  test("4 concurrent tabs avoid /workspace generic bounce", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const targets = ["/recruiter/inbox", "/recruiter/pipeline", "/recruiter/analytics"] as const;
      const pages = await Promise.all(targets.map((route) => openRoute(context, route)));
      for (let i = 0; i < pages.length; i += 1) {
        const path = new URL(pages[i]!.url()).pathname.replace(/\/$/, "");
        expect(path).not.toBe("/workspace/candidate");
        expect(path).not.toBe("/workspace/recruiter");
        const loginWithNext =
          path.includes("/login") && new URL(pages[i]!.url()).searchParams.get("next") === targets[i];
        const stayed = path === targets[i];
        const auth = await pages[i]!
          .getByText(/sign in|zaloguj|auth required|wymagane logowanie/i)
          .isVisible({ timeout: 2_000 })
          .catch(() => false);
        expect(stayed || loginWithNext || auth).toBeTruthy();
      }
    });
  });
});

function pageWait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
