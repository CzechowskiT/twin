/** Candidate trust live request status — static guards. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { loadTrustRequestStatus } from "../src/lib/candidate-trust-request-status";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const TRUST_WORKSPACES = [
  "src/components/candidate/candidate-trust-overview-workspace.tsx",
  "src/components/candidate/candidate-control-center-workspace.tsx",
  "src/components/candidate/export-requests-workspace.tsx",
  "src/components/candidate/candidate-correction-request-workspace.tsx",
  "src/components/candidate/candidate-data-portability-workspace.tsx",
  "src/components/candidate/candidate-trust-audit-export-workspace.tsx",
  "src/components/candidate/candidate-consent-receipt-workspace.tsx",
  "src/components/candidate/candidate-visibility-preferences-workspace.tsx",
] as const;

test("1 trust workspaces wire request status loader", () => {
  for (const rel of TRUST_WORKSPACES) {
    assert.match(readFileSync(join(root, rel), "utf8"), /CandidateTrustRequestStatusLoader/, rel);
  }
});

test("2 loadTrustRequestStatus returns four channel counts", async () => {
  const status = await loadTrustRequestStatus();
  assert.ok(status.visibilityCount >= 0);
  assert.ok(status.exportCount >= 0);
  assert.ok(status.intakeCount >= 0);
  assert.ok(status.auditCount >= 0);
  assert.ok(["live", "demo", "partial"].includes(status.aggregateSource));
});

test("3 request status uses visibility export intake audit APIs", () => {
  const lib = readFileSync(join(root, "src/lib/candidate-trust-request-status.ts"), "utf8");
  assert.match(lib, /CANDIDATE_VISIBILITY_PREFERENCES_API_PATH/);
  assert.match(lib, /EXPORT_REQUESTS_API_PATH/);
  assert.match(lib, /REQUEST_INTAKE_API_PATH/);
  assert.match(lib, /AUDIT_EVENT_API_PATH/);
});

test("4 profile trust routes reuse dashboard workspaces", () => {
  const pairs = [
    ["src/app/dashboard/trust/overview/page.tsx", "candidate-trust-overview-workspace"],
    ["src/app/profile/trust/overview/page.tsx", "candidate-trust-overview-workspace"],
    ["src/app/dashboard/trust/controls/page.tsx", "candidate-control-center-workspace"],
    ["src/app/profile/trust/controls/page.tsx", "candidate-control-center-workspace"],
    ["src/app/dashboard/trust/audit-export/page.tsx", "candidate-trust-audit-export-workspace"],
    ["src/app/profile/trust/audit-export/page.tsx", "candidate-trust-audit-export-workspace"],
  ] as const;
  for (const [route, workspace] of pairs) {
    assert.match(readFileSync(join(root, route), "utf8"), new RegExp(workspace));
  }
});
