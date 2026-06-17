/**
 * Safe Email Communication Layer — route, demo data, and hard-ban guards (20 assertions).
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  getCandidateSafeCommunicationDemo,
  SAFE_COMMUNICATION_CANDIDATE_DEMO_ID,
} from "../src/lib/safe-communication-demo-data";
import { JOB_PIPELINE_DEMO_ID } from "../src/lib/job-pipeline-demo-data";
import {
  candidateCommunicationHref,
  jobCommunicationHref,
  jobDraftsHref,
  resolveCandidateSafeCommunication,
  resolveJobSafeCommunication,
  SAFE_COMMUNICATION_MARKERS,
  SAFE_COMMUNICATION_PAGE_MARKER,
} from "../src/lib/safe-communication";
import { en } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const FORBIDDEN_SHELL_FILES = [
  "src/components/lightweight-route-shell.tsx",
  "src/components/persona-workspace-gate.tsx",
  "src/components/workspace-route-layout.tsx",
  "src/app/dashboard/layout.tsx",
] as const;

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("1 recruiter candidate communication route exists", () => {
  assert.ok(existsSync(join(root, "src/app/recruiter/candidates/[candidateId]/communication/page.tsx")));
});

test("2 company candidate communication route exists", () => {
  assert.ok(existsSync(join(root, "src/app/company/candidates/[candidateId]/communication/page.tsx")));
});

test("3 recruiter job communication and drafts routes exist", () => {
  assert.ok(existsSync(join(root, "src/app/recruiter/jobs/[jobId]/communication/page.tsx")));
  assert.ok(existsSync(join(root, "src/app/recruiter/jobs/[jobId]/drafts/page.tsx")));
});

test("4 company role communication and drafts routes exist", () => {
  assert.ok(existsSync(join(root, "src/app/company/roles/[roleId]/communication/page.tsx")));
  assert.ok(existsSync(join(root, "src/app/company/roles/[roleId]/drafts/page.tsx")));
});

test("5 demo-candidate-001 resolves deterministic safe communication record", () => {
  const record = resolveCandidateSafeCommunication(SAFE_COMMUNICATION_CANDIDATE_DEMO_ID);
  assert.ok(record);
  assert.equal(record?.id, SAFE_COMMUNICATION_CANDIDATE_DEMO_ID);
  assert.equal(getCandidateSafeCommunicationDemo().display_name, record?.display_name);
  assert.ok(record?.pilot_labelled);
  assert.equal(record?.communication_status, "draft_only");
});

test("6 demo-role-001 resolves job-scoped communication record with five drafts", () => {
  const record = resolveJobSafeCommunication(JOB_PIPELINE_DEMO_ID);
  assert.ok(record);
  assert.equal(record?.role_id, JOB_PIPELINE_DEMO_ID);
  assert.equal(record?.drafts.length, 5);
});

test("7 workspace renders all eight section markers", () => {
  const workspace = read("src/components/recruiter/safe-communication-workspace.tsx");
  assert.match(workspace, new RegExp(SAFE_COMMUNICATION_PAGE_MARKER));
  assert.match(workspace, /SAFE_COMMUNICATION_MARKERS\.header/);
  assert.match(workspace, /SAFE_COMMUNICATION_MARKERS\.consentWarning/);
  assert.match(workspace, /SAFE_COMMUNICATION_MARKERS\.draftLibrary/);
  assert.match(workspace, /SAFE_COMMUNICATION_MARKERS\.draftPreview/);
  assert.match(workspace, /SAFE_COMMUNICATION_MARKERS\.actions/);
  assert.match(workspace, /SAFE_COMMUNICATION_MARKERS\.internalUpdate/);
  assert.match(workspace, /SAFE_COMMUNICATION_MARKERS\.communicationAudit/);
  assert.match(workspace, /SAFE_COMMUNICATION_MARKERS\.humanDecisionBoundary/);
});

test("8 invalid ids resolve to not-found marker not blank shell", () => {
  assert.equal(resolveCandidateSafeCommunication("not-a-real-candidate-id"), null);
  assert.equal(resolveJobSafeCommunication("not-a-real-job-id"), null);
  const workspace = read("src/components/recruiter/safe-communication-workspace.tsx");
  assert.match(workspace, /SAFE_COMMUNICATION_MARKERS\.notFound/);
  assert.match(workspace, /GuidedEmptyState/);
  assert.match(workspace, /safeCommunication\.notFoundTitle/);
});

test("9 send schedule sequence mailbox disabled — no outbound", () => {
  const workspace = read("src/components/recruiter/safe-communication-workspace.tsx");
  assert.match(workspace, /disabled/);
  assert.match(workspace, /safeCommunication\.actionSend/);
  assert.match(workspace, /safeCommunication\.notLive/);
  assert.match(workspace, /safe-communication-copy-draft/);
  assert.doesNotMatch(workspace, /fetch\(/);
});

test("10 i18n keys exist for safe communication layer", () => {
  assert.ok(en.safeCommunication.pageEyebrow.length > 3);
  assert.ok(en.safeCommunication.boundaryBody.includes("automatic outreach"));
  assert.ok(en.safeCommunication.consentWarningLead.includes("review"));
  assert.ok(en.safeCommunication.draftOnlyStatus.includes("not sent"));
});

test("11 safe link integration from candidate profile 360 activity", () => {
  const profile360 = read("src/components/recruiter/candidate-profile-360-workspace.tsx");
  assert.match(profile360, /candidateCommunicationHref/);
  assert.match(profile360, /candidate-profile-360-communication-link/);
  assert.equal(
    candidateCommunicationHref(SAFE_COMMUNICATION_CANDIDATE_DEMO_ID),
    "/recruiter/candidates/demo-candidate-001/communication",
  );
});

test("12 safe link integration from job pipeline decision memory", () => {
  const pipeline = read("src/components/recruiter/job-pipeline-workspace.tsx");
  assert.match(pipeline, /job-pipeline-decision-memory-communication-link/);
  assert.match(pipeline, /job-pipeline-decision-memory-drafts-link/);
  assert.equal(jobCommunicationHref(JOB_PIPELINE_DEMO_ID), "/recruiter/jobs/demo-role-001/communication");
  assert.equal(jobDraftsHref(JOB_PIPELINE_DEMO_ID), "/recruiter/jobs/demo-role-001/drafts");
});

test("13 safe link integration from collaboration feedback and trust contact", () => {
  const collaboration = read("src/components/recruiter/candidate-collaboration-workspace.tsx");
  assert.match(collaboration, /candidate-collaboration-communication-link/);
  const trust = read("src/components/recruiter/candidate-trust-workspace.tsx");
  assert.match(trust, /candidate-trust-communication-link/);
});

test("14 team collaboration prepare communication draft task link", () => {
  const team = read("src/components/recruiter/team-collaboration-workspace.tsx");
  assert.match(team, /team-collaboration-communication-task-link/);
  assert.match(team, /team-collaboration-communication-link/);
  const demo = read("src/lib/team-collaboration-demo-data.ts");
  assert.match(demo, /Prepare communication draft/);
  assert.match(demo, /communication\/drafts/);
});

test("15 demo journey includes safe communication step", () => {
  const routes = read("src/lib/founder-led-demo-routes.ts");
  assert.match(routes, /safe_communication/);
  assert.match(routes, /candidateCommunicationHref/);
});

test("16 drafts route uses drafts view on job workspace", () => {
  const draftsPage = read("src/app/recruiter/jobs/[jobId]/drafts/page.tsx");
  assert.match(draftsPage, /view="drafts"/);
  const companyDrafts = read("src/app/company/roles/[roleId]/drafts/page.tsx");
  assert.match(companyDrafts, /view="drafts"/);
});

test("17 demo data file exists with no PII patterns", () => {
  const demo = read("src/lib/safe-communication-demo-data.ts");
  assert.match(demo, /pilot_labelled: true/);
  assert.match(demo, /sample/);
  assert.match(demo, /draft_only/);
  assert.doesNotMatch(demo, /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
});

test("18 forbidden copy not present in safe communication workspace", () => {
  const workspace = read("src/components/recruiter/safe-communication-workspace.tsx");
  const forbidden = [
    "email sent",
    "message sent",
    "sent successfully",
    "automatic outreach",
    "automatic application",
    "sequence started",
    "mailbox connected",
    "AI contacted",
    "GDPR compliant",
    "legally compliant",
  ];
  const lower = workspace.toLowerCase();
  for (const phrase of forbidden) {
    assert.doesNotMatch(lower, new RegExp(phrase.replace(/\s/g, "\\s")));
  }
});

test("19 required boundary phrases present in i18n", () => {
  const required = ["draft only", "not sent", "human review required", "contact requires review", "not live", "demo-only"];
  const blob = JSON.stringify(en.safeCommunication).toLowerCase();
  for (const phrase of required) {
    assert.match(blob, new RegExp(phrase.replace(/-/g, "[-\\s]")));
  }
});

test("20 shell/gate/fallback/layout files not modified by safe communication feature", () => {
  const featurePaths = [
    "src/lib/safe-communication.ts",
    "src/lib/safe-communication-demo-data.ts",
    "src/components/recruiter/safe-communication-workspace.tsx",
    "src/app/recruiter/candidates/[candidateId]/communication/page.tsx",
    "src/app/recruiter/jobs/[jobId]/drafts/page.tsx",
    "src/app/company/roles/[roleId]/communication/page.tsx",
  ];
  const blob = featurePaths.map((p) => read(p)).join("\n");
  for (const forbidden of FORBIDDEN_SHELL_FILES) {
    assert.doesNotMatch(blob, new RegExp(forbidden.replace(/\//g, "\\/")));
  }
  assert.doesNotMatch(blob, /LightweightRouteShell/);
  assert.doesNotMatch(blob, /PersonaWorkspaceGate/);
  assert.doesNotMatch(blob, /WorkspaceRouteLayout/);
});
