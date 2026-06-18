/**
 * Candidate trust audit export bundle — route, demo JSON, and hard-ban guards (29 assertions).
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  CANDIDATE_TRUST_AUDIT_EXPORT_DEMO_ID,
  CANDIDATE_TRUST_AUDIT_EXPORT_FILENAME,
  buildCandidateTrustAuditExportBundle,
  getCandidateTrustAuditExportDemo,
} from "../src/lib/candidate-trust-audit-export-demo-data";
import {
  CANDIDATE_TRUST_AUDIT_EXPORT_MARKERS,
  CANDIDATE_TRUST_AUDIT_EXPORT_PAGE_MARKER,
  CANDIDATE_TRUST_AUDIT_EXPORT_ROUTE,
  CANDIDATE_TRUST_AUDIT_EXPORT_SAFE_LINKS,
  candidateTrustAuditExportHref,
  resolveCandidateTrustAuditExport,
} from "../src/lib/candidate-trust-audit-export";
import { CANDIDATE_CANONICAL_ROUTES } from "../src/lib/candidate-canonical-routes";
import { JOB_PIPELINE_DEMO_ID } from "../src/lib/job-pipeline-demo-data";
import { SYSTEM_OF_RECORD_ROUTES } from "../src/lib/system-of-record-routes";
import { resolveCandidateTrustAuditExport as resolveKernelTrustAuditExport } from "../src/lib/system-of-record-domain";
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
  /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i,
] as const;

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("1 primary dashboard trust/audit-export route exists", () => {
  assert.ok(existsSync(join(root, "src/app/dashboard/trust/audit-export/page.tsx")));
});

test("2 profile trust/audit-export alias route exists", () => {
  assert.ok(existsSync(join(root, "src/app/profile/trust/audit-export/page.tsx")));
});

test("3 demo-candidate-001 resolves deterministic trust audit export record", () => {
  const record = resolveCandidateTrustAuditExport(CANDIDATE_TRUST_AUDIT_EXPORT_DEMO_ID);
  assert.ok(record);
  assert.equal(record?.id, CANDIDATE_TRUST_AUDIT_EXPORT_DEMO_ID);
  assert.equal(getCandidateTrustAuditExportDemo().display_name, record?.display_name);
  assert.ok(record?.pilot_labelled);
  assert.equal(record?.role_id, JOB_PIPELINE_DEMO_ID);
});

test("4 workspace renders all eight section markers", () => {
  const workspace = read("src/components/candidate/candidate-trust-audit-export-workspace.tsx");
  assert.match(workspace, new RegExp(CANDIDATE_TRUST_AUDIT_EXPORT_PAGE_MARKER));
  assert.match(workspace, /CANDIDATE_TRUST_AUDIT_EXPORT_MARKERS\.header/);
  assert.match(workspace, /CANDIDATE_TRUST_AUDIT_EXPORT_MARKERS\.exportSummary/);
  assert.match(workspace, /CANDIDATE_TRUST_AUDIT_EXPORT_MARKERS\.timelineCoverage/);
  assert.match(workspace, /CANDIDATE_TRUST_AUDIT_EXPORT_MARKERS\.jsonPanel/);
  assert.match(workspace, /CANDIDATE_TRUST_AUDIT_EXPORT_MARKERS\.download/);
  assert.match(workspace, /CANDIDATE_TRUST_AUDIT_EXPORT_MARKERS\.includedExcludedScope/);
  assert.match(workspace, /CANDIDATE_TRUST_AUDIT_EXPORT_MARKERS\.linkedModules/);
  assert.match(workspace, /CANDIDATE_TRUST_AUDIT_EXPORT_MARKERS\.boundary/);
});

test("5 invalid candidate id resolves to not-found marker not blank shell", () => {
  assert.equal(resolveCandidateTrustAuditExport("not-a-real-candidate-id"), null);
  const workspace = read("src/components/candidate/candidate-trust-audit-export-workspace.tsx");
  assert.match(workspace, /CANDIDATE_TRUST_AUDIT_EXPORT_MARKERS\.notFound/);
  assert.match(workspace, /GuidedEmptyState/);
  assert.match(workspace, /candidateTrustAuditExport\.notFoundTitle/);
});

test("6 export JSON bundle has required top-level keys and metadata flags", () => {
  const bundle = buildCandidateTrustAuditExportBundle();
  assert.equal(bundle.export_metadata.backend_write, false);
  assert.equal(bundle.export_metadata.demo_only, true);
  assert.equal(bundle.export_metadata.legal_claim, false);
  assert.equal(bundle.export_metadata.generated_locally, true);
  assert.equal(bundle.export_metadata.trust_audit_preview, true);
  assert.equal(bundle.export_metadata.filename, CANDIDATE_TRUST_AUDIT_EXPORT_FILENAME);
  assert.ok(Array.isArray(bundle.trust_center_events));
  assert.ok(Array.isArray(bundle.control_center_events));
  assert.ok(Array.isArray(bundle.export_preview_events));
  assert.ok(Array.isArray(bundle.correction_request_events));
  assert.ok(Array.isArray(bundle.portability_request_events));
  assert.ok(Array.isArray(bundle.revoke_delete_events));
  assert.ok(Array.isArray(bundle.system_of_record_links) && bundle.system_of_record_links.length > 0);
  assert.ok(Array.isArray(bundle.evidence_references) && bundle.evidence_references.length > 0);
  assert.ok(Array.isArray(bundle.included_scope) && bundle.included_scope.length > 0);
  assert.ok(Array.isArray(bundle.excluded_scope) && bundle.excluded_scope.length > 0);
  assert.ok(bundle.safety_boundaries);
});

test("7 all six workflow event arrays are non-empty on demo bundle", () => {
  const bundle = buildCandidateTrustAuditExportBundle();
  assert.ok(bundle.trust_center_events.length > 0);
  assert.ok(bundle.control_center_events.length > 0);
  assert.ok(bundle.export_preview_events.length > 0);
  assert.ok(bundle.correction_request_events.length > 0);
  assert.ok(bundle.portability_request_events.length > 0);
  assert.ok(bundle.revoke_delete_events.length > 0);
});

test("8 all workflow audit events have no backend writes", () => {
  const bundle = buildCandidateTrustAuditExportBundle();
  const allEvents = [
    ...bundle.trust_center_events,
    ...bundle.control_center_events,
    ...bundle.export_preview_events,
    ...bundle.correction_request_events,
    ...bundle.portability_request_events,
    ...bundle.revoke_delete_events,
  ];
  for (const event of allEvents) {
    assert.equal(event.backend_write, false);
  }
});

test("9 i18n keys exist for candidate trust audit export", () => {
  assert.ok(en.candidateTrustAuditExport.pageEyebrow.length > 3);
  assert.ok(en.candidateTrustAuditExport.downloadCta.includes("JSON"));
  assert.ok(en.candidateTrustAuditExport.boundaryBody.includes("demo-only"));
});

test("10 required safe links resolve to canonical routes", () => {
  assert.equal(candidateTrustAuditExportHref(), CANDIDATE_TRUST_AUDIT_EXPORT_ROUTE);
  assert.equal(CANDIDATE_TRUST_AUDIT_EXPORT_SAFE_LINKS.trustCenter, CANDIDATE_CANONICAL_ROUTES.trust);
  assert.equal(CANDIDATE_TRUST_AUDIT_EXPORT_SAFE_LINKS.controlCenter, CANDIDATE_CANONICAL_ROUTES.trustControls);
  assert.equal(CANDIDATE_TRUST_AUDIT_EXPORT_SAFE_LINKS.exportPreview, CANDIDATE_CANONICAL_ROUTES.trustExportPreview);
  assert.equal(CANDIDATE_TRUST_AUDIT_EXPORT_SAFE_LINKS.panel, CANDIDATE_CANONICAL_ROUTES.panel);
  assert.equal(CANDIDATE_TRUST_AUDIT_EXPORT_SAFE_LINKS.jobs, CANDIDATE_CANONICAL_ROUTES.jobs);
  assert.equal(CANDIDATE_TRUST_AUDIT_EXPORT_SAFE_LINKS.matches, CANDIDATE_CANONICAL_ROUTES.matches);
  assert.equal(CANDIDATE_TRUST_AUDIT_EXPORT_SAFE_LINKS.profile, "/profile");
});

test("11 control center integrates TrustAuditExportPanel with active download", () => {
  const controlCenter = read("src/components/candidate/candidate-control-center-workspace.tsx");
  assert.match(controlCenter, /TrustAuditExportPanel/);
  assert.match(controlCenter, /resolveCandidateTrustAuditExport/);
  const panel = read("src/components/candidate/trust-audit-export-panel.tsx");
  assert.match(panel, /downloadCandidateTrustAuditExportJson/);
  assert.doesNotMatch(panel, /fetch\(/);
});

test("12 SOR hub registry includes candidate trust audit export entry", () => {
  const entry = SYSTEM_OF_RECORD_ROUTES.find((r) => r.id === "candidate_trust_audit_export");
  assert.ok(entry);
  assert.equal(entry?.persona, "candidate");
  assert.equal(entry?.href, "/dashboard/trust/audit-export");
  assert.equal(entry?.moduleFamily, "trust");
});

test("13 candidate canonical routes include trust audit export", () => {
  assert.equal(CANDIDATE_CANONICAL_ROUTES.trustAuditExport, "/dashboard/trust/audit-export");
});

test("14 demo journey includes candidate trust audit export step", () => {
  const routes = read("src/lib/founder-led-demo-routes.ts");
  assert.match(routes, /candidateTrustAuditExportHref/);
  assert.match(routes, /id: "candidate_trust_audit_export"/);
});

test("15 executive product proof includes candidate trust audit export link", () => {
  const proof = read("src/lib/executive-product-proof.ts");
  assert.match(proof, /candidateTrustAuditExportHref/);
  assert.match(proof, /id: "candidate_trust_audit_export"/);
});

test("16 trust center links to trust audit export", () => {
  const trust = read("src/components/candidate/candidate-trust-center-workspace.tsx");
  assert.match(trust, /candidate-trust-center-audit-export-link/);
  assert.match(trust, /candidateTrustAuditExportHref/);
});

test("17 export preview links to trust audit export", () => {
  const exportPreview = read("src/components/candidate/candidate-export-preview-workspace.tsx");
  assert.match(exportPreview, /candidate-export-preview-audit-export-link/);
  assert.match(exportPreview, /candidateTrustAuditExportHref/);
});

test("18 correction request links to trust audit export", () => {
  const corrections = read("src/components/candidate/candidate-correction-request-workspace.tsx");
  assert.match(corrections, /candidate-correction-request-audit-export-link/);
  assert.match(corrections, /candidateTrustAuditExportHref/);
});

test("19 data portability links to trust audit export", () => {
  const portability = read("src/components/candidate/candidate-data-portability-workspace.tsx");
  assert.match(portability, /candidate-data-portability-audit-export-link/);
  assert.match(portability, /candidateTrustAuditExportHref/);
});

test("20 revoke delete links to trust audit export", () => {
  const revokeDelete = read("src/components/candidate/candidate-revoke-delete-workspace.tsx");
  assert.match(revokeDelete, /candidate-revoke-delete-audit-export-link/);
  assert.match(revokeDelete, /candidateTrustAuditExportHref/);
});

test("21 shell/gate/fallback/layout files not modified by trust audit export feature", () => {
  const featurePaths = [
    "src/lib/candidate-trust-audit-export.ts",
    "src/lib/candidate-trust-audit-export-demo-data.ts",
    "src/components/candidate/trust-audit-export-panel.tsx",
    "src/components/candidate/candidate-trust-audit-export-workspace.tsx",
    "src/app/dashboard/trust/audit-export/page.tsx",
    "src/app/profile/trust/audit-export/page.tsx",
  ];
  const blob = featurePaths.map((p) => read(p)).join("\n");
  for (const forbidden of FORBIDDEN_SHELL_FILES) {
    assert.doesNotMatch(blob, new RegExp(forbidden.replace(/\//g, "\\/")));
  }
  assert.doesNotMatch(blob, /LightweightRouteShell/);
  assert.doesNotMatch(blob, /PersonaWorkspaceGate/);
  assert.doesNotMatch(blob, /WorkspaceRouteLayout/);
});

test("22 trust audit export copy avoids forbidden legal/outreach claims and PII emails", () => {
  const blob = [
    read("src/lib/candidate-trust-audit-export-demo-data.ts"),
    read("src/components/candidate/trust-audit-export-panel.tsx"),
    read("src/components/candidate/candidate-trust-audit-export-workspace.tsx"),
    JSON.stringify(en.candidateTrustAuditExport),
    JSON.stringify(dictionaries.pl.candidateTrustAuditExport),
    JSON.stringify(buildCandidateTrustAuditExportBundle()),
  ].join("\n");
  for (const pattern of FORBIDDEN_COPY) {
    assert.doesNotMatch(blob, pattern, `${pattern} in trust audit export surfaces`);
  }
});

test("23 domain kernel resolves trust audit export for demo-candidate-001", () => {
  const record = resolveKernelTrustAuditExport(CANDIDATE_TRUST_AUDIT_EXPORT_DEMO_ID);
  assert.ok(record);
  assert.equal(record?.bundle.export_metadata.demo_only, true);
  assert.equal(record?.bundle.export_metadata.backend_write, false);
  assert.equal(record?.bundle.export_metadata.trust_audit_preview, true);
});

test("24 included and excluded scope arrays are non-empty on demo record", () => {
  const record = getCandidateTrustAuditExportDemo();
  assert.ok(record.bundle.included_scope.length >= 3);
  assert.ok(record.bundle.excluded_scope.length >= 3);
});

test("25 evidence references include decision memory and profile links", () => {
  const bundle = buildCandidateTrustAuditExportBundle();
  const kinds = bundle.evidence_references.map((r) => r.kind);
  assert.ok(kinds.includes("decision_memory"));
  assert.ok(kinds.includes("profile_360"));
});

test("26 system of record links include all six trust workflow routes", () => {
  const bundle = buildCandidateTrustAuditExportBundle();
  const hrefs = bundle.system_of_record_links.map((l) => l.href);
  assert.ok(hrefs.some((h) => h.includes("/dashboard/trust")));
  assert.ok(hrefs.some((h) => h.includes("/export-preview")));
  assert.ok(hrefs.some((h) => h.includes("/corrections")));
  assert.ok(hrefs.some((h) => h.includes("/portability")));
  assert.ok(hrefs.some((h) => h.includes("/revoke-delete")));
  assert.ok(hrefs.some((h) => h.includes("/audit-export")));
});

test("27 safety boundaries block tickets email and live export", () => {
  const bundle = buildCandidateTrustAuditExportBundle();
  assert.ok(bundle.safety_boundaries.no_live_export);
  assert.ok(bundle.safety_boundaries.no_ticket);
  assert.ok(bundle.safety_boundaries.no_email);
  assert.ok(bundle.safety_boundaries.human_decision_required);
});

test("28 timeline coverage section renders six workflow labels", () => {
  const workspace = read("src/components/candidate/candidate-trust-audit-export-workspace.tsx");
  assert.match(workspace, /workflowTrustCenter/);
  assert.match(workspace, /workflowControlCenter/);
  assert.match(workspace, /workflowExportPreview/);
  assert.match(workspace, /workflowCorrectionRequest/);
  assert.match(workspace, /workflowPortability/);
  assert.match(workspace, /workflowRevokeDelete/);
});

test("29 download panel exposes active button test id on full page", () => {
  const panel = read("src/components/candidate/trust-audit-export-panel.tsx");
  assert.match(panel, /data-testid=\{`\$\{marker\}-button`\}/);
  assert.match(panel, /downloadCandidateTrustAuditExportJson/);
});
