/**
 * Candidate correction request workflow — route, demo bundle, and hard-ban guards (20 assertions).
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  CANDIDATE_CORRECTION_REQUEST_DEMO_ID,
  buildCandidateCorrectionRequestBundle,
  getCandidateCorrectionRequestDemo,
} from "../src/lib/candidate-correction-request-demo-data";
import {
  CANDIDATE_CORRECTION_REQUEST_MARKERS,
  CANDIDATE_CORRECTION_REQUEST_PAGE_MARKER,
  CANDIDATE_CORRECTION_REQUEST_ROUTE,
  CANDIDATE_CORRECTION_REQUEST_SAFE_LINKS,
  candidateCorrectionRequestHref,
  resolveCandidateCorrectionRequest,
} from "../src/lib/candidate-correction-request";
import { CANDIDATE_CANONICAL_ROUTES } from "../src/lib/candidate-canonical-routes";
import { JOB_PIPELINE_DEMO_ID } from "../src/lib/job-pipeline-demo-data";
import { SYSTEM_OF_RECORD_ROUTES } from "../src/lib/system-of-record-routes";
import { resolveCandidateCorrectionRequest as resolveKernelCorrectionRequest } from "../src/lib/system-of-record-domain";
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

test("1 primary dashboard trust/corrections route exists", () => {
  assert.ok(existsSync(join(root, "src/app/dashboard/trust/corrections/page.tsx")));
});

test("2 profile trust/corrections alias route exists", () => {
  assert.ok(existsSync(join(root, "src/app/profile/trust/corrections/page.tsx")));
});

test("3 demo-candidate-001 resolves deterministic correction request record", () => {
  const record = resolveCandidateCorrectionRequest(CANDIDATE_CORRECTION_REQUEST_DEMO_ID);
  assert.ok(record);
  assert.equal(record?.id, CANDIDATE_CORRECTION_REQUEST_DEMO_ID);
  assert.equal(getCandidateCorrectionRequestDemo().display_name, record?.display_name);
  assert.ok(record?.pilot_labelled);
  assert.equal(record?.role_id, JOB_PIPELINE_DEMO_ID);
});

test("4 workspace renders all nine section markers", () => {
  const workspace = read("src/components/candidate/candidate-correction-request-workspace.tsx");
  assert.match(workspace, new RegExp(CANDIDATE_CORRECTION_REQUEST_PAGE_MARKER));
  assert.match(workspace, /CANDIDATE_CORRECTION_REQUEST_MARKERS\.header/);
  assert.match(workspace, /CANDIDATE_CORRECTION_REQUEST_MARKERS\.categories/);
  assert.match(workspace, /CANDIDATE_CORRECTION_REQUEST_MARKERS\.draftRequest/);
  assert.match(workspace, /CANDIDATE_CORRECTION_REQUEST_MARKERS\.evidence/);
  assert.match(workspace, /CANDIDATE_CORRECTION_REQUEST_MARKERS\.review/);
  assert.match(workspace, /CANDIDATE_CORRECTION_REQUEST_MARKERS\.auditPreview/);
  assert.match(workspace, /CANDIDATE_CORRECTION_REQUEST_MARKERS\.linkedModules/);
  assert.match(workspace, /CANDIDATE_CORRECTION_REQUEST_MARKERS\.plannedWorkflow/);
  assert.match(workspace, /CANDIDATE_CORRECTION_REQUEST_MARKERS\.boundary/);
});

test("5 invalid candidate id resolves to not-found marker not blank shell", () => {
  assert.equal(resolveCandidateCorrectionRequest("not-a-real-candidate-id"), null);
  const workspace = read("src/components/candidate/candidate-correction-request-workspace.tsx");
  assert.match(workspace, /CANDIDATE_CORRECTION_REQUEST_MARKERS\.notFound/);
  assert.match(workspace, /GuidedEmptyState/);
  assert.match(workspace, /candidateCorrectionRequest\.notFoundTitle/);
});

test("6 correction bundle has six categories and required metadata flags", () => {
  const bundle = buildCandidateCorrectionRequestBundle();
  assert.equal(bundle.request_metadata.backend_write, false);
  assert.equal(bundle.request_metadata.demo_only, true);
  assert.equal(bundle.request_metadata.legal_claim, false);
  assert.equal(bundle.categories.length, 6);
  assert.ok(bundle.draft_fields.length >= 2);
  assert.ok(bundle.evidence_attachments.length > 0);
  assert.ok(bundle.review_checkpoints.length > 0);
  assert.ok(bundle.safety_boundaries.no_submit);
  assert.ok(bundle.safety_boundaries.no_ticket);
});

test("7 audit preview events have no backend writes", () => {
  const bundle = buildCandidateCorrectionRequestBundle();
  for (const event of bundle.audit_preview_events) {
    assert.equal(event.backend_write, false);
  }
});

test("8 i18n keys exist for candidate correction request", () => {
  assert.ok(en.candidateCorrectionRequest.pageEyebrow.length > 3);
  assert.ok(en.candidateCorrectionRequest.submitDisabledCta.includes("disabled"));
  assert.ok(en.candidateCorrectionRequest.boundaryBody.includes("demo-only"));
});

test("9 required safe links resolve to canonical routes", () => {
  assert.equal(candidateCorrectionRequestHref(), CANDIDATE_CORRECTION_REQUEST_ROUTE);
  assert.equal(CANDIDATE_CORRECTION_REQUEST_SAFE_LINKS.trustCenter, CANDIDATE_CANONICAL_ROUTES.trust);
  assert.equal(CANDIDATE_CORRECTION_REQUEST_SAFE_LINKS.controlCenter, CANDIDATE_CANONICAL_ROUTES.trustControls);
  assert.equal(CANDIDATE_CORRECTION_REQUEST_SAFE_LINKS.exportPreview, CANDIDATE_CANONICAL_ROUTES.trustExportPreview);
  assert.equal(CANDIDATE_CORRECTION_REQUEST_SAFE_LINKS.panel, CANDIDATE_CANONICAL_ROUTES.panel);
  assert.equal(CANDIDATE_CORRECTION_REQUEST_SAFE_LINKS.profile, "/profile");
});

test("10 control center integrates CorrectionRequestPanel with disabled submit", () => {
  const controlCenter = read("src/components/candidate/candidate-control-center-workspace.tsx");
  assert.match(controlCenter, /CorrectionRequestPanel/);
  assert.match(controlCenter, /resolveCandidateCorrectionRequest/);
  const panel = read("src/components/candidate/correction-request-panel.tsx");
  assert.match(panel, /disabled/);
  assert.doesNotMatch(panel, /fetch\(/);
});

test("11 SOR hub registry includes candidate correction request entry", () => {
  const entry = SYSTEM_OF_RECORD_ROUTES.find((r) => r.id === "candidate_correction_request");
  assert.ok(entry);
  assert.equal(entry?.persona, "candidate");
  assert.equal(entry?.href, "/dashboard/trust/corrections");
  assert.equal(entry?.moduleFamily, "trust");
});

test("12 candidate canonical routes include trust corrections", () => {
  assert.equal(CANDIDATE_CANONICAL_ROUTES.trustCorrections, "/dashboard/trust/corrections");
});

test("13 demo journey includes candidate correction request step", () => {
  const routes = read("src/lib/founder-led-demo-routes.ts");
  assert.match(routes, /candidateCorrectionRequestHref/);
  assert.match(routes, /id: "candidate_correction_request"/);
});

test("14 executive product proof includes candidate correction request link", () => {
  const proof = read("src/lib/executive-product-proof.ts");
  assert.match(proof, /candidateCorrectionRequestHref/);
  assert.match(proof, /id: "candidate_correction_request"/);
});

test("15 trust center links to correction request", () => {
  const trust = read("src/components/candidate/candidate-trust-center-workspace.tsx");
  assert.match(trust, /candidate-trust-center-correction-request-link/);
  assert.match(trust, /candidateCorrectionRequestHref/);
});

test("16 export preview links to correction request", () => {
  const exportPreview = read("src/components/candidate/candidate-export-preview-workspace.tsx");
  assert.match(exportPreview, /candidate-export-preview-correction-request-link/);
  assert.match(exportPreview, /candidateCorrectionRequestHref/);
});

test("17 shell/gate/fallback/layout files not modified by correction request feature", () => {
  const featurePaths = [
    "src/lib/candidate-correction-request.ts",
    "src/lib/candidate-correction-request-demo-data.ts",
    "src/components/candidate/correction-request-panel.tsx",
    "src/components/candidate/candidate-correction-request-workspace.tsx",
    "src/app/dashboard/trust/corrections/page.tsx",
    "src/app/profile/trust/corrections/page.tsx",
  ];
  const blob = featurePaths.map((p) => read(p)).join("\n");
  for (const forbidden of FORBIDDEN_SHELL_FILES) {
    assert.doesNotMatch(blob, new RegExp(forbidden.replace(/\//g, "\\/")));
  }
  assert.doesNotMatch(blob, /LightweightRouteShell/);
  assert.doesNotMatch(blob, /PersonaWorkspaceGate/);
  assert.doesNotMatch(blob, /WorkspaceRouteLayout/);
});

test("18 correction request copy avoids forbidden legal/outreach claims and PII emails", () => {
  const blob = [
    read("src/lib/candidate-correction-request-demo-data.ts"),
    read("src/components/candidate/correction-request-panel.tsx"),
    read("src/components/candidate/candidate-correction-request-workspace.tsx"),
    JSON.stringify(en.candidateCorrectionRequest),
    JSON.stringify(dictionaries.pl.candidateCorrectionRequest),
    JSON.stringify(buildCandidateCorrectionRequestBundle()),
  ].join("\n");
  for (const pattern of FORBIDDEN_COPY) {
    assert.doesNotMatch(blob, pattern, `${pattern} in correction request surfaces`);
  }
});

test("19 domain kernel resolves correction request for demo-candidate-001", () => {
  const record = resolveKernelCorrectionRequest(CANDIDATE_CORRECTION_REQUEST_DEMO_ID);
  assert.ok(record);
  assert.equal(record?.bundle.request_metadata.demo_only, true);
  assert.equal(record?.bundle.request_metadata.backend_write, false);
});

test("20 draft submit button is disabled on full page", () => {
  const workspace = read("src/components/candidate/candidate-correction-request-workspace.tsx");
  assert.match(workspace, /CANDIDATE_CORRECTION_REQUEST_MARKERS\.submitDisabled/);
  assert.match(workspace, /disabled/);
  assert.match(workspace, /submitDisabledCta/);
});
