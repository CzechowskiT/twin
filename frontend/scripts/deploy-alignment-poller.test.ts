/**
 * Unit tests for Gate F deploy alignment state machine (no network).
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  decideAlignment,
  normalizeRailwayStatus,
  parseRailwayDeploymentListJson,
  pollUntilStrictAlignment,
  shasStrictlyAligned,
  TRANSIENT_RAILWAY_STATUSES,
} from "./lib/deploy-alignment-poller.ts";

const HEAD = "5fab80cfe5c13d857113bed1a7193d902345615b";
const OTHER = "e7faa0b69278043088c1b433b5edecbacbb3c0e8";

test("normalizeRailwayStatus maps known + unknown", () => {
  assert.equal(normalizeRailwayStatus("building"), "BUILDING");
  assert.equal(normalizeRailwayStatus("SUCCESS"), "SUCCESS");
  assert.equal(normalizeRailwayStatus("wat"), "UNKNOWN");
  assert.ok(TRANSIENT_RAILWAY_STATUSES.has("DEPLOYING"));
});

test("shasStrictlyAligned rejects unknown and parent mismatch", () => {
  assert.equal(shasStrictlyAligned(HEAD, HEAD, HEAD, HEAD), true);
  assert.equal(shasStrictlyAligned(HEAD, HEAD.slice(0, 12), HEAD, HEAD), true);
  assert.equal(shasStrictlyAligned(HEAD, OTHER, HEAD, HEAD), false);
  assert.equal(shasStrictlyAligned(HEAD, HEAD, "unknown", HEAD), false);
  // Parent of HEAD is NOT aligned even if "same functional lineage"
  assert.equal(shasStrictlyAligned(HEAD, OTHER, OTHER, OTHER), false);
});

test("decideAlignment waits on BUILDING/DEPLOYING (not fail)", () => {
  const d = decideAlignment({
    repo_head: HEAD,
    health: { frontend_commit: HEAD, api_commit: HEAD, worker_commit: HEAD },
    api_deploy: { service: "twin", status: "BUILDING", commitHash: HEAD },
    worker_deploy: { service: "worker", status: "SUCCESS", commitHash: HEAD },
  });
  assert.equal(d.phase, "waiting_railway");
  assert.match(d.reason, /transient|railway/i);
});

test("decideAlignment fails permanently on FAILED", () => {
  const d = decideAlignment({
    repo_head: HEAD,
    health: null,
    api_deploy: { service: "twin", status: "FAILED", commitHash: null },
    worker_deploy: { service: "worker", status: "SUCCESS", commitHash: HEAD },
  });
  assert.equal(d.phase, "failed_permanent");
});

test("decideAlignment requires exact four-way SHA — rejects FE=HEAD API=parent", () => {
  const d = decideAlignment({
    repo_head: HEAD,
    health: { frontend_commit: HEAD, api_commit: OTHER, worker_commit: OTHER },
    api_deploy: { service: "twin", status: "SUCCESS", commitHash: OTHER },
    worker_deploy: { service: "worker", status: "SUCCESS", commitHash: OTHER },
  });
  assert.equal(d.phase, "waiting_health");
  assert.match(d.reason, /sha_mismatch/);
});

test("decideAlignment aligned only when all four match + SUCCESS", () => {
  const d = decideAlignment({
    repo_head: HEAD,
    health: { frontend_commit: HEAD, api_commit: HEAD, worker_commit: HEAD },
    api_deploy: { service: "twin", status: "SUCCESS", commitHash: HEAD },
    worker_deploy: { service: "worker", status: "SUCCESS", commitHash: HEAD },
  });
  assert.equal(d.phase, "aligned");
  assert.equal(d.reason, "strict_four_way");
});

test("parseRailwayDeploymentListJson reads commitHash", () => {
  const raw = JSON.stringify([
    { status: "SUCCESS", meta: { commitHash: HEAD, branch: "cursor/phase1-monorepo-scaffold" } },
  ]);
  const snap = parseRailwayDeploymentListJson(raw, "twin");
  assert.ok(snap);
  assert.equal(snap!.status, "SUCCESS");
  assert.equal(snap!.commitHash, HEAD);
});

test("pollUntilStrictAlignment backoff reaches aligned", async () => {
  let n = 0;
  const decision = await pollUntilStrictAlignment({
    repoHead: HEAD,
    maxAttempts: 5,
    initialDelayMs: 1,
    maxDelayMs: 2,
    sleep: async () => {},
    readApi: () => {
      n += 1;
      if (n < 3) return { service: "twin", status: "DEPLOYING", commitHash: HEAD };
      return { service: "twin", status: "SUCCESS", commitHash: HEAD };
    },
    readWorker: () => ({ service: "worker", status: "SUCCESS", commitHash: HEAD }),
    fetchHealth: async () => ({
      frontend_commit: HEAD,
      api_commit: HEAD,
      worker_commit: HEAD,
    }),
  });
  assert.equal(decision.phase, "aligned");
  assert.ok(n >= 3);
});
