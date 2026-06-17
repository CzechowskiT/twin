/**
 * Notes, Feedback, Scorecards & Forms — route, demo data, and hard-ban guards (17 assertions).
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  CANDIDATE_COLLABORATION_DEMO_ID,
  getCandidateCollaborationDemo,
} from "../src/lib/candidate-collaboration-demo-data";
import {
  CANDIDATE_COLLABORATION_MARKERS,
  CANDIDATE_COLLABORATION_PAGE_MARKER,
  candidateCollaborationHref,
  candidateFeedbackHref,
  candidateScorecardHref,
  jobFeedbackHref,
  jobScorecardsHref,
  resolveCandidateCollaboration,
  resolveJobCollaboration,
} from "../src/lib/candidate-collaboration";
import { JOB_PIPELINE_DEMO_ID } from "../src/lib/job-pipeline-demo-data";
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

test("1 recruiter collaboration primary route exists", () => {
  assert.ok(existsSync(join(root, "src/app/recruiter/candidates/[candidateId]/collaboration/page.tsx")));
});

test("2 recruiter notes alias route exists", () => {
  assert.ok(existsSync(join(root, "src/app/recruiter/candidates/[candidateId]/notes/page.tsx")));
});

test("3 recruiter feedback alias route exists", () => {
  assert.ok(existsSync(join(root, "src/app/recruiter/candidates/[candidateId]/feedback/page.tsx")));
});

test("4 recruiter scorecard alias route exists", () => {
  assert.ok(existsSync(join(root, "src/app/recruiter/candidates/[candidateId]/scorecard/page.tsx")));
});

test("5 company collaboration and feedback routes exist", () => {
  assert.ok(existsSync(join(root, "src/app/company/candidates/[candidateId]/collaboration/page.tsx")));
  assert.ok(existsSync(join(root, "src/app/company/candidates/[candidateId]/feedback/page.tsx")));
});

test("6 recruiter job feedback and scorecards routes exist", () => {
  assert.ok(existsSync(join(root, "src/app/recruiter/jobs/[jobId]/feedback/page.tsx")));
  assert.ok(existsSync(join(root, "src/app/recruiter/jobs/[jobId]/scorecards/page.tsx")));
});

test("7 company role feedback and scorecards routes exist", () => {
  assert.ok(existsSync(join(root, "src/app/company/roles/[roleId]/feedback/page.tsx")));
  assert.ok(existsSync(join(root, "src/app/company/roles/[roleId]/scorecards/page.tsx")));
});

test("8 demo-candidate-001 resolves deterministic collaboration record", () => {
  const record = resolveCandidateCollaboration(CANDIDATE_COLLABORATION_DEMO_ID);
  assert.ok(record);
  assert.equal(record?.id, CANDIDATE_COLLABORATION_DEMO_ID);
  assert.equal(getCandidateCollaborationDemo().display_name, record?.display_name);
  assert.ok(record?.pilot_labelled);
});

test("9 demo-role-001 resolves job-scoped collaboration record", () => {
  const record = resolveJobCollaboration(JOB_PIPELINE_DEMO_ID);
  assert.ok(record);
  assert.equal(record?.role_id, JOB_PIPELINE_DEMO_ID);
  assert.equal(record?.scorecard.length, 9);
});

test("10 workspace renders all seven section markers", () => {
  const workspace = read("src/components/recruiter/candidate-collaboration-workspace.tsx");
  assert.match(workspace, new RegExp(CANDIDATE_COLLABORATION_PAGE_MARKER));
  assert.match(workspace, /CANDIDATE_COLLABORATION_MARKERS\.header/);
  assert.match(workspace, /CANDIDATE_COLLABORATION_MARKERS\.recruiterNotes/);
  assert.match(workspace, /CANDIDATE_COLLABORATION_MARKERS\.hiringFeedback/);
  assert.match(workspace, /CANDIDATE_COLLABORATION_MARKERS\.scorecard/);
  assert.match(workspace, /CANDIDATE_COLLABORATION_MARKERS\.formsPreview/);
  assert.match(workspace, /CANDIDATE_COLLABORATION_MARKERS\.decisionMemory/);
  assert.match(workspace, /CANDIDATE_COLLABORATION_MARKERS\.boundary/);
});

test("11 invalid ids resolve to not-found marker not blank shell", () => {
  assert.equal(resolveCandidateCollaboration("not-a-real-candidate-id"), null);
  assert.equal(resolveJobCollaboration("not-a-real-job-id"), null);
  const workspace = read("src/components/recruiter/candidate-collaboration-workspace.tsx");
  assert.match(workspace, /CANDIDATE_COLLABORATION_MARKERS\.notFound/);
  assert.match(workspace, /GuidedEmptyState/);
  assert.match(workspace, /candidateCollaboration\.notFoundTitle/);
});

test("12 add note and form submit disabled — no backend mutation", () => {
  const workspace = read("src/components/recruiter/candidate-collaboration-workspace.tsx");
  assert.match(workspace, /disabled/);
  assert.match(workspace, /candidateCollaboration\.addNoteCta/);
  assert.match(workspace, /candidateCollaboration\.formSubmitDisabled/);
  assert.doesNotMatch(workspace, /fetch\(/);
});

test("13 i18n keys exist for collaboration layer", () => {
  assert.ok(en.candidateCollaboration.pageEyebrow.length > 3);
  assert.ok(en.candidateCollaboration.boundaryBody.includes("auto-apply"));
  assert.ok(en.candidateCollaboration.criterionTechnicalFit.length > 3);
});

test("14 safe link integration from candidate profile 360", () => {
  const profile360 = read("src/components/recruiter/candidate-profile-360-workspace.tsx");
  assert.match(profile360, /candidateCollaborationHref/);
  assert.match(profile360, /candidate-profile-360-collaboration-link/);
  assert.equal(
    candidateCollaborationHref(CANDIDATE_COLLABORATION_DEMO_ID),
    "/recruiter/candidates/demo-candidate-001/collaboration",
  );
});

test("15 safe link integration from job pipeline", () => {
  const pipeline = read("src/components/recruiter/job-pipeline-workspace.tsx");
  assert.match(pipeline, /job-pipeline-decision-memory-feedback-link/);
  assert.match(pipeline, /job-pipeline-scorecard-link/);
  assert.equal(jobFeedbackHref(JOB_PIPELINE_DEMO_ID), "/recruiter/jobs/demo-role-001/feedback");
  assert.equal(jobScorecardsHref(JOB_PIPELINE_DEMO_ID), "/recruiter/jobs/demo-role-001/scorecards");
  assert.equal(
    candidateFeedbackHref(CANDIDATE_COLLABORATION_DEMO_ID),
    "/recruiter/candidates/demo-candidate-001/feedback",
  );
  assert.equal(
    candidateScorecardHref(CANDIDATE_COLLABORATION_DEMO_ID),
    "/recruiter/candidates/demo-candidate-001/scorecard",
  );
});

test("16 demo journey includes collaboration step", () => {
  const routes = read("src/lib/founder-led-demo-routes.ts");
  assert.match(routes, /collaboration/);
  assert.match(routes, /candidateCollaborationHref/);
});

test("17 shell/gate/fallback/layout files not modified by collaboration feature", () => {
  const featurePaths = [
    "src/lib/candidate-collaboration.ts",
    "src/lib/candidate-collaboration-demo-data.ts",
    "src/components/recruiter/candidate-collaboration-workspace.tsx",
    "src/app/recruiter/candidates/[candidateId]/collaboration/page.tsx",
    "src/app/recruiter/jobs/[jobId]/feedback/page.tsx",
    "src/app/company/roles/[roleId]/scorecards/page.tsx",
  ];
  const blob = featurePaths.map((p) => read(p)).join("\n");
  for (const forbidden of FORBIDDEN_SHELL_FILES) {
    assert.doesNotMatch(blob, new RegExp(forbidden.replace(/\//g, "\\/")));
  }
  assert.doesNotMatch(blob, /LightweightRouteShell/);
  assert.doesNotMatch(blob, /PersonaWorkspaceGate/);
  assert.doesNotMatch(blob, /WorkspaceRouteLayout/);
});
