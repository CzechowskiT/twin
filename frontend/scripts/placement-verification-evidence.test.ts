/**
 * Placement verification operating evidence — route, copy, and resolver guards.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  PLACEMENT_VERIFICATION_EVIDENCE_CROSS_LINKS,
  PLACEMENT_VERIFICATION_EVIDENCE_DOC,
  PLACEMENT_VERIFICATION_EVIDENCE_MARKERS,
  resolvePlacementVerificationEvidence,
} from "../src/lib/placement-verification-evidence";
import { PLACEMENT_EVENTS_API_PATH } from "../src/lib/placement-events-live";
import { dictionaries, en } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const FORBIDDEN_COPY = [
  /invoice sent/i,
  /payment captured/i,
  /revenue recognized/i,
  /legally verified/i,
  /employer confirmed/i,
  /calendar write/i,
  /event created/i,
] as const;

const PLACEMENT_ROUTES = [
  "src/app/dashboard/placement-verification/page.tsx",
  "src/app/profile/placement-verification/page.tsx",
  "src/app/recruiter/placement-verification/page.tsx",
  "src/app/company/placement-verification/page.tsx",
  "src/app/board/placement-verification/page.tsx",
] as const;

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("1 evidence doc exists", () => {
  assert.ok(existsSync(join(root, "..", PLACEMENT_VERIFICATION_EVIDENCE_DOC)));
});

test("2 all five persona routes exist", () => {
  for (const route of PLACEMENT_ROUTES) {
    assert.ok(existsSync(join(root, route)), route);
  }
});

test("3 shared evidence panel wired on persona workspaces", () => {
  for (const ws of [
    "src/components/candidate/candidate-placement-verification-preview-workspace.tsx",
    "src/components/recruiter/recruiter-placement-verification-checklist-workspace.tsx",
    "src/components/company/company-placement-verification-checklist-workspace.tsx",
    "src/components/board/board-placement-evidence-monitor-workspace.tsx",
  ]) {
    const src = read(ws);
    assert.match(src, /PlacementVerificationEvidencePanel/, ws);
    assert.match(src, /placement-verification-evidence-panel/, ws);
  }
});

test("4 resolver returns canonical timeline endpoint", () => {
  const bundle = resolvePlacementVerificationEvidence();
  assert.ok(bundle);
  assert.equal(bundle?.timeline_endpoint, PLACEMENT_EVENTS_API_PATH);
  assert.match(bundle?.timeline_endpoint ?? "", /\/api\/v1\/placement-events/);
});

test("5 cross-links include calendar readiness and trust", () => {
  const hrefs = PLACEMENT_VERIFICATION_EVIDENCE_CROSS_LINKS.map((l) => l.href);
  assert.ok(hrefs.some((h) => h.includes("calendar/readiness")));
  assert.ok(hrefs.some((h) => h.includes("trust/overview")));
  assert.ok(hrefs.some((h) => h.includes("operational-work-queue")));
});

test("6 i18n keys present in en and pl", () => {
  assert.ok(en.placementVerificationEvidence.panelTitle);
  assert.ok(dictionaries.pl.placementVerificationEvidence.panelTitle);
  assert.ok(en.operatingEvidence.colCapability);
});

test("7 no forbidden billing or write copy", () => {
  const blob =
    read("src/components/shared/placement-verification-evidence-panel.tsx") +
    JSON.stringify(en.placementVerificationEvidence) +
    JSON.stringify(dictionaries.pl.placementVerificationEvidence);
  for (const pattern of FORBIDDEN_COPY) {
    assert.doesNotMatch(blob, pattern, `${pattern}`);
  }
});

test("8 package.json exposes evidence browser and verify scripts", () => {
  const pkg = read("package.json");
  assert.match(pkg, /test:placement-verification-evidence/);
  assert.match(pkg, /test:placement-verification-evidence-browser/);
  assert.match(pkg, /verify:prod-placement-verification-evidence/);
});

test("9 panel marker constant", () => {
  assert.equal(PLACEMENT_VERIFICATION_EVIDENCE_MARKERS.panel, "placement-verification-evidence-panel");
});
