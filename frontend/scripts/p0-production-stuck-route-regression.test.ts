import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

test("1 recruiter layout is server-first with client island", () => {
  const layout = read("src/app/recruiter/layout.tsx");
  const client = read("src/app/recruiter/recruiter-layout-client.tsx");
  assert.doesNotMatch(layout, /"use client"/);
  assert.match(layout, /RecruiterLayoutClient/);
  assert.match(client, /"use client"/);
  assert.match(client, /WorkspaceRouteLayout/);
});

test("2 recruiter loading.tsx provides server shell before hydration", () => {
  const loading = read("src/app/recruiter/loading.tsx");
  assert.doesNotMatch(loading, /"use client"/);
  assert.match(loading, /WorkspaceRouteSkeleton/);
});

test("3 PersonaWorkspaceGate uses Link for auth — no login replace loop", () => {
  const gate = read("src/components/persona-workspace-gate.tsx");
  assert.match(gate, /href=\{loginWithNext\}/);
  assert.doesNotMatch(gate, /router\.replace\(loginWithNext\)/);
  assert.match(gate, /personaRedirectedRef/);
  assert.match(gate, /lockAuthRedirectDestination/);
});

test("4 LightweightRouteShell paints synchronously in hidden tabs", () => {
  const shell = read("src/components/lightweight-route-shell.tsx");
  assert.match(shell, /if \(hidden\) \{\s*setPaintReady\(true\)/);
  assert.match(shell, /if \(hidden\) \{\s*return/);
  assert.match(shell, /useLayoutEffect/);
  assert.match(shell, /lightweight-route-shell-ready/);
});

test("5 deep links preserve next without generic workspace bounce", () => {
  const gate = read("src/components/persona-workspace-gate.tsx");
  const access = read("src/lib/persona-access.ts");
  assert.match(gate, /isPathAllowedForPersona\(pathname, effectivePersona\)/);
  assert.match(access, /isPersonaModuleDeepLink/);
});

test("6 public-health deduper stays bounded", () => {
  const dedupe = read("src/lib/create-request-deduper.ts");
  const client = read("src/lib/public-health-client.ts");
  assert.match(dedupe, /maxCacheEntries/);
  assert.match(dedupe, /trimToMax/);
  assert.match(client, /createRequestDeduper/);
});

test("7 recruiter inbox page keeps server Suspense boundary", () => {
  const inbox = read("src/app/recruiter/inbox/page.tsx");
  assert.doesNotMatch(inbox, /"use client"/);
  assert.match(inbox, /Suspense/);
  assert.match(inbox, /RecruiterInboxClient/);
});

test("8 package registers production stuck-route regression tests", () => {
  const pkg = read("package.json");
  assert.match(pkg, /test:p0-production-stuck-route-regression/);
  assert.match(pkg, /test:prod-recruiter-multitab-stuck-routes/);
  assert.match(pkg, /test:prod-recruiter-sequential-behavioral-smoke/);
  assert.match(pkg, /test:prod-recruiter-controlled-multitab-smoke/);
});

test("10 e2e multitab specs use withFreshContext browser lifecycle helper", () => {
  const helper = read("e2e/helpers/browser-lifecycle.ts");
  const multitab = read("e2e/workspace-multitab-browser-smoke.spec.ts");
  const prodMultitab = read("e2e/prod-recruiter-multitab-stuck-routes.spec.ts");
  const pwConfig = read("playwright.config.ts");
  const teardown = read("scripts/playwright-global-teardown.mjs");
  assert.match(helper, /export async function withFreshContext/);
  assert.match(helper, /export async function withBrowser/);
  assert.match(helper, /finally/);
  assert.match(multitab, /withFreshContext/);
  assert.match(prodMultitab, /withFreshContext/);
  assert.match(pwConfig, /globalTeardown/);
  assert.match(teardown, /chrome-headless-shell/);
  assert.match(teardown, /ms-playwright/);
});

test("11 sequential behavioral smoke uses withFreshContext and single worker", () => {
  const sequential = read("e2e/prod-recruiter-sequential-behavioral-smoke.spec.ts");
  const pkg = read("package.json");
  assert.match(sequential, /withFreshContext/);
  assert.match(sequential, /RECRUITER_ROUTES/);
  assert.match(sequential, /Performance\.getMetrics/);
  assert.match(pkg, /test:prod-recruiter-sequential-behavioral-smoke:raw/);
  assert.match(pkg, /PLAYWRIGHT_ALLOW_PROD_SMOKE/);
});

test("12 controlled multitab smoke uses withFreshContext and single worker", () => {
  const controlled = read("e2e/prod-recruiter-controlled-multitab-smoke.spec.ts");
  const pkg = read("package.json");
  assert.match(controlled, /withFreshContext/);
  assert.match(controlled, /CHECKPOINTS_MS/);
  assert.match(controlled, /staggerDelayMs/);
  assert.match(controlled, /Performance\.getMetrics/);
  assert.match(pkg, /test:prod-recruiter-controlled-multitab-smoke:raw/);
  assert.match(pkg, /--workers=1/);
});

test("9 workspace route layout wires gate + lightweight shell", () => {
  const layout = read("src/components/workspace-route-layout.tsx");
  assert.match(layout, /PersonaWorkspaceGate/);
  assert.match(layout, /LightweightRouteShell/);
  assert.match(read("src/app/recruiter/recruiter-layout-client.tsx"), /surface="recruiter"/);
});
