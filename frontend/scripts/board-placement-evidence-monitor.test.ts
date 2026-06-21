/** Board placement evidence monitor — static guards. */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  BOARD_PLACEMENT_EVIDENCE_MONITOR_MARKERS,
  BOARD_PLACEMENT_EVIDENCE_MONITOR_ROUTE,
  resolveBoardPlacementEvidenceMonitor,
} from "../src/lib/board-placement-evidence-monitor";
import { dictionaries, en } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const FORBIDDEN_COPY = [
  /employer confirmed/i,
  /invoice sent/i,
  /payment captured/i,
  /revenue recognized/i,
  /legally verified/i,
  /launch ready/i,
  /email sent/i,
  /ATS synced/i,
  /contract signed/i,
] as const;

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("1 route page exists", () => {
  assert.ok(existsSync(join(root, "src/app/board/placement-verification/page.tsx")));
});

test("2 route constant", () => {
  assert.equal(BOARD_PLACEMENT_EVIDENCE_MONITOR_ROUTE, "/board/placement-verification");
});

test("3 workspace renders all section markers", () => {
  const ws = read("src/components/board/board-placement-evidence-monitor-workspace.tsx");
  assert.match(ws, /BOARD_PLACEMENT_EVIDENCE_MONITOR_MARKERS\.evidenceMatrix/);
  assert.match(ws, /BOARD_PLACEMENT_EVIDENCE_MONITOR_MARKERS\.economicsPreview/);
  assert.match(ws, /BOARD_PLACEMENT_EVIDENCE_MONITOR_MARKERS\.riskFlags/);
  assert.match(ws, /BOARD_PLACEMENT_EVIDENCE_MONITOR_MARKERS\.blockedCapabilities/);
  assert.match(ws, /BOARD_PLACEMENT_EVIDENCE_MONITOR_MARKERS\.personaRoutes/);
  assert.match(ws, /BOARD_PLACEMENT_EVIDENCE_MONITOR_MARKERS\.launch/);
  assert.match(ws, /OperationalCrossLinksPanel/);
  assert.match(ws, /CompactAuditTrailWidget/);
});

test("4 demo record has evidence matrix and blocked capabilities", () => {
  const record = resolveBoardPlacementEvidenceMonitor();
  assert.equal(record.evidence_matrix.length, 5);
  assert.ok(record.blocked_capabilities.length >= 6);
  assert.ok(record.persona_routes.length >= 4);
  assert.ok(record.risk_flags.length >= 1);
});

test("5 persistence operations monitor links to placement evidence", () => {
  const lib = read("src/lib/board-persistence-operations-monitor.ts");
  assert.match(lib, /placement-verification/);
});

test("6 production persistence status links to placement evidence", () => {
  const lib = read("src/lib/production-persistence-status.ts");
  assert.match(lib, /placement-verification/);
});

test("7 i18n boardPlacementEvidence keys in en and pl", () => {
  assert.ok(en.boardPlacementEvidence.pageTitle);
  assert.ok(dictionaries.pl.boardPlacementEvidence.pageTitle);
});

test("8 no forbidden commercial claims in demo data or i18n", () => {
  const blob =
    read("src/lib/board-placement-evidence-monitor-demo-data.ts") +
    JSON.stringify(en.boardPlacementEvidence) +
    JSON.stringify(dictionaries.pl.boardPlacementEvidence);
  for (const pattern of FORBIDDEN_COPY) {
    assert.doesNotMatch(blob, pattern, `${pattern}`);
  }
});
