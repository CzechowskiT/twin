/**
 * Candidate trust consent receipt bundle — route, demo JSON, and hard-ban guards (31 assertions).
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  CANDIDATE_CONSENT_RECEIPT_DEMO_ID,
  CANDIDATE_CONSENT_RECEIPT_FILENAME,
  buildCandidateConsentReceiptBundle,
  getCandidateConsentReceiptDemo,
} from "../src/lib/candidate-consent-receipt-demo-data";
import {
  CANDIDATE_CONSENT_RECEIPT_MARKERS,
  CANDIDATE_CONSENT_RECEIPT_PAGE_MARKER,
  CANDIDATE_CONSENT_RECEIPT_ROUTE,
  CANDIDATE_CONSENT_RECEIPT_SAFE_LINKS,
  candidateConsentReceiptHref,
  resolveCandidateConsentReceipt,
} from "../src/lib/candidate-consent-receipt";
import { CANDIDATE_CANONICAL_ROUTES } from "../src/lib/candidate-canonical-routes";
import { JOB_PIPELINE_DEMO_ID } from "../src/lib/job-pipeline-demo-data";
import { SYSTEM_OF_RECORD_ROUTES } from "../src/lib/system-of-record-routes";
import { resolveCandidateConsentReceipt as resolveKernelConsentReceipt } from "../src/lib/system-of-record-domain";
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

test("1 primary dashboard trust/consent-receipt route exists", () => {
  assert.ok(existsSync(join(root, "src/app/dashboard/trust/consent-receipt/page.tsx")));
});

test("2 profile trust/consent-receipt alias route exists", () => {
  assert.ok(existsSync(join(root, "src/app/profile/trust/consent-receipt/page.tsx")));
});

test("3 demo-candidate-001 resolves deterministic consent receipt record", () => {
  const record = resolveCandidateConsentReceipt(CANDIDATE_CONSENT_RECEIPT_DEMO_ID);
  assert.ok(record);
  assert.equal(record?.id, CANDIDATE_CONSENT_RECEIPT_DEMO_ID);
  assert.equal(getCandidateConsentReceiptDemo().display_name, record?.display_name);
  assert.ok(record?.pilot_labelled);
  assert.equal(record?.role_id, JOB_PIPELINE_DEMO_ID);
});

test("4 workspace renders all eight section markers", () => {
  const workspace = read("src/components/candidate/candidate-consent-receipt-workspace.tsx");
  assert.match(workspace, new RegExp(CANDIDATE_CONSENT_RECEIPT_PAGE_MARKER));
  assert.match(workspace, /CANDIDATE_CONSENT_RECEIPT_MARKERS\.header/);
  assert.match(workspace, /CANDIDATE_CONSENT_RECEIPT_MARKERS\.receiptSummary/);
  assert.match(workspace, /CANDIDATE_CONSENT_RECEIPT_MARKERS\.consentCoverage/);
  assert.match(workspace, /CANDIDATE_CONSENT_RECEIPT_MARKERS\.jsonPanel/);
  assert.match(workspace, /CANDIDATE_CONSENT_RECEIPT_MARKERS\.download/);
  assert.match(workspace, /CANDIDATE_CONSENT_RECEIPT_MARKERS\.coveredExcludedScope/);
  assert.match(workspace, /CANDIDATE_CONSENT_RECEIPT_MARKERS\.linkedModules/);
  assert.match(workspace, /CANDIDATE_CONSENT_RECEIPT_MARKERS\.boundary/);
});

test("5 invalid candidate id resolves to not-found marker not blank shell", () => {
  assert.equal(resolveCandidateConsentReceipt("not-a-real-candidate-id"), null);
  const workspace = read("src/components/candidate/candidate-consent-receipt-workspace.tsx");
  assert.match(workspace, /CANDIDATE_CONSENT_RECEIPT_MARKERS\.notFound/);
  assert.match(workspace, /GuidedEmptyState/);
  assert.match(workspace, /candidateConsentReceipt\.notFoundTitle/);
});

test("6 export JSON bundle has required top-level keys and metadata flags", () => {
  const bundle = buildCandidateConsentReceiptBundle();
  assert.equal(bundle.receipt_metadata.backend_write, false);
  assert.equal(bundle.receipt_metadata.demo_only, true);
  assert.equal(bundle.receipt_metadata.legal_claim, false);
  assert.equal(bundle.receipt_metadata.generated_locally, true);
  assert.equal(bundle.receipt_metadata.consent_receipt_preview, true);
  assert.equal(bundle.receipt_metadata.filename, CANDIDATE_CONSENT_RECEIPT_FILENAME);
  assert.ok(bundle.consent_snapshot);
  assert.ok(bundle.accepted_context);
  assert.ok(Array.isArray(bundle.acknowledged_boundaries) && bundle.acknowledged_boundaries.length > 0);
  assert.ok(Array.isArray(bundle.covered_candidate_controls) && bundle.covered_candidate_controls.length > 0);
  assert.ok(Array.isArray(bundle.excluded_scope) && bundle.excluded_scope.length > 0);
  assert.ok(Array.isArray(bundle.linked_trust_modules) && bundle.linked_trust_modules.length > 0);
  assert.ok(Array.isArray(bundle.system_of_record_links) && bundle.system_of_record_links.length > 0);
  assert.ok(Array.isArray(bundle.audit_events) && bundle.audit_events.length > 0);
  assert.ok(Array.isArray(bundle.evidence_references) && bundle.evidence_references.length > 0);
  assert.ok(bundle.safety_boundaries);
});

test("7 all trust workflow audit events have no backend writes", () => {
  const bundle = buildCandidateConsentReceiptBundle();
  for (const event of bundle.audit_events) {
    assert.equal(event.backend_write, false);
  }
});

test("8 i18n keys exist for candidate consent receipt", () => {
  assert.ok(en.candidateConsentReceipt.pageEyebrow.length > 3);
  assert.ok(en.candidateConsentReceipt.downloadCta.includes("JSON"));
  assert.ok(en.candidateConsentReceipt.boundaryBody.includes("demo-only"));
});

test("9 required safe links resolve to canonical routes", () => {
  assert.equal(candidateConsentReceiptHref(), CANDIDATE_CONSENT_RECEIPT_ROUTE);
  assert.equal(CANDIDATE_CONSENT_RECEIPT_SAFE_LINKS.trustCenter, CANDIDATE_CANONICAL_ROUTES.trust);
  assert.equal(CANDIDATE_CONSENT_RECEIPT_SAFE_LINKS.controlCenter, CANDIDATE_CANONICAL_ROUTES.trustControls);
  assert.equal(CANDIDATE_CONSENT_RECEIPT_SAFE_LINKS.auditExport, CANDIDATE_CANONICAL_ROUTES.trustAuditExport);
  assert.equal(CANDIDATE_CONSENT_RECEIPT_SAFE_LINKS.panel, CANDIDATE_CANONICAL_ROUTES.panel);
  assert.equal(CANDIDATE_CONSENT_RECEIPT_SAFE_LINKS.jobs, CANDIDATE_CANONICAL_ROUTES.jobs);
  assert.equal(CANDIDATE_CONSENT_RECEIPT_SAFE_LINKS.matches, CANDIDATE_CANONICAL_ROUTES.matches);
  assert.equal(CANDIDATE_CONSENT_RECEIPT_SAFE_LINKS.profile, "/profile");
});

test("10 control center integrates ConsentReceiptPanel with active download", () => {
  const controlCenter = read("src/components/candidate/candidate-control-center-workspace.tsx");
  assert.match(controlCenter, /ConsentReceiptPanel/);
  assert.match(controlCenter, /resolveCandidateConsentReceipt/);
  const panel = read("src/components/candidate/consent-receipt-panel.tsx");
  assert.match(panel, /downloadCandidateConsentReceiptJson/);
  assert.doesNotMatch(panel, /fetch\(/);
});

test("11 SOR hub registry includes candidate consent receipt entry", () => {
  const entry = SYSTEM_OF_RECORD_ROUTES.find((r) => r.id === "candidate_consent_receipt");
  assert.ok(entry);
  assert.equal(entry?.persona, "candidate");
  assert.equal(entry?.href, "/dashboard/trust/consent-receipt");
  assert.equal(entry?.moduleFamily, "trust");
});

test("12 candidate canonical routes include trust consent receipt", () => {
  assert.equal(CANDIDATE_CANONICAL_ROUTES.trustConsentReceipt, "/dashboard/trust/consent-receipt");
});

test("13 demo journey includes candidate consent receipt step", () => {
  const routes = read("src/lib/founder-led-demo-routes.ts");
  assert.match(routes, /candidateConsentReceiptHref/);
  assert.match(routes, /id: "candidate_consent_receipt"/);
});

test("14 executive product proof includes candidate consent receipt link", () => {
  const proof = read("src/lib/executive-product-proof.ts");
  assert.match(proof, /candidateConsentReceiptHref/);
  assert.match(proof, /id: "candidate_consent_receipt"/);
});

test("15 trust center links to consent receipt", () => {
  const trust = read("src/components/candidate/candidate-trust-center-workspace.tsx");
  assert.match(trust, /candidate-trust-center-consent-receipt-link/);
  assert.match(trust, /candidateConsentReceiptHref/);
});

test("16 export preview links to consent receipt", () => {
  const exportPreview = read("src/components/candidate/candidate-export-preview-workspace.tsx");
  assert.match(exportPreview, /candidate-export-preview-consent-receipt-link/);
  assert.match(exportPreview, /candidateConsentReceiptHref/);
});

test("17 identity verification links to consent receipt", () => {
  const identity = read("src/components/candidate/candidate-identity-verification-workspace.tsx");
  assert.match(identity, /candidate-identity-verification-consent-receipt-link/);
  assert.match(identity, /candidateConsentReceiptHref/);
});

test("18 correction request links to consent receipt", () => {
  const corrections = read("src/components/candidate/candidate-correction-request-workspace.tsx");
  assert.match(corrections, /candidate-correction-request-consent-receipt-link/);
  assert.match(corrections, /candidateConsentReceiptHref/);
});

test("19 data portability links to consent receipt", () => {
  const portability = read("src/components/candidate/candidate-data-portability-workspace.tsx");
  assert.match(portability, /candidate-data-portability-consent-receipt-link/);
  assert.match(portability, /candidateConsentReceiptHref/);
});

test("20 revoke delete links to consent receipt", () => {
  const revokeDelete = read("src/components/candidate/candidate-revoke-delete-workspace.tsx");
  assert.match(revokeDelete, /candidate-revoke-delete-consent-receipt-link/);
  assert.match(revokeDelete, /candidateConsentReceiptHref/);
});

test("21 trust audit export links to consent receipt", () => {
  const auditExport = read("src/components/candidate/candidate-trust-audit-export-workspace.tsx");
  assert.match(auditExport, /candidate-trust-audit-export-consent-receipt-link/);
  assert.match(auditExport, /candidateConsentReceiptHref/);
});

test("22 shell/gate/fallback/layout files not modified by consent receipt feature", () => {
  const featurePaths = [
    "src/lib/candidate-consent-receipt.ts",
    "src/lib/candidate-consent-receipt-demo-data.ts",
    "src/components/candidate/consent-receipt-panel.tsx",
    "src/components/candidate/candidate-consent-receipt-workspace.tsx",
    "src/app/dashboard/trust/consent-receipt/page.tsx",
    "src/app/profile/trust/consent-receipt/page.tsx",
  ];
  const blob = featurePaths.map((p) => read(p)).join("\n");
  for (const forbidden of FORBIDDEN_SHELL_FILES) {
    assert.doesNotMatch(blob, new RegExp(forbidden.replace(/\//g, "\\/")));
  }
  assert.doesNotMatch(blob, /LightweightRouteShell/);
  assert.doesNotMatch(blob, /PersonaWorkspaceGate/);
  assert.doesNotMatch(blob, /WorkspaceRouteLayout/);
});

test("23 consent receipt copy avoids forbidden legal/outreach claims and PII emails", () => {
  const blob = [
    read("src/lib/candidate-consent-receipt-demo-data.ts"),
    read("src/components/candidate/consent-receipt-panel.tsx"),
    read("src/components/candidate/candidate-consent-receipt-workspace.tsx"),
    JSON.stringify(en.candidateConsentReceipt),
    JSON.stringify(dictionaries.pl.candidateConsentReceipt),
    JSON.stringify(buildCandidateConsentReceiptBundle()),
  ].join("\n");
  for (const pattern of FORBIDDEN_COPY) {
    assert.doesNotMatch(blob, pattern, `${pattern} in consent receipt surfaces`);
  }
});

test("24 domain kernel resolves consent receipt for demo-candidate-001", () => {
  const record = resolveKernelConsentReceipt(CANDIDATE_CONSENT_RECEIPT_DEMO_ID);
  assert.ok(record);
  assert.equal(record?.bundle.receipt_metadata.demo_only, true);
  assert.equal(record?.bundle.receipt_metadata.backend_write, false);
  assert.equal(record?.bundle.receipt_metadata.consent_receipt_preview, true);
});

test("25 covered and excluded scope arrays are non-empty on demo record", () => {
  const record = getCandidateConsentReceiptDemo();
  assert.ok(record.bundle.covered_candidate_controls.length >= 3);
  assert.ok(record.bundle.excluded_scope.length >= 3);
});

test("26 evidence references include decision memory and trust center links", () => {
  const bundle = buildCandidateConsentReceiptBundle();
  const kinds = bundle.evidence_references.map((r) => r.kind);
  assert.ok(kinds.includes("decision_memory"));
  assert.ok(kinds.includes("trust_center_consent"));
});

test("27 linked trust modules include audit export and all trust routes", () => {
  const bundle = buildCandidateConsentReceiptBundle();
  const hrefs = bundle.linked_trust_modules.map((l) => l.href);
  assert.ok(hrefs.some((h) => h.includes("/dashboard/trust")));
  assert.ok(hrefs.some((h) => h.includes("/export-preview")));
  assert.ok(hrefs.some((h) => h.includes("/identity-verification")));
  assert.ok(hrefs.some((h) => h.includes("/corrections")));
  assert.ok(hrefs.some((h) => h.includes("/portability")));
  assert.ok(hrefs.some((h) => h.includes("/revoke-delete")));
  assert.ok(hrefs.some((h) => h.includes("/audit-export")));
  assert.ok(hrefs.some((h) => h.includes("/consent-receipt")));
});

test("28 safety boundaries block tickets email and live export", () => {
  const bundle = buildCandidateConsentReceiptBundle();
  assert.ok(bundle.safety_boundaries.no_live_export);
  assert.ok(bundle.safety_boundaries.no_ticket);
  assert.ok(bundle.safety_boundaries.no_email);
  assert.ok(bundle.safety_boundaries.human_decision_required);
});

test("29 consent coverage section renders trust workflow labels", () => {
  const workspace = read("src/components/candidate/candidate-consent-receipt-workspace.tsx");
  assert.match(workspace, /workflowTrustCenter/);
  assert.match(workspace, /workflowControlCenter/);
  assert.match(workspace, /workflowExportPreview/);
  assert.match(workspace, /workflowIdentityVerification/);
  assert.match(workspace, /workflowCorrectionRequest/);
  assert.match(workspace, /workflowPortability/);
  assert.match(workspace, /workflowRevokeDelete/);
  assert.match(workspace, /workflowTrustAuditExport/);
});

test("30 download panel exposes active button test id on full page", () => {
  const panel = read("src/components/candidate/consent-receipt-panel.tsx");
  assert.match(panel, /data-testid=\{`\$\{marker\}-button`\}/);
  assert.match(panel, /downloadCandidateConsentReceiptJson/);
});

test("31 package.json exposes consent receipt test scripts", () => {
  const pkg = read("package.json");
  assert.match(pkg, /test:candidate-consent-receipt/);
  assert.match(pkg, /test:candidate-consent-receipt-browser/);
});
