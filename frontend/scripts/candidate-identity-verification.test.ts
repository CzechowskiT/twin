/**
 * Candidate identity verification pilot — route, demo bundle, and hard-ban guards (20 assertions).
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  CANDIDATE_IDENTITY_VERIFICATION_DEMO_ID,
  buildCandidateIdentityVerificationBundle,
  getCandidateIdentityVerificationDemo,
} from "../src/lib/candidate-identity-verification-demo-data";
import {
  CANDIDATE_IDENTITY_VERIFICATION_MARKERS,
  CANDIDATE_IDENTITY_VERIFICATION_PAGE_MARKER,
  CANDIDATE_IDENTITY_VERIFICATION_ROUTE,
  CANDIDATE_IDENTITY_VERIFICATION_SAFE_LINKS,
  candidateIdentityVerificationHref,
  resolveCandidateIdentityVerification,
} from "../src/lib/candidate-identity-verification";
import { CANDIDATE_CANONICAL_ROUTES } from "../src/lib/candidate-canonical-routes";
import { JOB_PIPELINE_DEMO_ID } from "../src/lib/job-pipeline-demo-data";
import { SYSTEM_OF_RECORD_ROUTES } from "../src/lib/system-of-record-routes";
import { resolveCandidateIdentityVerification as resolveKernelIdentityVerification } from "../src/lib/system-of-record-domain";
import { dictionaries, en } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const FORBIDDEN_SHELL_FILES = [
  "src/components/lightweight-route-shell.tsx",
  "src/components/persona-workspace-gate.tsx",
  "src/components/workspace-route-layout.tsx",
  "src/app/dashboard/layout.tsx",
] as const;

const FORBIDDEN_COPY = [
  /verified successfully/i,
  /KYC passed/i,
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

test("1 primary dashboard trust/identity-verification route exists", () => {
  assert.ok(existsSync(join(root, "src/app/dashboard/trust/identity-verification/page.tsx")));
});

test("2 profile trust/identity-verification alias route exists", () => {
  assert.ok(existsSync(join(root, "src/app/profile/trust/identity-verification/page.tsx")));
});

test("3 demo-candidate-001 resolves deterministic identity verification record", () => {
  const record = resolveCandidateIdentityVerification(CANDIDATE_IDENTITY_VERIFICATION_DEMO_ID);
  assert.ok(record);
  assert.equal(record?.id, CANDIDATE_IDENTITY_VERIFICATION_DEMO_ID);
  assert.equal(getCandidateIdentityVerificationDemo().display_name, record?.display_name);
  assert.ok(record?.pilot_labelled);
  assert.equal(record?.role_id, JOB_PIPELINE_DEMO_ID);
});

test("4 workspace renders all eight section markers", () => {
  const workspace = read("src/components/candidate/candidate-identity-verification-workspace.tsx");
  assert.match(workspace, new RegExp(CANDIDATE_IDENTITY_VERIFICATION_PAGE_MARKER));
  assert.match(workspace, /CANDIDATE_IDENTITY_VERIFICATION_MARKERS\.header/);
  assert.match(workspace, /CANDIDATE_IDENTITY_VERIFICATION_MARKERS\.currentStatus/);
  assert.match(workspace, /CANDIDATE_IDENTITY_VERIFICATION_MARKERS\.futureFlowPreview/);
  assert.match(workspace, /CANDIDATE_IDENTITY_VERIFICATION_MARKERS\.dataSharedPreview/);
  assert.match(workspace, /CANDIDATE_IDENTITY_VERIFICATION_MARKERS\.disabledActions/);
  assert.match(workspace, /CANDIDATE_IDENTITY_VERIFICATION_MARKERS\.auditTimeline/);
  assert.match(workspace, /CANDIDATE_IDENTITY_VERIFICATION_MARKERS\.linkedModules/);
  assert.match(workspace, /CANDIDATE_IDENTITY_VERIFICATION_MARKERS\.boundary/);
});

test("5 invalid candidate id resolves to not-found marker not blank shell", () => {
  assert.equal(resolveCandidateIdentityVerification("not-a-real-candidate-id"), null);
  const workspace = read("src/components/candidate/candidate-identity-verification-workspace.tsx");
  assert.match(workspace, /CANDIDATE_IDENTITY_VERIFICATION_MARKERS\.notFound/);
  assert.match(workspace, /GuidedEmptyState/);
  assert.match(workspace, /candidateIdentityVerification\.notFoundTitle/);
});

test("6 identity bundle has required metadata flags and pilot unavailable status", () => {
  const bundle = buildCandidateIdentityVerificationBundle();
  assert.equal(bundle.request_metadata.backend_write, false);
  assert.equal(bundle.request_metadata.demo_only, true);
  assert.equal(bundle.request_metadata.legal_claim, false);
  assert.equal(bundle.request_metadata.provider_configured, false);
  assert.equal(bundle.current_status.status, "pilot_unavailable");
  assert.ok(bundle.future_flow_steps.length >= 4);
  assert.ok(bundle.data_shared_preview.length > 0);
  assert.ok(bundle.disabled_actions.length > 0);
  assert.ok(bundle.safety_boundaries.no_kyc);
  assert.ok(bundle.safety_boundaries.no_upload);
});

test("7 audit timeline events have no backend writes", () => {
  const bundle = buildCandidateIdentityVerificationBundle();
  for (const event of bundle.audit_timeline) {
    assert.equal(event.backend_write, false);
  }
});

test("8 i18n keys exist for candidate identity verification", () => {
  assert.ok(en.candidateIdentityVerification.pageEyebrow.length > 3);
  assert.ok(en.candidateIdentityVerification.startDisabledCta.includes("disabled"));
  assert.ok(en.candidateIdentityVerification.boundaryBody.includes("demo-only"));
});

test("9 required safe links resolve to canonical routes", () => {
  assert.equal(candidateIdentityVerificationHref(), CANDIDATE_IDENTITY_VERIFICATION_ROUTE);
  assert.equal(CANDIDATE_IDENTITY_VERIFICATION_SAFE_LINKS.trustCenter, CANDIDATE_CANONICAL_ROUTES.trust);
  assert.equal(CANDIDATE_IDENTITY_VERIFICATION_SAFE_LINKS.controlCenter, CANDIDATE_CANONICAL_ROUTES.trustControls);
  assert.equal(CANDIDATE_IDENTITY_VERIFICATION_SAFE_LINKS.exportPreview, CANDIDATE_CANONICAL_ROUTES.trustExportPreview);
  assert.equal(CANDIDATE_IDENTITY_VERIFICATION_SAFE_LINKS.auditExport, CANDIDATE_CANONICAL_ROUTES.trustAuditExport);
  assert.equal(CANDIDATE_IDENTITY_VERIFICATION_SAFE_LINKS.panel, CANDIDATE_CANONICAL_ROUTES.panel);
  assert.equal(CANDIDATE_IDENTITY_VERIFICATION_SAFE_LINKS.profile, "/profile");
});

test("10 control center integrates IdentityVerificationPanel with disabled start", () => {
  const controlCenter = read("src/components/candidate/candidate-control-center-workspace.tsx");
  assert.match(controlCenter, /IdentityVerificationPanel/);
  assert.match(controlCenter, /resolveCandidateIdentityVerification/);
  const panel = read("src/components/candidate/identity-verification-panel.tsx");
  assert.match(panel, /disabled/);
  assert.doesNotMatch(panel, /fetch\(/);
});

test("11 SOR hub registry includes candidate identity verification entry", () => {
  const entry = SYSTEM_OF_RECORD_ROUTES.find((r) => r.id === "candidate_identity_verification");
  assert.ok(entry);
  assert.equal(entry?.persona, "candidate");
  assert.equal(entry?.href, "/dashboard/trust/identity-verification");
  assert.equal(entry?.moduleFamily, "trust");
});

test("12 candidate canonical routes include trust identity verification", () => {
  assert.equal(CANDIDATE_CANONICAL_ROUTES.trustIdentityVerification, "/dashboard/trust/identity-verification");
});

test("13 demo journey includes candidate identity verification step", () => {
  const routes = read("src/lib/founder-led-demo-routes.ts");
  assert.match(routes, /candidateIdentityVerificationHref/);
  assert.match(routes, /id: "candidate_identity_verification"/);
});

test("14 executive product proof includes candidate identity verification link", () => {
  const proof = read("src/lib/executive-product-proof.ts");
  assert.match(proof, /candidateIdentityVerificationHref/);
  assert.match(proof, /id: "candidate_identity_verification"/);
});

test("15 trust center links to identity verification", () => {
  const trust = read("src/components/candidate/candidate-trust-center-workspace.tsx");
  assert.match(trust, /candidate-trust-center-identity-verification-link/);
  assert.match(trust, /candidateIdentityVerificationHref/);
});

test("16 export preview links to identity verification", () => {
  const exportPreview = read("src/components/candidate/candidate-export-preview-workspace.tsx");
  assert.match(exportPreview, /candidate-export-preview-identity-verification-link/);
  assert.match(exportPreview, /candidateIdentityVerificationHref/);
});

test("17 shell/gate/fallback/layout files not modified by identity verification feature", () => {
  const featurePaths = [
    "src/lib/candidate-identity-verification.ts",
    "src/lib/candidate-identity-verification-demo-data.ts",
    "src/components/candidate/identity-verification-panel.tsx",
    "src/components/candidate/candidate-identity-verification-workspace.tsx",
    "src/app/dashboard/trust/identity-verification/page.tsx",
    "src/app/profile/trust/identity-verification/page.tsx",
  ];
  const blob = featurePaths.map((p) => read(p)).join("\n");
  for (const forbidden of FORBIDDEN_SHELL_FILES) {
    assert.doesNotMatch(blob, new RegExp(forbidden.replace(/\//g, "\\/")));
  }
  assert.doesNotMatch(blob, /LightweightRouteShell/);
  assert.doesNotMatch(blob, /PersonaWorkspaceGate/);
  assert.doesNotMatch(blob, /WorkspaceRouteLayout/);
});

test("18 identity verification copy avoids forbidden legal/outreach claims and PII emails", () => {
  const blob = [
    read("src/lib/candidate-identity-verification-demo-data.ts"),
    read("src/components/candidate/identity-verification-panel.tsx"),
    read("src/components/candidate/candidate-identity-verification-workspace.tsx"),
    JSON.stringify(en.candidateIdentityVerification),
    JSON.stringify(dictionaries.pl.candidateIdentityVerification),
    JSON.stringify(buildCandidateIdentityVerificationBundle()),
  ].join("\n");
  for (const pattern of FORBIDDEN_COPY) {
    assert.doesNotMatch(blob, pattern, `${pattern} in identity verification surfaces`);
  }
});

test("19 domain kernel resolves identity verification for demo-candidate-001", () => {
  const record = resolveKernelIdentityVerification(CANDIDATE_IDENTITY_VERIFICATION_DEMO_ID);
  assert.ok(record);
  assert.equal(record?.bundle.request_metadata.demo_only, true);
  assert.equal(record?.bundle.request_metadata.backend_write, false);
});

test("20 start button is disabled on full page and identity warning has no truncate", () => {
  const workspace = read("src/components/candidate/candidate-identity-verification-workspace.tsx");
  assert.match(workspace, /CANDIDATE_IDENTITY_VERIFICATION_MARKERS\.startDisabled/);
  assert.match(workspace, /disabled/);
  assert.match(workspace, /startDisabledCta/);
  assert.doesNotMatch(workspace, /line-clamp/);
  assert.doesNotMatch(workspace, /truncate/);
  assert.doesNotMatch(workspace, /overflow-hidden/);
  const identityPage = read("src/app/dashboard/identity/page.tsx");
  assert.doesNotMatch(identityPage, /line-clamp/);
  assert.doesNotMatch(identityPage, /truncate/);
  assert.doesNotMatch(identityPage, /overflow-hidden/);
  assert.match(identityPage, /text-\[var\(--foreground\)\]/);
});
