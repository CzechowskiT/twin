/**
 * Security headers contract for the Next.js frontend.
 *
 * Read-only structural check on `frontend/next.config.ts`. We do **not**
 * boot the server, we do **not** hit production — this is a unit test
 * over the static config object so any regression on CSP / Permissions-
 * Policy / Frame-Options shape lands in `npm run`, not in a 3 a.m.
 * page from a CSP report mailbox.
 *
 * Pairs with `docs/P1_CSP_ENFORCEMENT_PLAN_2026-05-27.md`.
 */

import assert from "node:assert/strict";

import nextConfig from "../next.config";

type HeaderEntry = { key: string; value: string };

async function configuredHeaders(): Promise<{ source: string; headers: HeaderEntry[] }[]> {
  const fn = nextConfig.headers;
  if (typeof fn !== "function") {
    throw new Error("next.config.ts is missing the `headers()` async function");
  }
  const groups = await fn();
  // Normalise the Next.js Header shape down to the entries we care about.
  return groups.map((group) => ({
    source: group.source,
    headers: group.headers.map((h: { key: string; value: string }) => ({
      key: h.key,
      value: h.value,
    })),
  }));
}

function pickHeader(entries: HeaderEntry[], key: string): HeaderEntry | undefined {
  const target = key.toLowerCase();
  return entries.find((e) => e.key.toLowerCase() === target);
}

function run(name: string, fn: () => Promise<void> | void) {
  Promise.resolve()
    .then(() => fn())
    .then(() => console.log(`ok ${name}`))
    .catch((err) => {
      console.error(`fail ${name}`, err);
      process.exitCode = 1;
    });
}

run("headers() exists and covers all paths", async () => {
  const groups = await configuredHeaders();
  assert.ok(groups.length >= 1, "expected at least one header group");
  const all = groups.find((g) => g.source === "/:path*");
  assert.ok(all, "expected a /:path* group covering all routes");
});

run("X-Frame-Options is DENY", async () => {
  const groups = await configuredHeaders();
  const all = groups[0];
  const h = pickHeader(all.headers, "X-Frame-Options");
  assert.equal(h?.value, "DENY");
});

run("X-Content-Type-Options is nosniff", async () => {
  const groups = await configuredHeaders();
  const all = groups[0];
  const h = pickHeader(all.headers, "X-Content-Type-Options");
  assert.equal(h?.value, "nosniff");
});

run("Referrer-Policy is strict-origin-when-cross-origin", async () => {
  const groups = await configuredHeaders();
  const all = groups[0];
  const h = pickHeader(all.headers, "Referrer-Policy");
  assert.equal(h?.value, "strict-origin-when-cross-origin");
});

run("Permissions-Policy disables camera/mic/geo/interest-cohort", async () => {
  const groups = await configuredHeaders();
  const all = groups[0];
  const h = pickHeader(all.headers, "Permissions-Policy");
  const v = h?.value ?? "";
  assert.match(v, /camera=\(\)/);
  assert.match(v, /microphone=\(\)/);
  assert.match(v, /geolocation=\(\)/);
  assert.match(v, /interest-cohort=\(\)/);
});

run("CSP is currently in report-only mode (P1 baseline)", async () => {
  const groups = await configuredHeaders();
  const all = groups[0];
  // P1: we ship `Content-Security-Policy-Report-Only`. Enforce flip happens
  // in a later slice (see docs/P1_CSP_ENFORCEMENT_PLAN_2026-05-27.md).
  const reportOnly = pickHeader(all.headers, "Content-Security-Policy-Report-Only");
  const enforce = pickHeader(all.headers, "Content-Security-Policy");
  assert.ok(reportOnly, "expected CSP Report-Only to be configured in P1");
  assert.ok(!enforce, "did not expect an enforce-mode CSP yet (P1 baseline)");
});

