/**
 * Candidate revoke & delete request — route, demo bundle, and hard-ban guards (25 assertions).
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  CANDIDATE_REVOKE_DELETE_DEMO_ID,
  buildCandidateRevokeDeleteBundle,
  getCandidateRevokeDeleteDemo,
} from "../src/lib/candidate-revoke-delete-demo-data";
import {
  CANDIDATE_REVOKE_DELETE_MARKERS,
  CANDIDATE_REVOKE_DELETE_PAGE_MARKER,
  CANDIDATE_REVOKE_DELETE_ROUTE,
  CANDIDATE_REVOKE_DELETE_SAFE_LINKS,
  candidateRevokeDeleteHref,
  resolveCandidateRevokeDelete,
} from "../src/lib/candidate-revoke-delete";
import { CANDIDATE_CANONICAL_ROUTES } from "../src/lib/candidate-canonical-routes";
import { JOB_PIPELINE_DEMO_ID } from "../src/lib/job-pipeline-demo-data";
import { SYSTEM_OF_RECORD_ROUTES } from "../src/lib/system-of-record-routes";
import { resolveCandidateRevokeDelete as resolveKernelRevokeDelete } from "../src/lib/system-of-record-domain";
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
  /account deleted/i,
  /access revoked/i,
  /AI decided/i,
  /AI decides/i,
  /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i,
] as const;

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("1 primary dashboard trust/revoke-delete route exists", () => {
  assert.ok(existsSync(join(root, "src/app/dashboard/trust/revoke-delete/page.tsx")));
});

test("2 profile trust/revoke-delete alias route exists", () => {
  assert.ok(existsSync(join(root, "src/app/profile/trust/revoke-delete/page.tsx")));
});

test("3 demo-candidate-001 resolves deterministic revoke delete record", () => {
  const record = resolveCandidateRevokeDelete(CANDIDATE_REVOKE_DELETE_DEMO_ID);
  assert.ok(record);
  assert.equal(record?.id, CANDIDATE_REVOKE_DELETE_DEMO_ID);
  assert.equal(getCandidateRevokeDeleteDemo().display_name, record?.display_name);
  assert.ok(record?.pilot_labelled);
  assert.equal(record?.role_id, JOB_PIPELINE_DEMO_ID);
});

test("4 workspace renders all nine section markers", () => {
  const workspace = read("src/components/candidate/candidate-revoke-delete-workspace.tsx");
  assert.match(workspace, new RegExp(CANDIDATE_REVOKE_DELETE_PAGE_MARKER));
  assert.match(workspace, /CANDIDATE_REVOKE_DELETE_MARKERS\.header/);
  assert.match(workspace, /CANDIDATE_REVOKE_DELETE_MARKERS\.requestTypeSelector/);
  assert.match(workspace, /CANDIDATE_REVOKE_DELETE_MARKERS\.impactPreview/);
  assert.match(workspace, /CANDIDATE_REVOKE_DELETE_MARKERS\.includedExcludedScope/);
  assert.match(workspace, /CANDIDATE_REVOKE_DELETE_MARKERS\.draftRequest/);
  assert.match(workspace, /CANDIDATE_REVOKE_DELETE_MARKERS\.auditTimeline/);
  assert.match(workspace, /CANDIDATE_REVOKE_DELETE_MARKERS\.linkedModules/);
  assert.match(workspace, /CANDIDATE_REVOKE_DELETE_MARKERS\.plannedWorkflow/);
  assert.match(workspace, /CANDIDATE_REVOKE_DELETE_MARKERS\.boundary/);
});

test("5 invalid candidate id resolves to not-found marker not blank shell", () => {
  assert.equal(resolveCandidateRevokeDelete("not-a-real-candidate-id"), null);
  const workspace = read("src/components/candidate/candidate-revoke-delete-workspace.tsx");
  assert.match(workspace, /CANDIDATE_REVOKE_DELETE_MARKERS\.notFound/);
  assert.match(workspace, /GuidedEmptyState/);
  assert.match(workspace, /candidateRevokeDelete\.notFoundTitle/);
});

test("6 revoke delete bundle has request_type revoke_delete_preview and backend_write false", () => {
  const bundle = buildCandidateRevokeDeleteBundle();
  assert.equal(bundle.request_metadata.backend_write, false);
  assert.equal(bundle.request_metadata.demo_only, true);
  assert.equal(bundle.request_metadata.legal_claim, false);
  assert.equal(bundle.request_metadata.request_type, "revoke_delete_preview");
  assert.equal(bundle.draft_request.request_type, "revoke_delete_preview");
  assert.equal(bundle.draft_request.backend_write, false);
  assert.equal(bundle.request_type_options.length, 5);
  assert.ok(bundle.impact_preview.length >= 3);
  assert.ok(bundle.safety_boundaries.no_submit);
  assert.ok(bundle.safety_boundaries.no_delete);
  assert.ok(bundle.safety_boundaries.no_revoke);
});

test("7 audit preview events have no backend writes", () => {
  const bundle = buildCandidateRevokeDeleteBundle();
  for (const event of bundle.audit_preview_events) {
    assert.equal(event.backend_write, false);
  }
});

test("8 i18n keys exist for candidate revoke delete", () => {
  assert.ok(en.candidateRevokeDelete.pageEyebrow.length > 3);
  assert.ok(en.candidateRevokeDelete.submitDisabledCta.includes("disabled"));
  assert.ok(en.candidateRevokeDelete.boundaryBody.includes("demo-only"));
});

test("9 required safe links resolve to canonical routes", () => {
  assert.equal(candidateRevokeDeleteHref(), CANDIDATE_REVOKE_DELETE_ROUTE);
  assert.equal(CANDIDATE_REVOKE_DELETE_SAFE_LINKS.trustCenter, CANDIDATE_CANONICAL_ROUTES.trust);
  assert.equal(CANDIDATE_REVOKE_DELETE_SAFE_LINKS.controlCenter, CANDIDATE_CANONICAL_ROUTES.trustControls);
  assert.equal(CANDIDATE_REVOKE_DELETE_SAFE_LINKS.exportPreview, CANDIDATE_CANONICAL_ROUTES.trustExportPreview);
  assert.equal(CANDIDATE_REVOKE_DELETE_SAFE_LINKS.corrections, CANDIDATE_CANONICAL_ROUTES.trustCorrections);
  assert.equal(CANDIDATE_REVOKE_DELETE_SAFE_LINKS.dataPortability, CANDIDATE_CANONICAL_ROUTES.trustPortability);
  assert.equal(CANDIDATE_REVOKE_DELETE_SAFE_LINKS.panel, CANDIDATE_CANONICAL_ROUTES.panel);
  assert.equal(CANDIDATE_REVOKE_DELETE_SAFE_LINKS.profile, "/profile");
});

test("10 control center integrates RevokeDeletePanel with disabled submit", () => {
  const controlCenter = read("src/components/candidate/candidate-control-center-workspace.tsx");
  assert.match(controlCenter, /RevokeDeletePanel/);
  assert.match(controlCenter, /resolveCandidateRevokeDelete/);
  const panel = read("src/components/candidate/revoke-delete-panel.tsx");
  assert.match(panel, /disabled/);
  assert.doesNotMatch(panel, /fetch\(/);
});

test("11 SOR hub registry includes candidate revoke delete entry", () => {
  const entry = SYSTEM_OF_RECORD_ROUTES.find((r) => r.id === "candidate_revoke_delete");
  assert.ok(entry);
  assert.equal(entry?.persona, "candidate");
  assert.equal(entry?.href, "/dashboard/trust/revoke-delete");
  assert.equal(entry?.moduleFamily, "trust");
});

test("12 candidate canonical routes include trust revoke delete", () => {
  assert.equal(CANDIDATE_CANONICAL_ROUTES.trustRevokeDelete, "/dashboard/trust/revoke-delete");
});

test("13 demo journey includes candidate revoke delete step", () => {
  const routes = read("src/lib/founder-led-demo-routes.ts");
  assert.match(routes, /candidateRevokeDeleteHref/);
  assert.match(routes, /id: "candidate_revoke_delete"/);
});

test("14 executive product proof includes candidate revoke delete link", () => {
  const proof = read("src/lib/executive-product-proof.ts");
  assert.match(proof, /candidateRevokeDeleteHref/);
  assert.match(proof, /id: "candidate_revoke_delete"/);
});

test("15 trust center links to revoke delete", () => {
  const trust = read("src/components/candidate/candidate-trust-center-workspace.tsx");
  assert.match(trust, /candidate-trust-center-revoke-delete-link/);
  assert.match(trust, /candidateRevokeDeleteHref/);
});

test("16 export preview links to revoke delete", () => {
  const exportPreview = read("src/components/candidate/candidate-export-preview-workspace.tsx");
  assert.match(exportPreview, /candidate-export-preview-revoke-delete-link/);
  assert.match(exportPreview, /candidateRevokeDeleteHref/);
});

test("17 correction request links to revoke delete", () => {
  const corrections = read("src/components/candidate/candidate-correction-request-workspace.tsx");
  assert.match(corrections, /candidate-correction-request-revoke-delete-link/);
  assert.match(corrections, /candidateRevokeDeleteHref/);
});

test("18 data portability links to revoke delete", () => {
  const portability = read("src/components/candidate/candidate-data-portability-workspace.tsx");
  assert.match(portability, /candidate-data-portability-revoke-delete-link/);
  assert.match(portability, /revokeDelete/);
});

test("19 shell/gate/fallback/layout files not modified by revoke delete feature", () => {
  const featurePaths = [
    "src/lib/candidate-revoke-delete.ts",
    "src/lib/candidate-revoke-delete-demo-data.ts",
    "src/components/candidate/revoke-delete-panel.tsx",
    "src/components/candidate/candidate-revoke-delete-workspace.tsx",
    "src/app/dashboard/trust/revoke-delete/page.tsx",
    "src/app/profile/trust/revoke-delete/page.tsx",
  ];
  const blob = featurePaths.map((p) => read(p)).join("\n");
  for (const forbidden of FORBIDDEN_SHELL_FILES) {
    assert.doesNotMatch(blob, new RegExp(forbidden.replace(/\//g, "\\/")));
  }
  assert.doesNotMatch(blob, /LightweightRouteShell/);
  assert.doesNotMatch(blob, /PersonaWorkspaceGate/);
  assert.doesNotMatch(blob, /WorkspaceRouteLayout/);
});

test("20 revoke delete copy avoids forbidden legal/outreach claims and PII emails", () => {
  const blob = [
    read("src/lib/candidate-revoke-delete-demo-data.ts"),
    read("src/components/candidate/revoke-delete-panel.tsx"),
    read("src/components/candidate/candidate-revoke-delete-workspace.tsx"),
    JSON.stringify(en.candidateRevokeDelete),
    JSON.stringify(dictionaries.pl.candidateRevokeDelete),
    JSON.stringify(buildCandidateRevokeDeleteBundle()),
  ].join("\n");
  for (const pattern of FORBIDDEN_COPY) {
    assert.doesNotMatch(blob, pattern, `${pattern} in revoke delete surfaces`);
  }
});

test("21 domain kernel resolves revoke delete for demo-candidate-001", () => {
  const record = resolveKernelRevokeDelete(CANDIDATE_REVOKE_DELETE_DEMO_ID);
  assert.ok(record);
  assert.equal(record?.bundle.request_metadata.demo_only, true);
  assert.equal(record?.bundle.request_metadata.backend_write, false);
  assert.equal(record?.bundle.request_metadata.request_type, "revoke_delete_preview");
});

test("22 included and excluded scope items are non-empty on demo record", () => {
  const record = getCandidateRevokeDeleteDemo();
  assert.ok(record.included_items.length >= 3);
  assert.ok(record.excluded_items.length >= 3);
});

test("23 linked modules include trust and data portability routes", () => {
  const bundle = buildCandidateRevokeDeleteBundle();
  const hrefs = bundle.linked_modules.map((m) => m.href);
  assert.ok(hrefs.some((h) => h.includes("/dashboard/trust")));
  assert.ok(hrefs.some((h) => h.includes("/portability")));
});

test("24 planned workflow has at least three steps", () => {
  const bundle = buildCandidateRevokeDeleteBundle();
  assert.ok(bundle.planned_workflow.length >= 3);
});

test("25 draft submit button is disabled on full page", () => {
  const workspace = read("src/components/candidate/candidate-revoke-delete-workspace.tsx");
  assert.match(workspace, /CANDIDATE_REVOKE_DELETE_MARKERS\.submitDisabled/);
  assert.match(workspace, /disabled/);
  assert.match(workspace, /submitDisabledCta/);
});
