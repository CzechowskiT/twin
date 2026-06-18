/**
 * Candidate Control Center — route, demo data, and hard-ban guards (18 assertions).
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  CANDIDATE_CONTROL_CENTER_DEMO_ID,
  getCandidateControlCenterDemo,
} from "../src/lib/candidate-control-center-demo-data";
import {
  CANDIDATE_CONTROL_CENTER_MARKERS,
  CANDIDATE_CONTROL_CENTER_PAGE_MARKER,
  CANDIDATE_CONTROL_CENTER_ROUTE,
  CANDIDATE_CONTROL_CENTER_SAFE_LINKS,
  candidateControlCenterHref,
  resolveCandidateControlCenter,
} from "../src/lib/candidate-control-center";
import { CANDIDATE_CANONICAL_ROUTES } from "../src/lib/candidate-canonical-routes";
import { JOB_PIPELINE_DEMO_ID } from "../src/lib/job-pipeline-demo-data";
import { SYSTEM_OF_RECORD_ROUTES } from "../src/lib/system-of-record-routes";
import { resolveCandidateControlCenter as resolveKernelControlCenter } from "../src/lib/system-of-record-domain";
import { dictionaries, en } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const FORBIDDEN_SHELL_FILES = [
  "src/components/lightweight-route-shell.tsx",
  "src/components/persona-workspace-gate.tsx",
  "src/components/workspace-route-layout.tsx",
  "src/app/dashboard/layout.tsx",
] as const;

const FORBIDDEN_COPY = [
  /GDPR compliant/i,
  /legally compliant/i,
  /fully compliant/i,
  /automatic outreach/i,
  /automatic application/i,
  /\bwe sent\b/i,
  /email sent/i,
  /deleted successfully/i,
  /AI decided/i,
  /AI decides/i,
] as const;

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("1 primary dashboard trust/controls route exists", () => {
  assert.ok(existsSync(join(root, "src/app/dashboard/trust/controls/page.tsx")));
});

test("2 profile trust/controls alias route exists", () => {
  assert.ok(existsSync(join(root, "src/app/profile/trust/controls/page.tsx")));
});

test("3 demo-candidate-001 resolves deterministic control center record", () => {
  const record = resolveCandidateControlCenter(CANDIDATE_CONTROL_CENTER_DEMO_ID);
  assert.ok(record);
  assert.equal(record?.id, CANDIDATE_CONTROL_CENTER_DEMO_ID);
  assert.equal(getCandidateControlCenterDemo().display_name, record?.display_name);
  assert.ok(record?.pilot_labelled);
  assert.equal(record?.role_id, JOB_PIPELINE_DEMO_ID);
});

test("4 workspace renders all ten section markers", () => {
  const workspace = read("src/components/candidate/candidate-control-center-workspace.tsx");
  assert.match(workspace, new RegExp(CANDIDATE_CONTROL_CENTER_PAGE_MARKER));
  assert.match(workspace, /CANDIDATE_CONTROL_CENTER_MARKERS\.header/);
  assert.match(workspace, /CANDIDATE_CONTROL_CENTER_MARKERS\.visibilityControls/);
  assert.match(workspace, /CANDIDATE_CONTROL_CENTER_MARKERS\.exportPreview/);
  assert.match(workspace, /CANDIDATE_CONTROL_CENTER_MARKERS\.correctionRequest/);
  assert.match(workspace, /CANDIDATE_CONTROL_CENTER_MARKERS\.consentReview/);
  assert.match(workspace, /CANDIDATE_CONTROL_CENTER_MARKERS\.communicationPreferences/);
  assert.match(workspace, /CANDIDATE_CONTROL_CENTER_MARKERS\.appMatchTransparency/);
  assert.match(workspace, /CANDIDATE_CONTROL_CENTER_MARKERS\.revokeDeletePlanned/);
  assert.match(workspace, /CANDIDATE_CONTROL_CENTER_MARKERS\.auditTimeline/);
  assert.match(workspace, /CANDIDATE_CONTROL_CENTER_MARKERS\.boundary/);
});

test("5 invalid candidate id resolves to not-found marker not blank shell", () => {
  assert.equal(resolveCandidateControlCenter("not-a-real-candidate-id"), null);
  const workspace = read("src/components/candidate/candidate-control-center-workspace.tsx");
  assert.match(workspace, /CANDIDATE_CONTROL_CENTER_MARKERS\.notFound/);
  assert.match(workspace, /GuidedEmptyState/);
  assert.match(workspace, /candidateControlCenter\.notFoundTitle/);
});

test("6 export delete revoke disabled — no backend mutation", () => {
  const workspace = read("src/components/candidate/candidate-control-center-workspace.tsx");
  assert.match(workspace, /disabled/);
  assert.match(workspace, /candidateControlCenter\.exportCta/);
  assert.match(workspace, /candidateControlCenter\.deleteCta/);
  assert.match(workspace, /candidateControlCenter\.revokeCta/);
  assert.doesNotMatch(workspace, /fetch\(/);
});

test("7 audit timeline has no backend writes", () => {
  const record = getCandidateControlCenterDemo();
  for (const event of record.audit_timeline) {
    assert.equal(event.backend_write, false);
  }
});

test("8 i18n keys exist for candidate control center", () => {
  assert.ok(en.candidateControlCenter.pageEyebrow.length > 3);
  assert.ok(en.candidateControlCenter.notLegalAdvice.includes("not legal advice"));
  assert.ok(en.candidateControlCenter.boundaryBody.includes("Human decision"));
});

test("9 required safe links resolve to canonical routes", () => {
  assert.equal(candidateControlCenterHref(), CANDIDATE_CONTROL_CENTER_ROUTE);
  assert.equal(CANDIDATE_CONTROL_CENTER_SAFE_LINKS.trustCenter, CANDIDATE_CANONICAL_ROUTES.trust);
  assert.equal(CANDIDATE_CONTROL_CENTER_SAFE_LINKS.panel, CANDIDATE_CANONICAL_ROUTES.panel);
  assert.equal(CANDIDATE_CONTROL_CENTER_SAFE_LINKS.jobs, "/dashboard/jobs");
  assert.equal(CANDIDATE_CONTROL_CENTER_SAFE_LINKS.matches, "/dashboard/matches");
  assert.equal(CANDIDATE_CONTROL_CENTER_SAFE_LINKS.profile, "/profile");
  assert.equal(CANDIDATE_CONTROL_CENTER_SAFE_LINKS.gdprConsent, "/consent/gdpr");
});

test("10 workspace includes required navigation links", () => {
  const workspace = read("src/components/candidate/candidate-control-center-workspace.tsx");
  assert.match(workspace, /candidate-control-center-trust-link/);
  assert.match(workspace, /candidate-control-center-profile-link/);
  assert.match(workspace, /candidate-control-center-jobs-link/);
  assert.match(workspace, /candidate-control-center-matches-link/);
});

test("11 SOR hub registry includes candidate control center entry", () => {
  const entry = SYSTEM_OF_RECORD_ROUTES.find((r) => r.id === "candidate_control_center");
  assert.ok(entry);
  assert.equal(entry?.persona, "candidate");
  assert.equal(entry?.href, "/dashboard/trust/controls");
  assert.equal(entry?.moduleFamily, "trust");
});

test("12 candidate canonical routes include trust controls", () => {
  assert.equal(CANDIDATE_CANONICAL_ROUTES.trustControls, "/dashboard/trust/controls");
});

test("13 demo journey includes candidate control center step", () => {
  const routes = read("src/lib/founder-led-demo-routes.ts");
  assert.match(routes, /candidateControlCenterHref/);
  assert.match(routes, /id: "candidate_control_center"/);
});

test("14 executive product proof includes candidate control center link", () => {
  const proof = read("src/lib/executive-product-proof.ts");
  assert.match(proof, /candidateControlCenterHref/);
  assert.match(proof, /id: "candidate_control_center"/);
});

test("15 candidate workspace subnav links to control center", () => {
  const subnav = read("src/components/candidate-workspace-subnav.tsx");
  assert.match(subnav, /\/dashboard\/trust\/controls/);
});

test("16 trust center links to control center", () => {
  const trust = read("src/components/candidate/candidate-trust-center-workspace.tsx");
  assert.match(trust, /candidate-trust-center-controls-link/);
  assert.match(trust, /candidateControlCenterHref/);
});

test("17 shell/gate/fallback/layout files not modified by control center feature", () => {
  const featurePaths = [
    "src/lib/candidate-control-center.ts",
    "src/lib/candidate-control-center-demo-data.ts",
    "src/components/candidate/candidate-control-center-workspace.tsx",
    "src/app/dashboard/trust/controls/page.tsx",
    "src/app/profile/trust/controls/page.tsx",
  ];
  const blob = featurePaths.map((p) => read(p)).join("\n");
  for (const forbidden of FORBIDDEN_SHELL_FILES) {
    assert.doesNotMatch(blob, new RegExp(forbidden.replace(/\//g, "\\/")));
  }
  assert.doesNotMatch(blob, /LightweightRouteShell/);
  assert.doesNotMatch(blob, /PersonaWorkspaceGate/);
  assert.doesNotMatch(blob, /WorkspaceRouteLayout/);
});

test("18 control center copy avoids forbidden legal/outreach claims", () => {
  const blob = [
    read("src/lib/candidate-control-center-demo-data.ts"),
    read("src/components/candidate/candidate-control-center-workspace.tsx"),
    JSON.stringify(en.candidateControlCenter),
    JSON.stringify(dictionaries.pl.candidateControlCenter),
  ].join("\n");
  for (const pattern of FORBIDDEN_COPY) {
    assert.doesNotMatch(blob, pattern, `${pattern} in control center surfaces`);
  }
});

test("19 domain kernel resolves control center for demo-candidate-001", () => {
  const record = resolveKernelControlCenter(CANDIDATE_CONTROL_CENTER_DEMO_ID);
  assert.ok(record);
  assert.equal(record?.revoke_disabled, true);
  assert.equal(record?.delete_disabled, true);
});

test("20 docs file exists for candidate control center", () => {
  assert.ok(existsSync(join(root, "..", "docs/CANDIDATE_CONTROL_CENTER_2026-06-18.md")));
});

test("21 package.json exposes control center test scripts", () => {
  const pkg = read("package.json");
  assert.match(pkg, /test:candidate-control-center/);
  assert.match(pkg, /test:candidate-control-center-browser/);
});
