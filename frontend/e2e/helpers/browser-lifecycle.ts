/**
 * Playwright browser lifecycle helpers — always use these for e2e tests that
 * call browser.newContext() or open multiple tabs. Guarantees close in finally
 * even when assertions fail or tests time out.
 *
 * @example
 * test("multi-tab smoke", async ({ browser }) => {
 *   await withFreshContext(browser, async (context) => {
 *     const pages = await Promise.all(routes.map((r) => openRoute(context, r)));
 *     expect(pages.length).toBe(routes.length);
 *   });
 * });
 */
import { chromium, type Browser, type BrowserContext, type LaunchOptions, type Page } from "@playwright/test";

/** Clears storage/cookies so each test gets an isolated session. */
export async function freshIsolatedContext(browser: Browser): Promise<BrowserContext> {
  const context = await browser.newContext();
  await context.clearCookies();
  await context.addInitScript(() => {
    try {
      window.localStorage?.clear();
      window.sessionStorage?.clear();
    } catch {
      /* ignore storage access errors */
    }
  });
  return context;
}

/** Closes pages first, then the context — swallows errors from already-closed handles. */
export async function closePagesAndContext(
  pages: readonly Page[],
  context: BrowserContext,
): Promise<void> {
  await Promise.all(pages.map((page) => page.close().catch(() => {})));
  await context.close().catch(() => {});
}

/**
 * Runs `fn` with a launched browser; closes it in finally. Use in standalone scripts
 * that call chromium.launch() outside the Playwright test runner.
 */
export async function withBrowser<T>(
  fn: (browser: Browser) => Promise<T>,
  options?: LaunchOptions,
): Promise<T> {
  const browser = await chromium.launch({ headless: true, ...options });
  try {
    return await fn(browser);
  } finally {
    await browser.close().catch(() => {});
  }
}

/**
 * Runs `fn` with a fresh isolated context; closes every page and the context in finally.
 * Prefer this over manual context.close() in multitab e2e tests.
 */
export async function withFreshContext<T>(
  browser: Browser,
  fn: (context: BrowserContext) => Promise<T>,
): Promise<T> {
  const context = await freshIsolatedContext(browser);
  try {
    return await fn(context);
  } finally {
    await closePagesAndContext(context.pages(), context);
  }
}
