/** Persona audit trail surfacing — static guards. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { COMPACT_AUDIT_TRAIL_MAX_RECORDS, loadAuditEventRecords } from "../src/lib/compact-audit-trail";

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

test("2 loadAuditEventRecords returns up to five records with required fields", async () => {
  const res = await loadAuditEventRecords();
  assert.ok(res.count >= 0);
  assert.ok(res.records.length <= COMPACT_AUDIT_TRAIL_MAX_RECORDS);
  assert.ok(res.records.length >= 1);
  for (const row of res.records) {
    assert.ok(row.event_type);
    assert.ok(row.actor_persona);
    assert.ok(row.target_type);
    assert.ok(row.target_id);
    assert.ok(row.created_at);
  }
});

test("3 compact audit widget renders records without action buttons", () => {
  const widget = readFileSync(join(root, "src/components/shared/compact-audit-trail-widget.tsx"), "utf8");
  assert.match(widget, /loadAuditEventRecords/);
  assert.match(widget, /COMPACT_AUDIT_TRAIL_MARKERS\.records/);
  assert.doesNotMatch(widget, /<button|onClick|href=.*export/i);
});
