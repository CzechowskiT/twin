/**
 * Frontend-only stability guard for `/api/public-health`.
 *
 * Root cause (proven): sequential health + celery-status fetches, celery
 * taking ~4.3-4.5s, pushed total latency to 8-10s and tripped the platform's
 * 10s request timeout (502); an unguarded `celeryRes.json()` on a bad/empty
 * body then produced an empty 500. This guard exercises the real route
 * handler (mocked `fetch`, no network, no browser) to lock in:
 *
 * 1. health + celery are fetched in parallel (total latency ~= max, not sum)
 * 2. celery-status is soft-fail-only (timeout/non-2xx/bad JSON never 5xx's
 *    the route; it degrades to `celery: {}` + `celery_warning`)
 * 3. health is authoritative — health fetch rejection or bad JSON still 502s
 * 4. `db_ok` from upstream health always passes through unchanged (Gate E /
 *    evidence-doc backward compat)
 * 5. `?mode=liveness` short-circuits without contacting upstream at all
 */
import assert from "node:assert/strict";
import test from "node:test";

import { GET } from "../src/app/api/public-health/route";

process.env.TWIN_API_BASE_URL = "https://upstream.invalid";
delete process.env.API_URL;
delete process.env.NEXT_PUBLIC_API_URL;

type FetchArgs = Parameters<typeof fetch>;
type FetchImpl = (...args: FetchArgs) => Promise<Response>;

const originalFetch = globalThis.fetch;

function installFetch(impl: FetchImpl) {
  globalThis.fetch = impl as typeof fetch;
}

function restoreFetch() {
  globalThis.fetch = originalFetch;
}

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

function delay<T>(ms: number, value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function request(path = "/api/public-health"): Request {
  return new Request(`http://localhost${path}`);
}

test("public-health: health + celery fetched in parallel, not sequential", async () => {
  const calls: string[] = [];
  installFetch(async (input) => {
    const url = String(input);
    calls.push(url);
    if (url.includes("celery-status")) {
      return delay(60, jsonResponse({ worker_active: true }));
    }
    return delay(60, jsonResponse({ status: "ok", db_ok: true }));
  });
  try {
    const start = Date.now();
    const res = await GET(request());
    const elapsed = Date.now() - start;
    assert.equal(res.status, 200);
    // Sequential would take ~120ms; parallel should stay well under that.
    assert.ok(elapsed < 110, `expected parallel fetch (<110ms), got ${elapsed}ms`);
    assert.equal(calls.length, 2);
    const body = (await res.json()) as Record<string, unknown>;
    assert.equal(body.db_ok, true);
    assert.deepEqual(body.celery, { worker_active: true });
    assert.equal(body.celery_warning, undefined);
  } finally {
    restoreFetch();
  }
});

test("public-health: celery timeout/rejection soft-fails, health stays authoritative", async () => {
  installFetch(async (input) => {
    const url = String(input);
    if (url.includes("celery-status")) {
      throw new DOMException("The operation was aborted", "TimeoutError");
    }
    return jsonResponse({ status: "ok", db_ok: true });
  });
  try {
    const res = await GET(request());
    assert.equal(res.status, 200);
    const body = (await res.json()) as Record<string, unknown>;
    assert.equal(body.status, "ok");
    assert.equal(body.db_ok, true);
    assert.deepEqual(body.celery, {});
    assert.match(String(body.celery_warning), /celery-status unreachable/);
  } finally {
    restoreFetch();
  }
});

test("public-health: celery non-2xx soft-fails with warning, never crashes route", async () => {
  installFetch(async (input) => {
    const url = String(input);
    if (url.includes("celery-status")) {
      return new Response(null, { status: 504 });
    }
    return jsonResponse({ status: "ok", db_ok: true });
  });
  try {
    const res = await GET(request());
    assert.equal(res.status, 200);
    const body = (await res.json()) as Record<string, unknown>;
    assert.deepEqual(body.celery, {});
    assert.match(String(body.celery_warning), /celery-status returned HTTP 504/);
  } finally {
    restoreFetch();
  }
});

test("public-health: celery returning invalid/empty JSON never throws (previously empty 500)", async () => {
  installFetch(async (input) => {
    const url = String(input);
    if (url.includes("celery-status")) {
      return new Response("", { status: 200 });
    }
    return jsonResponse({ status: "ok", db_ok: true });
  });
  try {
    const res = await GET(request());
    assert.equal(res.status, 200);
    const body = (await res.json()) as Record<string, unknown>;
    assert.deepEqual(body.celery, {});
    assert.match(String(body.celery_warning), /not valid JSON/);
  } finally {
    restoreFetch();
  }
});

test("public-health: health fetch rejection (timeout) returns degraded 502, not empty 500", async () => {
  installFetch(async (input) => {
    const url = String(input);
    if (url.includes("celery-status")) {
      return jsonResponse({ worker_active: true });
    }
    throw new DOMException("The operation was aborted", "TimeoutError");
  });
  try {
    const res = await GET(request());
    assert.equal(res.status, 502);
    const body = (await res.json()) as Record<string, unknown>;
    assert.equal(body.status, "degraded");
    assert.equal(body.db_ok, false);
  } finally {
    restoreFetch();
  }
});

test("public-health: health non-ok status is proxied through unchanged", async () => {
  installFetch(async (input) => {
    const url = String(input);
    if (url.includes("celery-status")) {
      return jsonResponse({ worker_active: true });
    }
    return new Response(JSON.stringify({ detail: "unhealthy" }), {
      status: 503,
      headers: { "content-type": "application/json" },
    });
  });
  try {
    const res = await GET(request());
    assert.equal(res.status, 503);
    const body = (await res.json()) as Record<string, unknown>;
    assert.equal(body.detail, "unhealthy");
  } finally {
    restoreFetch();
  }
});

test("public-health: health returning invalid JSON degrades to 502 (no unguarded parse crash)", async () => {
  installFetch(async (input) => {
    const url = String(input);
    if (url.includes("celery-status")) {
      return jsonResponse({ worker_active: true });
    }
    return new Response("not json", {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });
  try {
    const res = await GET(request());
    assert.equal(res.status, 502);
    const body = (await res.json()) as Record<string, unknown>;
    assert.equal(body.status, "degraded");
    assert.equal(body.db_ok, false);
  } finally {
    restoreFetch();
  }
});

test("public-health: db_ok=false from upstream passes through unchanged (Gate E compat)", async () => {
  installFetch(async (input) => {
    const url = String(input);
    if (url.includes("celery-status")) {
      return jsonResponse({ worker_active: false });
    }
    return jsonResponse({ status: "degraded", db_ok: false });
  });
  try {
    const res = await GET(request());
    assert.equal(res.status, 200);
    const body = (await res.json()) as Record<string, unknown>;
    assert.equal(body.db_ok, false);
    assert.equal(body.status, "degraded");
  } finally {
    restoreFetch();
  }
});

test("public-health: ?mode=liveness short-circuits without contacting upstream", async () => {
  let fetchCalled = false;
  installFetch(async () => {
    fetchCalled = true;
    return jsonResponse({ status: "ok" });
  });
  try {
    const res = await GET(request("/api/public-health?mode=liveness"));
    assert.equal(res.status, 200);
    const body = (await res.json()) as Record<string, unknown>;
    assert.equal(body.status, "ok");
    assert.equal(body.mode, "liveness");
    assert.equal(fetchCalled, false, "liveness mode must not call upstream fetch");
  } finally {
    restoreFetch();
  }
});
