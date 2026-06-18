/**
 * Candidate data portability request — route, demo bundle, and hard-ban guards (24 assertions).
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  CANDIDATE_DATA_PORTABILITY_DEMO_ID,
  buildCandidateDataPortabilityBundle,
  getCandidateDataPortabilityDemo,
} from "../src/lib/candidate-data-portability-demo-data";
import {
  CANDIDATE_DATA_PORTABILITY_MARKERS,
  CANDIDATE_DATA_PORTABILITY_PAGE_MARKER,
  CANDIDATE_DATA_PORTABILITY_ROUTE,
  CANDIDATE_DATA_PORTABILITY_SAFE_LINKS,
  candidateDataPortabilityHref,
  resolveCandidateDataPortability,
} from "../src/lib/candidate-data-portability";
import { CANDIDATE_CANONICAL_ROUTES } from "../src/lib/candidate-canonical-routes";
import { JOB_PIPELINE_DEMO_ID } from "../src/lib/job-pipeline-demo-data";
import { SYSTEM_OF_RECORD_ROUTES } from "../src/lib/system-of-record-routes";
import { resolveCandidateDataPortability as resolveKernelDataPortability } from "../src/lib/system-of-record-domain";
import { dictionaries, en } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const FORBIDDEN_SHELL_FILES = [
  "src/components/lightweight-route-shell.tsx",
  "src/components/persona-workspace-gate.tsx",
  "src/components/workspace-route-layout.tsx",
  "src/app/dashboard/layout.tsx",
] as const;

const FORBIDDEN_COPY = [
  /submitted successfully/i,
  /ticket created/i,
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
  /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i,
] as const;

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("1 primary dashboard trust/portability route exists", () => {
  assert.ok(existsSync(join(root, "src/app/dashboard/trust/portability/page.tsx")));
});

test("2 profile trust/portability alias route exists", () => {
  assert.ok(existsSync(join(root, "src/app/profile/trust/portability/page.tsx")));
});

test("3 demo-candidate-001 resolves deterministic data portability record", () => {
  const record = resolveCandidateDataPortability(CANDIDATE_DATA_PORTABILITY_DEMO_ID);
  assert.ok(record);
  assert.equal(record?.id, CANDIDATE_DATA_PORTABILITY_DEMO_ID);
  assert.equal(getCandidateDataPortabilityDemo().display_name, record?.display_name);
  assert.ok(record?.pilot_labelled);
  assert.equal(record?.role_id, JOB_PIPELINE_DEMO_ID);
});

test("4 workspace renders all nine section markers", () => {
  const workspace = read("src/components/candidate/candidate-data-portability-workspace.tsx");
  assert.match(workspace, new RegExp(CANDIDATE_DATA_PORTABILITY_PAGE_MARKER));
  assert.match(workspace, /CANDIDATE_DATA_PORTABILITY_MARKERS\.header/);
  assert.match(workspace, /CANDIDATE_DATA_PORTABILITY_MARKERS\.portabilityScope/);
  assert.match(workspace, /CANDIDATE_DATA_PORTABILITY_MARKERS\.includedChecklist/);
  assert.match(workspace, /CANDIDATE_DATA_PORTABILITY_MARKERS\.excludedChecklist/);
  assert.match(workspace, /CANDIDATE_DATA_PORTABILITY_MARKERS\.draftRequest/);
  assert.match(workspace, /CANDIDATE_DATA_PORTABILITY_MARKERS\.auditTimeline/);
  assert.match(workspace, /CANDIDATE_DATA_PORTABILITY_MARKERS\.linkedModules/);
  assert.match(workspace, /CANDIDATE_DATA_PORTABILITY_MARKERS\.plannedWorkflow/);
  assert.match(workspace, /CANDIDATE_DATA_PORTABILITY_MARKERS\.boundary/);
});

test("5 invalid candidate id resolves to not-found marker not blank shell", () => {
  assert.equal(resolveCandidateDataPortability("not-a-real-candidate-id"), null);
  const workspace = read("src/components/candidate/candidate-data-portability-workspace.tsx");
  assert.match(workspace, /CANDIDATE_DATA_PORTABILITY_MARKERS\.notFound/);
  assert.match(workspace, /GuidedEmptyState/);
  assert.match(workspace, /candidateDataPortability\.notFoundTitle/);
});

test("6 portability bundle has request_type portability_preview and backend_write false", () => {
  const bundle = buildCandidateDataPortabilityBundle();
  assert.equal(bundle.request_metadata.backend_write, false);
  assert.equal(bundle.request_metadata.demo_only, true);
  assert.equal(bundle.request_metadata.legal_claim, false);
  assert.equal(bundle.request_metadata.request_type, "portability_preview");
  assert.equal(bundle.draft_request.request_type, "portability_preview");
  assert.equal(bundle.draft_request.backend_write, false);
  assert.ok(bundle.portability_scope.length >= 3);
  assert.ok(bundle.included_checklist.length >= 4);
  assert.ok(bundle.excluded_checklist.length >= 4);
  assert.ok(bundle.safety_boundaries.no_submit);
  assert.ok(bundle.safety_boundaries.no_ticket);
});

test("7 audit preview events have no backend writes", () => {
  const bundle = buildCandidateDataPortabilityBundle();
  for (const event of bundle.audit_preview_events) {
    assert.equal(event.backend_write, false);
  }
});

test("8 i18n keys exist for candidate data portability", () => {
  assert.ok(en.candidateDataPortability.pageEyebrow.length > 3);
  assert.ok(en.candidateDataPortability.submitDisabledCta.includes("disabled"));
  assert.ok(en.candidateDataPortability.boundaryBody.includes("demo-only"));
});

test("9 required safe links resolve to canonical routes", () => {
  assert.equal(candidateDataPortabilityHref(), CANDIDATE_DATA_PORTABILITY_ROUTE);
  assert.equal(CANDIDATE_DATA_PORTABILITY_SAFE_LINKS.trustCenter, CANDIDATE_CANONICAL_ROUTES.trust);
  assert.equal(CANDIDATE_DATA_PORTABILITY_SAFE_LINKS.controlCenter, CANDIDATE_CANONICAL_ROUTES.trustControls);
  assert.equal(CANDIDATE_DATA_PORTABILITY_SAFE_LINKS.exportPreview, CANDIDATE_CANONICAL_ROUTES.trustExportPreview);
  assert.equal(CANDIDATE_DATA_PORTABILITY_SAFE_LINKS.corrections, CANDIDATE_CANONICAL_ROUTES.trustCorrections);
  assert.equal(CANDIDATE_DATA_PORTABILITY_SAFE_LINKS.panel, CANDIDATE_CANONICAL_ROUTES.panel);
  assert.equal(CANDIDATE_DATA_PORTABILITY_SAFE_LINKS.profile, "/profile");
});

test("10 control center integrates DataPortabilityPanel with disabled submit", () => {
  const controlCenter = read("src/components/candidate/candidate-control-center-workspace.tsx");
  assert.match(controlCenter, /DataPortabilityPanel/);
  assert.match(controlCenter, /resolveCandidateDataPortability/);
  const panel = read("src/components/candidate/data-portability-panel.tsx");
  assert.match(panel, /disabled/);
  assert.doesNotMatch(panel, /fetch\(/);
});

test("11 SOR hub registry includes candidate data portability entry", () => {
  const entry = SYSTEM_OF_RECORD_ROUTES.find((r) => r.id === "candidate_data_portability");
  assert.ok(entry);
  assert.equal(entry?.persona, "candidate");
  assert.equal(entry?.href, "/dashboard/trust/portability");
  assert.equal(entry?.moduleFamily, "trust");
});

test("12 candidate canonical routes include trust portability", () => {
  assert.equal(CANDIDATE_CANONICAL_ROUTES.trustPortability, "/dashboard/trust/portability");
});

test("13 demo journey includes candidate data portability step", () => {
  const routes = read("src/lib/founder-led-demo-routes.ts");
  assert.match(routes, /candidateDataPortabilityHref/);
  assert.match(routes, /id: "candidate_data_portability"/);
});

test("14 executive product proof includes candidate data portability link", () => {
  const proof = read("src/lib/executive-product-proof.ts");
  assert.match(proof, /candidateDataPortabilityHref/);
  assert.match(proof, /id: "candidate_data_portability"/);
});

test("15 trust center links to data portability", () => {
  const trust = read("src/components/candidate/candidate-trust-center-workspace.tsx");
  assert.match(trust, /candidate-trust-center-data-portability-link/);
  assert.match(trust, /candidateDataPortabilityHref/);
});

test("16 export preview links to data portability", () => {
  const exportPreview = read("src/components/candidate/candidate-export-preview-workspace.tsx");
  assert.match(exportPreview, /candidate-export-preview-data-portability-link/);
  assert.match(exportPreview, /candidateDataPortabilityHref/);
});

test("17 correction request links to data portability", () => {
  const corrections = read("src/components/candidate/candidate-correction-request-workspace.tsx");
  assert.match(corrections, /candidate-correction-request-data-portability-link/);
  assert.match(corrections, /candidateDataPortabilityHref/);
});

test("18 shell/gate/fallback/layout files not modified by data portability feature", () => {
  const featurePaths = [
    "src/lib/candidate-data-portability.ts",
    "src/lib/candidate-data-portability-demo-data.ts",
    "src/components/candidate/data-portability-panel.tsx",
    "src/components/candidate/candidate-data-portability-workspace.tsx",
    "src/app/dashboard/trust/portability/page.tsx",
    "src/app/profile/trust/portability/page.tsx",
  ];
  const blob = featurePaths.map((p) => read(p)).join("\n");
  for (const forbidden of FORBIDDEN_SHELL_FILES) {
    assert.doesNotMatch(blob, new RegExp(forbidden.replace(/\//g, "\\/")));
  }
  assert.doesNotMatch(blob, /LightweightRouteShell/);
  assert.doesNotMatch(blob, /PersonaWorkspaceGate/);
  assert.doesNotMatch(blob, /WorkspaceRouteLayout/);
});

test("19 data portability copy avoids forbidden legal/outreach claims and PII emails", () => {
  const blob = [
    read("src/lib/candidate-data-portability-demo-data.ts"),
    read("src/components/candidate/data-portability-panel.tsx"),
    read("src/components/candidate/candidate-data-portability-workspace.tsx"),
    JSON.stringify(en.candidateDataPortability),
    JSON.stringify(dictionaries.pl.candidateDataPortability),
    JSON.stringify(buildCandidateDataPortabilityBundle()),
  ].join("\n");
  for (const pattern of FORBIDDEN_COPY) {
    assert.doesNotMatch(blob, pattern, `${pattern} in data portability surfaces`);
  }
});

test("20 domain kernel resolves data portability for demo-candidate-001", () => {
  const record = resolveKernelDataPortability(CANDIDATE_DATA_PORTABILITY_DEMO_ID);
  assert.ok(record);
  assert.equal(record?.bundle.request_metadata.demo_only, true);
  assert.equal(record?.bundle.request_metadata.backend_write, false);
  assert.equal(record?.bundle.request_metadata.request_type, "portability_preview");
});

test("21 included and excluded checklists are non-empty on demo record", () => {
  const record = getCandidateDataPortabilityDemo();
  assert.ok(record.included_items.length >= 4);
  assert.ok(record.excluded_items.length >= 4);
});

test("22 linked modules include trust and export preview routes", () => {
  const bundle = buildCandidateDataPortabilityBundle();
  const hrefs = bundle.linked_modules.map((m) => m.href);
  assert.ok(hrefs.some((h) => h.includes("/dashboard/trust")));
  assert.ok(hrefs.some((h) => h.includes("/export-preview")));
});

test("23 planned workflow has at least three steps", () => {
  const bundle = buildCandidateDataPortabilityBundle();
  assert.ok(bundle.planned_workflow.length >= 3);
});

test("24 draft submit button is disabled on full page", () => {
  const workspace = read("src/components/candidate/candidate-data-portability-workspace.tsx");
  assert.match(workspace, /CANDIDATE_DATA_PORTABILITY_MARKERS\.submitDisabled/);
  assert.match(workspace, /disabled/);
  assert.match(workspace, /submitDisabledCta/);
});
