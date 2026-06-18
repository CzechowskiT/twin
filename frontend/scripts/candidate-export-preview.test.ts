/**
 * Candidate export preview bundle — route, demo JSON, and hard-ban guards (18 assertions).
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  CANDIDATE_EXPORT_PREVIEW_DEMO_ID,
  CANDIDATE_EXPORT_PREVIEW_FILENAME,
  buildCandidateExportPreviewBundle,
  getCandidateExportPreviewDemo,
} from "../src/lib/candidate-export-preview-demo-data";
import {
  CANDIDATE_EXPORT_PREVIEW_MARKERS,
  CANDIDATE_EXPORT_PREVIEW_PAGE_MARKER,
  CANDIDATE_EXPORT_PREVIEW_ROUTE,
  CANDIDATE_EXPORT_PREVIEW_SAFE_LINKS,
  candidateExportPreviewHref,
  resolveCandidateExportPreview,
} from "../src/lib/candidate-export-preview";
import { CANDIDATE_CANONICAL_ROUTES } from "../src/lib/candidate-canonical-routes";
import { JOB_PIPELINE_DEMO_ID } from "../src/lib/job-pipeline-demo-data";
import { SYSTEM_OF_RECORD_ROUTES } from "../src/lib/system-of-record-routes";
import { resolveCandidateExportPreview as resolveKernelExportPreview } from "../src/lib/system-of-record-domain";
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

test("1 primary dashboard trust/export-preview route exists", () => {
  assert.ok(existsSync(join(root, "src/app/dashboard/trust/export-preview/page.tsx")));
});

test("2 profile trust/export-preview alias route exists", () => {
  assert.ok(existsSync(join(root, "src/app/profile/trust/export-preview/page.tsx")));
});

test("3 demo-candidate-001 resolves deterministic export preview record", () => {
  const record = resolveCandidateExportPreview(CANDIDATE_EXPORT_PREVIEW_DEMO_ID);
  assert.ok(record);
  assert.equal(record?.id, CANDIDATE_EXPORT_PREVIEW_DEMO_ID);
  assert.equal(getCandidateExportPreviewDemo().display_name, record?.display_name);
  assert.ok(record?.pilot_labelled);
  assert.equal(record?.role_id, JOB_PIPELINE_DEMO_ID);
});

test("4 workspace renders all eight section markers", () => {
  const workspace = read("src/components/candidate/candidate-export-preview-workspace.tsx");
  assert.match(workspace, new RegExp(CANDIDATE_EXPORT_PREVIEW_PAGE_MARKER));
  assert.match(workspace, /CANDIDATE_EXPORT_PREVIEW_MARKERS\.header/);
  assert.match(workspace, /CANDIDATE_EXPORT_PREVIEW_MARKERS\.bundlePreview/);
  assert.match(workspace, /CANDIDATE_EXPORT_PREVIEW_MARKERS\.jsonPanel/);
  assert.match(workspace, /CANDIDATE_EXPORT_PREVIEW_MARKERS\.download/);
  assert.match(workspace, /CANDIDATE_EXPORT_PREVIEW_MARKERS\.auditTimeline/);
  assert.match(workspace, /CANDIDATE_EXPORT_PREVIEW_MARKERS\.includedExcluded/);
  assert.match(workspace, /CANDIDATE_EXPORT_PREVIEW_MARKERS\.boundary/);
});

test("5 invalid candidate id resolves to not-found marker not blank shell", () => {
  assert.equal(resolveCandidateExportPreview("not-a-real-candidate-id"), null);
  const workspace = read("src/components/candidate/candidate-export-preview-workspace.tsx");
  assert.match(workspace, /CANDIDATE_EXPORT_PREVIEW_MARKERS\.notFound/);
  assert.match(workspace, /GuidedEmptyState/);
  assert.match(workspace, /candidateExportPreview\.notFoundTitle/);
});

test("6 export JSON bundle has required top-level keys and metadata flags", () => {
  const bundle = buildCandidateExportPreviewBundle();
  assert.equal(bundle.export_metadata.backend_write, false);
  assert.equal(bundle.export_metadata.demo_only, true);
  assert.equal(bundle.export_metadata.legal_claim, false);
  assert.equal(bundle.export_metadata.filename, CANDIDATE_EXPORT_PREVIEW_FILENAME);
  assert.ok(bundle.profile_summary);
  assert.ok(bundle.preferences);
  assert.ok(bundle.applications_matches_visibility);
  assert.ok(bundle.trust_control_consent_snapshots);
  assert.ok(bundle.communication_preferences);
  assert.ok(Array.isArray(bundle.system_of_record_links) && bundle.system_of_record_links.length > 0);
  assert.ok(Array.isArray(bundle.decision_memory_refs) && bundle.decision_memory_refs.length > 0);
  assert.ok(Array.isArray(bundle.audit_preview_events) && bundle.audit_preview_events.length > 0);
  assert.ok(bundle.safety_boundaries);
});

test("7 audit preview events have no backend writes", () => {
  const bundle = buildCandidateExportPreviewBundle();
  for (const event of bundle.audit_preview_events) {
    assert.equal(event.backend_write, false);
  }
});

test("8 i18n keys exist for candidate export preview", () => {
  assert.ok(en.candidateExportPreview.pageEyebrow.length > 3);
  assert.ok(en.candidateExportPreview.downloadCta.includes("JSON"));
  assert.ok(en.candidateExportPreview.boundaryBody.includes("demo-only"));
});

test("9 required safe links resolve to canonical routes", () => {
  assert.equal(candidateExportPreviewHref(), CANDIDATE_EXPORT_PREVIEW_ROUTE);
  assert.equal(CANDIDATE_EXPORT_PREVIEW_SAFE_LINKS.trustCenter, CANDIDATE_CANONICAL_ROUTES.trust);
  assert.equal(CANDIDATE_EXPORT_PREVIEW_SAFE_LINKS.controlCenter, CANDIDATE_CANONICAL_ROUTES.trustControls);
  assert.equal(CANDIDATE_EXPORT_PREVIEW_SAFE_LINKS.panel, CANDIDATE_CANONICAL_ROUTES.panel);
  assert.equal(CANDIDATE_EXPORT_PREVIEW_SAFE_LINKS.profile, "/profile");
});

test("10 control center integrates ExportPreviewPanel with active download", () => {
  const controlCenter = read("src/components/candidate/candidate-control-center-workspace.tsx");
  assert.match(controlCenter, /ExportPreviewPanel/);
  assert.match(controlCenter, /resolveCandidateExportPreview/);
  const panel = read("src/components/candidate/export-preview-panel.tsx");
  assert.match(panel, /downloadCandidateExportPreviewJson/);
  assert.doesNotMatch(panel, /fetch\(/);
});

test("11 SOR hub registry includes candidate export preview entry", () => {
  const entry = SYSTEM_OF_RECORD_ROUTES.find((r) => r.id === "candidate_export_preview");
  assert.ok(entry);
  assert.equal(entry?.persona, "candidate");
  assert.equal(entry?.href, "/dashboard/trust/export-preview");
  assert.equal(entry?.moduleFamily, "trust");
});

test("12 candidate canonical routes include trust export preview", () => {
  assert.equal(CANDIDATE_CANONICAL_ROUTES.trustExportPreview, "/dashboard/trust/export-preview");
});

test("13 demo journey includes candidate export preview step", () => {
  const routes = read("src/lib/founder-led-demo-routes.ts");
  assert.match(routes, /candidateExportPreviewHref/);
  assert.match(routes, /id: "candidate_export_preview"/);
});

test("14 executive product proof includes candidate export preview link", () => {
  const proof = read("src/lib/executive-product-proof.ts");
  assert.match(proof, /candidateExportPreviewHref/);
  assert.match(proof, /id: "candidate_export_preview"/);
});

test("15 trust center links to export preview", () => {
  const trust = read("src/components/candidate/candidate-trust-center-workspace.tsx");
  assert.match(trust, /candidate-trust-center-export-preview-link/);
  assert.match(trust, /candidateExportPreviewHref/);
});

test("16 shell/gate/fallback/layout files not modified by export preview feature", () => {
  const featurePaths = [
    "src/lib/candidate-export-preview.ts",
    "src/lib/candidate-export-preview-demo-data.ts",
    "src/components/candidate/export-preview-panel.tsx",
    "src/components/candidate/candidate-export-preview-workspace.tsx",
    "src/app/dashboard/trust/export-preview/page.tsx",
    "src/app/profile/trust/export-preview/page.tsx",
  ];
  const blob = featurePaths.map((p) => read(p)).join("\n");
  for (const forbidden of FORBIDDEN_SHELL_FILES) {
    assert.doesNotMatch(blob, new RegExp(forbidden.replace(/\//g, "\\/")));
  }
  assert.doesNotMatch(blob, /LightweightRouteShell/);
  assert.doesNotMatch(blob, /PersonaWorkspaceGate/);
  assert.doesNotMatch(blob, /WorkspaceRouteLayout/);
});

test("17 export preview copy avoids forbidden legal/outreach claims and PII emails", () => {
  const blob = [
    read("src/lib/candidate-export-preview-demo-data.ts"),
    read("src/components/candidate/export-preview-panel.tsx"),
    read("src/components/candidate/candidate-export-preview-workspace.tsx"),
    JSON.stringify(en.candidateExportPreview),
    JSON.stringify(dictionaries.pl.candidateExportPreview),
    JSON.stringify(buildCandidateExportPreviewBundle()),
  ].join("\n");
  for (const pattern of FORBIDDEN_COPY) {
    assert.doesNotMatch(blob, pattern, `${pattern} in export preview surfaces`);
  }
});

test("18 domain kernel resolves export preview for demo-candidate-001", () => {
  const record = resolveKernelExportPreview(CANDIDATE_EXPORT_PREVIEW_DEMO_ID);
  assert.ok(record);
  assert.equal(record?.bundle.export_metadata.demo_only, true);
  assert.equal(record?.bundle.export_metadata.backend_write, false);
});
