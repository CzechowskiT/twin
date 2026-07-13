/**
 * Preview reachability preflight tests — public routes, mocked fetch.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  DEFAULT_PUBLIC_PATHS,
  formatReachabilityReport,
  PREVIEW_ENV_KEYS,
  resolveReachabilityTargets,
  runReachabilityPreflight,
} from "./preview-reachability-preflight";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function mockFetch(statusByUrl: Record<string, number>): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = String(input);
    const status = statusByUrl[url] ?? 404;
    return new Response("", { status });
  }) as typeof fetch;
}

test("1 prod target always included", () => {
  const targets = resolveReachabilityTargets({ NODE_ENV: "test" });
  assert.ok(targets.some((t) => t.label === "prod"));
  assert.deepEqual(targets[0].paths, [...DEFAULT_PUBLIC_PATHS]);
});

test("2 preview targets only when env set", () => {
  const withPreviews = resolveReachabilityTargets({
    NODE_ENV: "test",
    TWIN_PREVIEW_URL_448: "https://preview-448.example.com",
    TWIN_PREVIEW_URL_449: "https://preview-449.example.com/",
  });
  assert.equal(withPreviews.length, 3);
  assert.ok(withPreviews.some((t) => t.label === "preview-448"));
  assert.ok(withPreviews.some((t) => t.label === "preview-449"));
  assert.ok(!withPreviews.some((t) => t.label === "preview-450"));
});

test("3 mocked reachability — all OK", async () => {
  const targets = [{ label: "test", baseUrl: "https://example.com", paths: ["/api/public-health"] }];
  const results = await runReachabilityPreflight(
    targets,
    mockFetch({ "https://example.com/api/public-health": 200 }),
  );
  assert.equal(results.length, 1);
  assert.equal(results[0].ok, true);
  const report = formatReachabilityReport(results);
  assert.match(report, /REACHABLE/);
});

test("4 mocked reachability — failure reported", async () => {
  const targets = [{ label: "test", baseUrl: "https://example.com", paths: ["/"] }];
  const results = await runReachabilityPreflight(targets, mockFetch({ "https://example.com/": 502 }));
  assert.equal(results[0].ok, false);
  assert.match(formatReachabilityReport(results), /BLOCKED_OR_DEGRADED/);
});

test("5 no auth bypass — only public paths probed", () => {
  for (const key of PREVIEW_ENV_KEYS) {
    const targets = resolveReachabilityTargets({ NODE_ENV: "test", [key]: "https://p.example.com" });
    const preview = targets.find((t) => t.label.startsWith("preview-"));
    assert.ok(preview);
    assert.ok(!preview!.paths.some((p) => p.includes("/dashboard")));
    assert.ok(!preview!.paths.some((p) => p.includes("/recruiter/inbox")));
  }
});

test("6 handoff doc references preview preflight", () => {
  const doc = readFileSync(join(repoRoot, "docs/FOUNDER_SMOKE_HANDOFF_PR448_449_450_2026-07-13.md"), "utf8");
  assert.match(doc, /preflight:preview-reachability/);
  assert.match(doc, /TWIN_PREVIEW_URL_448/);
});

test("7 npm scripts registered", () => {
  const pkg = readFileSync(join(repoRoot, "frontend/package.json"), "utf8");
  assert.match(pkg, /test:preview-reachability-preflight/);
  assert.match(pkg, /preflight:preview-reachability/);
});
