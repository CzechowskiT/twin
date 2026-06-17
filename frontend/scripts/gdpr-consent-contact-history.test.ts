/**
 * GDPR / Consent / Contact History — route, demo data, and hard-ban guards (20 assertions).
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  CANDIDATE_TRUST_DEMO_ID,
  getCandidateTrustDemo,
} from "../src/lib/candidate-trust-demo-data";
import {
  CANDIDATE_TRUST_MARKERS,
  CANDIDATE_TRUST_PAGE_MARKER,
  candidateConsentHref,
  candidateContactHistoryHref,
  candidateTrustHref,
  jobConsentHref,
  resolveCandidateTrust,
  resolveJobTrust,
} from "../src/lib/candidate-trust";
import { JOB_PIPELINE_DEMO_ID } from "../src/lib/job-pipeline-demo-data";
import { en } from "../src/lib/i18n";

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
  /safe to contact/i,
  /automatic outreach/i,
  /automatic application/i,
  /\bwe sent\b/i,
  /email sent/i,
] as const;

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("1 recruiter trust primary route exists", () => {
  assert.ok(existsSync(join(root, "src/app/recruiter/candidates/[candidateId]/trust/page.tsx")));
});

test("2 recruiter consent alias route exists", () => {
  assert.ok(existsSync(join(root, "src/app/recruiter/candidates/[candidateId]/consent/page.tsx")));
});

test("3 recruiter contact-history alias route exists", () => {
  assert.ok(existsSync(join(root, "src/app/recruiter/candidates/[candidateId]/contact-history/page.tsx")));
});

test("4 recruiter job consent route exists", () => {
  assert.ok(existsSync(join(root, "src/app/recruiter/jobs/[jobId]/consent/page.tsx")));
});

test("5 company trust and consent routes exist", () => {
  assert.ok(existsSync(join(root, "src/app/company/candidates/[candidateId]/trust/page.tsx")));
  assert.ok(existsSync(join(root, "src/app/company/candidates/[candidateId]/consent/page.tsx")));
});

test("6 company contact-history and role consent routes exist", () => {
  assert.ok(existsSync(join(root, "src/app/company/candidates/[candidateId]/contact-history/page.tsx")));
  assert.ok(existsSync(join(root, "src/app/company/roles/[roleId]/consent/page.tsx")));
});

test("7 demo-candidate-001 resolves deterministic trust record", () => {
  const record = resolveCandidateTrust(CANDIDATE_TRUST_DEMO_ID);
  assert.ok(record);
  assert.equal(record?.id, CANDIDATE_TRUST_DEMO_ID);
  assert.equal(getCandidateTrustDemo().display_name, record?.display_name);
  assert.ok(record?.pilot_labelled);
  assert.equal(record?.consent_requires_review, true);
});

test("8 demo-role-001 resolves job-scoped trust record", () => {
  const record = resolveJobTrust(JOB_PIPELINE_DEMO_ID);
  assert.ok(record);
  assert.equal(record?.role_id, JOB_PIPELINE_DEMO_ID);
  assert.equal(record?.contact_history.length, 6);
});

test("9 workspace renders all nine section markers", () => {
  const workspace = read("src/components/recruiter/candidate-trust-workspace.tsx");
  assert.match(workspace, new RegExp(CANDIDATE_TRUST_PAGE_MARKER));
  assert.match(workspace, /CANDIDATE_TRUST_MARKERS\.header/);
  assert.match(workspace, /CANDIDATE_TRUST_MARKERS\.consentStatus/);
  assert.match(workspace, /CANDIDATE_TRUST_MARKERS\.dataSource/);
  assert.match(workspace, /CANDIDATE_TRUST_MARKERS\.contactPermission/);
  assert.match(workspace, /CANDIDATE_TRUST_MARKERS\.contactHistory/);
  assert.match(workspace, /CANDIDATE_TRUST_MARKERS\.retentionReview/);
  assert.match(workspace, /CANDIDATE_TRUST_MARKERS\.riskFlags/);
  assert.match(workspace, /CANDIDATE_TRUST_MARKERS\.boundary/);
  assert.match(workspace, /CANDIDATE_TRUST_MARKERS\.auditConnections/);
});

test("10 invalid ids resolve to not-found marker not blank shell", () => {
  assert.equal(resolveCandidateTrust("not-a-real-candidate-id"), null);
  assert.equal(resolveJobTrust("not-a-real-job-id"), null);
  const workspace = read("src/components/recruiter/candidate-trust-workspace.tsx");
  assert.match(workspace, /CANDIDATE_TRUST_MARKERS\.notFound/);
  assert.match(workspace, /GuidedEmptyState/);
  assert.match(workspace, /candidateTrust\.notFoundTitle/);
});

test("11 review and delete disabled — no backend mutation", () => {
  const workspace = read("src/components/recruiter/candidate-trust-workspace.tsx");
  assert.match(workspace, /disabled/);
  assert.match(workspace, /candidateTrust\.reviewCta/);
  assert.match(workspace, /candidateTrust\.deleteCta/);
  assert.doesNotMatch(workspace, /fetch\(/);
});

test("12 contact history has no outbound sent events", () => {
  const record = getCandidateTrustDemo();
  for (const event of record.contact_history) {
    assert.equal(event.outbound_sent, false);
  }
});

test("13 i18n keys exist for trust layer", () => {
  assert.ok(en.candidateTrust.pageEyebrow.length > 3);
  assert.ok(en.candidateTrust.notLegalAdvice.includes("not legal advice"));
  assert.ok(en.candidateTrust.boundaryBody.includes("human decision"));
});

test("14 safe link integration from candidate profile 360", () => {
  const profile360 = read("src/components/recruiter/candidate-profile-360-workspace.tsx");
  assert.match(profile360, /candidateTrustHref/);
  assert.match(profile360, /candidate-profile-360-trust-link/);
  assert.equal(
    candidateTrustHref(CANDIDATE_TRUST_DEMO_ID),
    "/recruiter/candidates/demo-candidate-001/trust",
  );
});

test("15 safe link integration from job pipeline and collaboration", () => {
  const pipeline = read("src/components/recruiter/job-pipeline-workspace.tsx");
  assert.match(pipeline, /job-pipeline-consent-link/);
  assert.match(pipeline, /candidateTrustHref/);
  const collaboration = read("src/components/recruiter/candidate-collaboration-workspace.tsx");
  assert.match(collaboration, /candidate-collaboration-trust-link/);
  assert.equal(jobConsentHref(JOB_PIPELINE_DEMO_ID), "/recruiter/jobs/demo-role-001/consent");
  assert.equal(
    candidateConsentHref(CANDIDATE_TRUST_DEMO_ID),
    "/recruiter/candidates/demo-candidate-001/consent",
  );
  assert.equal(
    candidateContactHistoryHref(CANDIDATE_TRUST_DEMO_ID),
    "/recruiter/candidates/demo-candidate-001/contact-history",
  );
});

test("16 demo journey includes trust step", () => {
  const routes = read("src/lib/founder-led-demo-routes.ts");
  assert.match(routes, /candidateTrustHref/);
  assert.match(routes, /id: "trust"/);
});

test("17 shell/gate/fallback/layout files not modified by trust feature", () => {
  const featurePaths = [
    "src/lib/candidate-trust.ts",
    "src/lib/candidate-trust-demo-data.ts",
    "src/components/recruiter/candidate-trust-workspace.tsx",
    "src/app/recruiter/candidates/[candidateId]/trust/page.tsx",
    "src/app/recruiter/jobs/[jobId]/consent/page.tsx",
    "src/app/company/roles/[roleId]/consent/page.tsx",
  ];
  const blob = featurePaths.map((p) => read(p)).join("\n");
  for (const forbidden of FORBIDDEN_SHELL_FILES) {
    assert.doesNotMatch(blob, new RegExp(forbidden.replace(/\//g, "\\/")));
  }
  assert.doesNotMatch(blob, /LightweightRouteShell/);
  assert.doesNotMatch(blob, /PersonaWorkspaceGate/);
  assert.doesNotMatch(blob, /WorkspaceRouteLayout/);
});

test("18 trust copy avoids forbidden legal/outreach claims", () => {
  const blob = [
    read("src/lib/candidate-trust-demo-data.ts"),
    read("src/components/recruiter/candidate-trust-workspace.tsx"),
    JSON.stringify(en.candidateTrust),
  ].join("\n");
  for (const pattern of FORBIDDEN_COPY) {
    assert.doesNotMatch(blob, pattern, `${pattern} in trust surfaces`);
  }
});

test("19 docs file exists for trust layer", () => {
  assert.ok(existsSync(join(root, "..", "docs/GDPR_CONSENT_CONTACT_HISTORY_2026-06-17.md")));
});

test("20 package.json exposes trust test scripts", () => {
  const pkg = read("package.json");
  assert.match(pkg, /test:gdpr-consent-contact-history/);
  assert.match(pkg, /test:gdpr-consent-contact-history-browser/);
});
