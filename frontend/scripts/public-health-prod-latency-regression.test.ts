/**
 * Public-health production latency observability guard.
 * Documents SLO: canonical alias must not exceed 10s (platform timeout class).
 */
import assert from "node:assert/strict";
import test from "node:test";

import { GET } from "../src/app/api/public-health/route";

const originalFetch = globalThis.fetch;
const SLO_MS = 10_000;

function installFetch(healthMs: number, celeryMs: number) {
  globalThis.fetch = (async (input) => {
    const url = String(input);
    const delay = url.includes("celery-status") ? celeryMs : healthMs;
    await new Promise((r) => setTimeout(r, delay));
    return new Response(JSON.stringify({ status: "ok", db_ok: true, git_commit: "abc" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
}

test("public-health: parallel fetch stays under platform SLO when celery is slow", async () => {
  process.env.TWIN_API_BASE_URL = "https://upstream.invalid";
  installFetch(200, 4500);
  try {
    const start = Date.now();
    const res = await GET(new Request("http://localhost/api/public-health"));
    const elapsed = Date.now() - start;
    assert.equal(res.status, 200);
    assert.ok(elapsed < SLO_MS, `expected <${SLO_MS}ms, got ${elapsed}ms`);
    assert.ok(elapsed < 6000, `parallel max should be ~celery bound, got ${elapsed}ms`);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("public-health: liveness mode is sub-100ms with no upstream", async () => {
  let called = false;
  globalThis.fetch = (async () => {
    called = true;
    return new Response("{}");
  }) as typeof fetch;
  try {
    const start = Date.now();
    const res = await GET(new Request("http://localhost/api/public-health?mode=liveness"));
    assert.equal(res.status, 200);
    assert.equal(called, false);
    assert.ok(Date.now() - start < 100);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("public-health: response includes deploy traceability fields", async () => {
  process.env.TWIN_API_BASE_URL = "https://upstream.invalid";
  installFetch(10, 10);
  try {
    const res = await GET(new Request("http://localhost/api/public-health"));
    const body = (await res.json()) as Record<string, unknown>;
    assert.ok("frontend_commit" in body);
    assert.ok("api_commit" in body);
    assert.ok("commit_interpretation" in body);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
