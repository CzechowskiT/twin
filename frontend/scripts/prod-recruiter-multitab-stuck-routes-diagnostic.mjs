/**
 * Production diagnostics: 10 concurrent recruiter routes with CDP heap/DOM metrics.
 * Run: PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app PLAYWRIGHT_SKIP_WEBSERVER=1 \
 *      node scripts/prod-recruiter-multitab-stuck-routes-diagnostic.mjs
 * DISABLED by default (2026-06-16): set ALLOW_PLAYWRIGHT_DIAGNOSTIC=1 to run.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "https://twin-sooty.vercel.app";
const PILOT_TOKEN = process.env.RECRUITER_INBOX_TOKEN?.trim() ?? "";
const COMPANY_SLUG = process.env.RECRUITER_DEMO_COMPANY_SLUG?.trim() ?? "nova-hiring-pl";
const OUT_DIR = join(__dirname, "..", ".diagnostics");
const SNAPSHOT_MS = [5_000, 15_000, 30_000];

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
];

function routeWithPilot(path) {
  if (!PILOT_TOKEN || !path.includes("/inbox")) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}company_slug=${encodeURIComponent(COMPANY_SLUG)}`;
}

async function capturePageState(page, label) {
  const url = page.url();
  const readyState = await page.evaluate(() => document.readyState).catch(() => "unknown");
  const title = await page.title().catch(() => "");
  const body = await page
    .evaluate(() => {
      const main = document.querySelector("main");
      const visibleText = (document.body?.innerText ?? "").replace(/\s+/g, " ").trim();
      return {
        visibleTextLength: visibleText.length,
        mainVisible: Boolean(main && main.offsetParent !== null),
        mainTextLength: (main?.innerText ?? "").replace(/\s+/g, " ").trim().length,
        shellReady: Boolean(document.querySelector("[data-testid='lightweight-route-shell-ready']")),
        shellSkeleton: Boolean(document.querySelector("[data-testid='lightweight-route-shell-skeleton']")),
        hasAuthCard: /sign in|zaloguj|auth required|wymagane logowanie|przekierowujemy/i.test(
          document.body?.innerText ?? "",
        ),
        pathname: window.location.pathname,
        nextParam: new URL(window.location.href).searchParams.get("next"),
      };
    })
    .catch(() => ({
      visibleTextLength: 0,
      mainVisible: false,
      mainTextLength: 0,
      shellReady: false,
      shellSkeleton: false,
      hasAuthCard: false,
      pathname: "",
      nextParam: null,
    }));

  let cdp = null;
  try {
    const client = await page.context().newCDPSession(page);
    const cdpCall = Promise.all([
      client.send("Runtime.getHeapUsage"),
      client.send("Memory.getDOMCounters"),
      client.send("Performance.getMetrics"),
    ]);
    const [heap, dom, perf] = await Promise.race([
      cdpCall,
      new Promise((_, reject) => setTimeout(() => reject(new Error("cdp-timeout")), 5_000)),
    ]);
    const layoutCount = perf.metrics.find((m) => m.name === "LayoutCount")?.value ?? null;
    const jsHeapUsedMb = Math.round(heap.usedSize / (1024 * 1024));
    const jsHeapTotalMb = Math.round(heap.totalSize / (1024 * 1024));
    cdp = {
      jsHeapUsedMb,
      jsHeapTotalMb,
      documents: dom.documents,
      nodes: dom.nodes,
      jsEventListeners: dom.jsEventListeners,
      layoutCount,
    };
  } catch (err) {
    cdp = { error: String(err) };
  }

  return { label, url, readyState, title, ...body, cdp };
}

async function closeBrowserSession(browser, context, pages) {
  if (pages?.length) {
    await Promise.all(pages.map(({ page }) => page?.close?.().catch(() => {})));
  }
  if (context) await context.close().catch(() => {});
  if (browser) await browser.close().catch(() => {});
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const report = {
    baseUrl: BASE_URL,
    startedAt: new Date().toISOString(),
    pilotTokenConfigured: Boolean(PILOT_TOKEN),
    companySlug: COMPANY_SLUG,
    routes: RECRUITER_ROUTES,
    snapshots: {},
    consoleErrors: {},
    failedRequests: {},
    redirectCounts: {},
    failures: [],
  };

  let browser;
  let context;
  let pages;
  try {
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext();
    await context.clearCookies();
    await context.addInitScript(() => {
      try {
        window.localStorage?.clear();
        window.sessionStorage?.clear();
      } catch {
        /* ignore */
      }
    });

    pages = await Promise.all(
      RECRUITER_ROUTES.map(async (route) => {
        const page = await context.newPage();
        const consoleErrors = [];
        const failedRequests = [];
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

        const target = routeWithPilot(route);
        await page
          .goto(new URL(target, BASE_URL).href, { waitUntil: "domcontentloaded", timeout: 30_000 })
          .catch((err) => {
            consoleErrors.push(`goto:${String(err)}`);
          });
        return { route, page, consoleErrors, failedRequests, redirectCount: () => redirectCount };
      }),
    );

    for (const ms of SNAPSHOT_MS) {
      await new Promise((r) =>
        setTimeout(r, ms === SNAPSHOT_MS[0] ? ms : ms - SNAPSHOT_MS[SNAPSHOT_MS.indexOf(ms) - 1]),
      );
      report.snapshots[`${ms}ms`] = [];
      for (const { route, page } of pages) {
        report.snapshots[`${ms}ms`].push(await capturePageState(page, route));
      }
    }

    for (const { route, page, consoleErrors, failedRequests, redirectCount } of pages) {
      report.consoleErrors[route] = consoleErrors.slice(0, 20);
      report.failedRequests[route] = failedRequests.slice(0, 20);
      report.redirectCounts[route] = redirectCount();

      const final = report.snapshots["30000ms"].find((s) => s.label === route);
      const stuck =
        final &&
        final.visibleTextLength < 40 &&
        !final.hasAuthCard &&
        !final.shellReady &&
        !final.mainVisible;
      if (stuck) {
        report.failures.push(route);
        const shot = join(OUT_DIR, `failure-${route.replace(/\//g, "_")}.png`);
        await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
      }
    }

    report.finishedAt = new Date().toISOString();
    const outPath = join(OUT_DIR, "prod-recruiter-multitab-diagnostic.json");
    writeFileSync(outPath, JSON.stringify(report, null, 2));
    console.log(
      JSON.stringify({ outPath, failures: report.failures, snapshot30000: report.snapshots["30000ms"] }, null, 2),
    );

    if (report.failures.length > 0) process.exitCode = 1;
  } finally {
    await closeBrowserSession(browser, context, pages);
  }
}


if (process.env.ALLOW_PLAYWRIGHT_DIAGNOSTIC !== "1") {
  console.error(
    "prod-recruiter-multitab-stuck-routes-diagnostic.mjs is disabled (2026-06-16 CPU incident). Set ALLOW_PLAYWRIGHT_DIAGNOSTIC=1 to run.",
  );
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
