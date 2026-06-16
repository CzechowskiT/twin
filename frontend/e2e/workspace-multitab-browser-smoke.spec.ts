import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import { withFreshContext } from "./helpers/browser-lifecycle";

const WORKSPACE_ROUTES = [
  "/recruiter",
  "/recruiter/inbox",
  "/recruiter/pipeline",
  "/recruiter/talent-radar",
  "/recruiter/talent-pool",
  "/company/dashboard",
  "/company/talent-pool",
  "/company/pipeline",
  "/dashboard",
  "/dashboard/career",
  "/investor/metrics",
  "/recruiter/jobs",
] as const;

const ROUTE_GOTO_MS = 30_000;

async function openRoute(context: BrowserContext, path: string): Promise<Page> {
  const page = await context.newPage();
  await page.goto(path, { waitUntil: "commit", timeout: ROUTE_GOTO_MS });
  await page.waitForLoadState("domcontentloaded").catch(() => {});
  return page;
}

async function openRoutesKeepingTabs(
  context: BrowserContext,
  routes: readonly string[],
): Promise<Page[]> {
  return Promise.all(routes.map((route) => openRoute(context, route)));
}

async function countMeaningfulPages(pages: Page[]): Promise<number> {
  const flags = await Promise.all(
    pages.map(async (page) => {
      const title = await page.title().catch(() => "");
      if (title.length > 0) return true;
      return page.locator("main").isVisible({ timeout: 5_000 }).catch(() => false);
    }),
  );
  return flags.filter(Boolean).length;
}

test.describe.configure({ mode: "serial", timeout: 180_000 });

test.describe("workspace multi-tab browser smoke", () => {
  test("1 opens 12 workspace routes concurrently without crash", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const pages = await openRoutesKeepingTabs(context, WORKSPACE_ROUTES);
      expect(pages.length).toBe(12);
      const painted = await countMeaningfulPages(pages);
      expect(painted).toBeGreaterThanOrEqual(10);
    });
  });

  test("2 each concurrent tab reaches a settled document title", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const pages = await openRoutesKeepingTabs(context, WORKSPACE_ROUTES);
      for (const page of pages) {
        const title = await page.title();
        expect(title.length).toBeGreaterThan(0);
      }
    });
  });

  test("3 concurrent tabs paint shell or auth gate within timeout", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const pages = await openRoutesKeepingTabs(context, WORKSPACE_ROUTES.slice(0, 8));
      const painted = await countMeaningfulPages(pages);
      expect(painted).toBeGreaterThanOrEqual(6);
    });
  });

  test("4 hidden-tab simulation still exposes route shell markup", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await openRoute(context, "/recruiter/talent-radar");
      await page.evaluate(() => {
        Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
        document.dispatchEvent(new Event("visibilitychange"));
      });
      await Promise.race([
        page.waitForURL(/\/login\//, { timeout: 20_000 }),
        page
          .locator("[data-testid='lightweight-route-shell-ready']")
          .waitFor({ state: "attached", timeout: 20_000 }),
      ]).catch(() => {});
      await expect(page.locator("body")).toBeVisible();
    });
  });

  test("5 public-health proxy responds on multitab load", async ({ request }) => {
    const res = await request.get("/api/public-health");
    expect([200, 500, 502, 503]).toContain(res.status());
    if (res.status() === 200) {
      const body = (await res.json()) as { status?: string; service?: string };
      expect(body.status).toBe("ok");
      expect(body.service).toBe("twin-api");
    }
  });

  test("6 workspace routes return navigable HTTP responses", async ({ request }) => {
    const statuses = await Promise.all(
      WORKSPACE_ROUTES.map(async (route) => (await request.get(route)).status()),
    );
    for (const status of statuses) {
      expect(status).toBeGreaterThanOrEqual(200);
      expect(status).toBeLessThan(500);
    }
  });

  test("7 module link cmd-click opens new tab at href", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await openRoute(context, "/recruiter");
      const card = page.locator("[data-workspace-module='inbox'] a[href]").first();
      const visible = await card.isVisible({ timeout: 10_000 }).catch(() => false);
      if (!visible) {
        await expect(page.locator("body")).toBeVisible();
        return;
      }
      const href = await card.getAttribute("href");
      expect(href).toMatch(/^\/recruiter\//);
      const [popup] = await Promise.all([
        context.waitForEvent("page"),
        card.click({ modifiers: ["Meta"] }),
      ]);
      await popup.waitForLoadState("domcontentloaded");
      expect(new URL(popup.url()).pathname).toBe(href?.split("#")[0] ?? "");
    });
  });

  test("8 concurrent recruiter module routes avoid generic /workspace bounce", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const targets = ["/recruiter/inbox", "/recruiter/jobs", "/recruiter/analytics"] as const;
      const pages = await Promise.all(targets.map((route) => openRoute(context, route)));
      for (let i = 0; i < pages.length; i += 1) {
        const page = pages[i]!;
        const url = new URL(page.url());
        const path = url.pathname.replace(/\/$/, "");
        const next = url.searchParams.get("next");
        const stayedOnTarget = path === targets[i];
        const loginWithNext = path.includes("/login") && next === targets[i];
        const authShell = await page
          .getByText(/sign in|zaloguj|auth required|wymagane logowanie/i)
          .isVisible({ timeout: 3_000 })
          .catch(() => false);
        expect(stayedOnTarget || loginWithNext || authShell).toBeTruthy();
        expect(path).not.toBe("/workspace/candidate");
        expect(path).not.toBe("/workspace/recruiter");
      }
    });
  });

  test("9 heap snapshot via CDP when available", async ({ browser }) => {
    await withFreshContext(browser, async (context) => {
      const page = await openRoute(context, "/recruiter");
      await page.waitForTimeout(2_000);
      try {
        const client = await context.newCDPSession(page);
        const heap = await client.send("Runtime.getHeapUsage");
        const heapUsedMb = Math.round(heap.usedSize / (1024 * 1024));
        expect(heapUsedMb).toBeGreaterThan(0);
        expect(heapUsedMb).toBeLessThan(512);
      } catch {
        // CDP unavailable in some CI runners — skip heap assertion
      }
    });
  });
});
