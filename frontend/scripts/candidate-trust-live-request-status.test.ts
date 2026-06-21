/** Candidate trust live request status — static guards. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { loadTrustRequestStatus } from "../src/lib/candidate-trust-request-status";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("1 trust overview wires request status panel", () => {
  const ws = readFileSync(join(root, "src/components/candidate/candidate-trust-overview-workspace.tsx"), "utf8");
  assert.match(ws, /loadTrustRequestStatus/);
  assert.match(ws, /CandidateTrustRequestStatusPanel/);
});

test("2 loadTrustRequestStatus returns export and intake counts", async () => {
  const status = await loadTrustRequestStatus();
  assert.ok(status.exportCount >= 0);
  assert.ok(status.intakeCount >= 0);
  assert.ok(["live", "demo", "partial"].includes(status.aggregateSource));
});