run("CSP directives are present and explicit", async () => {
  const groups = await configuredHeaders();
  const all = groups[0];
  const csp =
    pickHeader(all.headers, "Content-Security-Policy-Report-Only")?.value ??
    pickHeader(all.headers, "Content-Security-Policy")?.value ??
    "";
  for (const d of [
    "default-src",
    "script-src",
    "style-src",
    "img-src",
    "font-src",
    "connect-src",
    "frame-src",
    "frame-ancestors",
    "base-uri",
    "form-action",
  ]) {
    assert.match(csp, new RegExp(`(^|;\\s*)${d}\\s`), `CSP missing directive: ${d}`);
  }
});

run("frame-ancestors is locked to 'none'", async () => {
  const groups = await configuredHeaders();
  const all = groups[0];
  const csp =
    pickHeader(all.headers, "Content-Security-Policy-Report-Only")?.value ??
    pickHeader(all.headers, "Content-Security-Policy")?.value ??
    "";
  assert.match(csp, /frame-ancestors\s+'none'/);
});

run("CSP report-uri points at the backend sink", async () => {
  const groups = await configuredHeaders();
  const all = groups[0];
  const csp =
    pickHeader(all.headers, "Content-Security-Policy-Report-Only")?.value ??
    pickHeader(all.headers, "Content-Security-Policy")?.value ??
    "";
  // The /api/v1 prefix is proxied to the FastAPI csp_report endpoint by
  // src/app/api/v1/[[...path]]/route.ts. Burn-in only — header stays
  // Report-Only and the endpoint is no-op-safe (HTTP 204).
  assert.match(csp, /report-uri\s+\/api\/v1\/csp-report/);
});

run("CSP uses narrowed host allowlists (no https: wildcards)", async () => {
  const groups = await configuredHeaders();
  const all = groups[0];
  const csp =
    pickHeader(all.headers, "Content-Security-Policy-Report-Only")?.value ??
    pickHeader(all.headers, "Content-Security-Policy")?.value ??
    "";
  for (const directive of ["img-src", "font-src", "connect-src"]) {
    const m = csp.match(new RegExp(`${directive}\\s+([^;]+)`));
    assert.ok(m, `missing ${directive}`);
    // Scheme wildcard `https:` (any HTTPS origin) must not remain after narrowing.
    assert.doesNotMatch(
      m![1],
      /(?:^|\s)https:(?:\s|$)/,
      `${directive} still contains permissive https: wildcard`,
    );
  }
});

run("CSP frame-src allows YouTube nocookie embed", async () => {
  const groups = await configuredHeaders();
  const all = groups[0];
  const csp =
    pickHeader(all.headers, "Content-Security-Policy-Report-Only")?.value ??
    pickHeader(all.headers, "Content-Security-Policy")?.value ??
    "";
  assert.match(csp, /frame-src\s+https:\/\/www\.youtube-nocookie\.com/);
});

run("CSP script-src allows Plausible when analytics consent is granted", async () => {
  const groups = await configuredHeaders();
  const all = groups[0];
  const csp =
    pickHeader(all.headers, "Content-Security-Policy-Report-Only")?.value ??
    pickHeader(all.headers, "Content-Security-Policy")?.value ??
    "";
  assert.match(csp, /script-src[^;]*https:\/\/plausible\.io/);
  assert.match(csp, /connect-src[^;]*https:\/\/us\.i\.posthog\.com/);
});

run("CSP connect-src allows production Railway API host", async () => {
  const groups = await configuredHeaders();
  const all = groups[0];
  const csp =
    pickHeader(all.headers, "Content-Security-Policy-Report-Only")?.value ??
    pickHeader(all.headers, "Content-Security-Policy")?.value ??
    "";
  assert.match(
    csp,
    /connect-src[^;]*https:\/\/twin-production-bcd9\.up\.railway\.app/,
  );
});

setTimeout(() => {
  if (process.exitCode) process.exit(process.exitCode);
}, 200);
