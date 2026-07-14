/** Stabilization evidence validator unit tests. */
import assert from "node:assert/strict";
import test from "node:test";

import {
  STABILIZATION_MIN_DURATION_SEC,
  STABILIZATION_SNAPSHOT_COUNT,
  type PinnedIdentities,
  type StabilizationEvidence,
  type StabilizationSnapshot,
} from "./lib/stabilization-evidence-types";
import {
  validateStabilizationEvidence,
  parseStabilizationEvidence,
} from "./lib/stabilization-evidence-validator";

function pinned(): PinnedIdentities {
  return {
    frontendCommit: "0b26cce0ac27b62e9fd5b8a2386f5fc05c494864",
    apiCommit: "ae14bfb58fc0c2db56a6fa0f417ca41c534b7960",
    dbOk: true,
    dbHead: "077_candidate_activity_timeline",
    vercelDeploymentId: "arn1::iad1::demo",
    railwayEdge: "waw1",
  };
}

function snapshot(index: number): StabilizationSnapshot {
  const id = pinned();
  return {
    index,
    label: `T+${index * 5}`,
    capturedUtc: new Date().toISOString(),
    elapsedSec: index * 300,
    identities: id,
    identityDrift: false,
    publicRoutes: [{ route: "/", layer: "public", status: 200, ok: true, ms: 100 }],
    candidateRoutes: [{ route: "/api/v1/candidates/me", layer: "candidate", status: 200, ok: true, ms: 120 }],
    recruiterRoutes: [{ route: "/recruiter/inbox", layer: "recruiter", status: 200, ok: true, ms: 130 }],
    snapshotOk: true,
  };
}

function validEvidence(overrides?: Partial<StabilizationEvidence>): StabilizationEvidence {
  return {
    schemaVersion: "1",
    runId: "29399999999",
    startedUtc: "2026-07-14T08:00:00Z",
    finishedUtc: "2026-07-14T09:00:05Z",
    durationSec: STABILIZATION_MIN_DURATION_SEC + 5,
    intervalMin: 5,
    snapshotCount: STABILIZATION_SNAPSHOT_COUNT,
    pinnedIdentities: pinned(),
    identityDriftDetected: false,
    credentialsSet: true,
    snapshots: Array.from({ length: STABILIZATION_SNAPSHOT_COUNT }, (_, i) => snapshot(i)),
    verdict: "PASS",
    failReasons: [],
    transientNotes: [],
    passThresholds: {
      minDurationSec: STABILIZATION_MIN_DURATION_SEC,
      requiredSnapshots: STABILIZATION_SNAPSHOT_COUNT,
      publicPassRate: 1,
      authenticatedPassRate: 1,
      maxIdentityDrift: 0,
    },
    ...overrides,
  };
}

test("1 valid evidence passes strict validation", () => {
  const issues = validateStabilizationEvidence(validEvidence());
  assert.equal(issues.length, 0);
});

test("2 rejects short duration in strict mode", () => {
  const issues = validateStabilizationEvidence(validEvidence({ durationSec: 54 }), { strictDuration: true });
  assert.ok(issues.some((i) => i.path === "durationSec"));
});

test("3 rejects wrong snapshot count", () => {
  const ev = validEvidence({ snapshotCount: 3, snapshots: [snapshot(0), snapshot(1), snapshot(2)] });
  const issues = validateStabilizationEvidence(ev, { strictDuration: false });
  assert.ok(issues.some((i) => i.path === "snapshotCount"));
});

test("4 rejects identity drift", () => {
  const issues = validateStabilizationEvidence(validEvidence({ identityDriftDetected: true }), {
    strictDuration: false,
  });
  assert.ok(issues.some((i) => i.path === "identityDriftDetected"));
});

test("5 rejects non-PASS verdict", () => {
  const issues = validateStabilizationEvidence(validEvidence({ verdict: "FAIL" }), { strictDuration: false });
  assert.ok(issues.some((i) => i.path === "verdict"));
});

test("6 parse round-trip", () => {
  const raw = JSON.stringify(validEvidence());
  const parsed = parseStabilizationEvidence(raw);
  assert.ok(parsed);
  assert.equal(parsed!.runId, "29399999999");
});

test("7 rejects secret leak in evidence JSON", () => {
  const ev = validEvidence();
  const leaked = JSON.stringify(ev).replace(
    "0b26cce0ac27b62e9fd5b8a2386f5fc05c494864",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature",
  );
  const parsed = parseStabilizationEvidence(leaked)!;
  const issues = validateStabilizationEvidence(parsed, { strictDuration: false });
  assert.ok(issues.some((i) => i.path === "secrets"));
});
