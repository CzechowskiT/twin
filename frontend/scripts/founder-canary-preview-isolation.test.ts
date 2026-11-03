/**
 * Unit tests for Preview canary mutation fail-closed isolation gate.
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  assertPreviewCanaryMutationAllowed,
  founderCanaryPreviewIsolationAudit,
  previewCanaryMutationsAllowed,
  upstreamIsKnownProductionApi,
} from "../src/lib/founder-canary-preview-isolation.ts";

function withEnv(overrides: Record<string, string | undefined>, fn: () => void): void {
  const prev: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(overrides)) {
    prev[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    fn();
  } finally {
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

test("known production API host is detected", () => {
  assert.equal(
    upstreamIsKnownProductionApi("https://twin-production-bcd9.up.railway.app"),
    true,
  );
  assert.equal(
    upstreamIsKnownProductionApi("https://twin-staging-example.up.railway.app"),
    false,
  );
});

test("non-preview runtime allows mutations", () => {
  withEnv(
    {
      VERCEL_ENV: "production",
      NEXT_PUBLIC_API_URL: "https://twin-production-bcd9.up.railway.app",
      FOUNDER_CANARY_PREVIEW_ISOLATION_CERT: undefined,
    },
    () => {
      assert.equal(previewCanaryMutationsAllowed(), true);
      assert.equal(assertPreviewCanaryMutationAllowed().ok, true);
    },
  );
});

test("preview + production API fail-closed even with isolation cert", () => {
  withEnv(
    {
      VERCEL_ENV: "preview",
      NEXT_PUBLIC_API_URL: "https://twin-production-bcd9.up.railway.app",
      TWIN_API_BASE_URL: undefined,
      API_URL: undefined,
      FOUNDER_CANARY_PREVIEW_ISOLATION_CERT: "1",
    },
    () => {
      assert.equal(previewCanaryMutationsAllowed(), false);
      const denied = assertPreviewCanaryMutationAllowed();
      assert.equal(denied.ok, false);
      if (!denied.ok) {
        assert.equal(denied.status, 403);
        assert.match(denied.detail, /production host/i);
      }
      const audit = founderCanaryPreviewIsolationAudit();
      assert.equal(audit.vercel_preview, true);
      assert.equal(audit.upstream_is_known_production_api, true);
      assert.equal(audit.fail_closed_guard_active, true);
      assert.equal(audit.preview_mutations_allowed, false);
    },
  );
});

test("preview without cert fail-closed even for non-prod upstream", () => {
  withEnv(
    {
      VERCEL_ENV: "preview",
      NEXT_PUBLIC_API_URL: "https://twin-staging-example.up.railway.app",
      TWIN_API_BASE_URL: undefined,
      API_URL: undefined,
      FOUNDER_CANARY_PREVIEW_ISOLATION_CERT: undefined,
    },
    () => {
      assert.equal(previewCanaryMutationsAllowed(), false);
      const denied = assertPreviewCanaryMutationAllowed();
      assert.equal(denied.ok, false);
      if (!denied.ok) assert.match(denied.detail, /ISOLATION_CERT/i);
    },
  );
});

test("preview + cert + non-prod upstream allows mutations", () => {
  withEnv(
    {
      VERCEL_ENV: "preview",
      NEXT_PUBLIC_API_URL: "https://twin-staging-example.up.railway.app",
      TWIN_API_BASE_URL: undefined,
      API_URL: undefined,
      FOUNDER_CANARY_PREVIEW_ISOLATION_CERT: "1",
    },
    () => {
      assert.equal(previewCanaryMutationsAllowed(), true);
      assert.equal(assertPreviewCanaryMutationAllowed().ok, true);
      const audit = founderCanaryPreviewIsolationAudit();
      assert.equal(audit.fail_closed_guard_active, false);
      assert.equal(audit.preview_mutations_allowed, true);
    },
  );
});

console.log("founder-canary-preview-isolation unit: ok");
