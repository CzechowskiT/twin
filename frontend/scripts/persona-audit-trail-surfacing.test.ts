/** Persona audit trail surfacing — static guards. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { loadAuditEventCount } from "../src/lib/compact-audit-trail";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const SURFACES = [
  "src/components/recruiter/recruiter-daily-operating-cockpit-workspace.tsx",
  "src/components/company/company-hiring-command-center-workspace.tsx",
  "src/components/board/board-persistence-operations-monitor-workspace.tsx",
  "src/components/candidate/candidate-trust-overview-workspace.tsx",
] as const;

test("1 compact audit widget on all persona surfaces", () => {
  for (const rel of SURFACES) {
    assert.match(readFileSync(join(root, rel), "utf8"), /CompactAuditTrailWidget/, rel);
  }
});

test("2 loadAuditEventCount returns count", async () => {
  const res = await loadAuditEventCount();
  assert.ok(res.count >= 0);
});
