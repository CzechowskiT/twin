# Playwright browser lifecycle (e2e)

Multitab e2e tests must not leave `chrome-headless-shell` processes running after pass, fail, or timeout.

## Pattern

Use `withFreshContext` from `e2e/helpers/browser-lifecycle.ts` whenever a test calls `browser.newContext()` or opens multiple tabs:

```ts
import { withFreshContext } from "./helpers/browser-lifecycle";

test("multi-tab smoke", async ({ browser }) => {
  await withFreshContext(browser, async (context) => {
    const pages = await Promise.all(routes.map((r) => openRoute(context, r)));
    expect(pages.length).toBe(routes.length);
  });
});
```

`withFreshContext` closes every page and the context in a `finally` block.

## Standalone scripts

Scripts that call `chromium.launch()` directly (e.g. `scripts/prod-recruiter-multitab-stuck-routes-diagnostic.mjs`) must wrap the session in `try/finally` and call `page.close()`, `context.close()`, and `browser.close()`.

## Safety net

`playwright.config.ts` registers `scripts/playwright-global-teardown.mjs`, which SIGTERM-kills orphaned Playwright `chrome-headless-shell` processes (only those under `ms-playwright` cache paths) after the test run.

## Verify locally

```bash
pgrep -fl chrome-headless-shell | wc -l   # before
cd frontend && npm run test:p0-production-stuck-route-regression
pgrep -fl chrome-headless-shell | wc -l   # after — should not grow
```
