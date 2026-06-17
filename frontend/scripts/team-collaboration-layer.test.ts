/**
 * Team Collaboration Layer — route, demo data, and hard-ban guards (18 assertions).
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  getCandidateTeamCollaborationDemo,
  TEAM_COLLABORATION_CANDIDATE_DEMO_ID,
} from "../src/lib/team-collaboration-demo-data";
import { JOB_PIPELINE_DEMO_ID } from "../src/lib/job-pipeline-demo-data";
import {
  candidateTeamHref,
  jobTasksHref,
  jobTeamHref,
  resolveCandidateTeamCollaboration,
  resolveJobTeamCollaboration,
  TEAM_COLLABORATION_MARKERS,
  TEAM_COLLABORATION_PAGE_MARKER,
} from "../src/lib/team-collaboration";
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

test("1 recruiter candidate team route exists", () => {
  assert.ok(existsSync(join(root, "src/app/recruiter/candidates/[candidateId]/team/page.tsx")));
});

test("2 company candidate team route exists", () => {
  assert.ok(existsSync(join(root, "src/app/company/candidates/[candidateId]/team/page.tsx")));
});

test("3 recruiter job team and tasks routes exist", () => {
  assert.ok(existsSync(join(root, "src/app/recruiter/jobs/[jobId]/team/page.tsx")));
  assert.ok(existsSync(join(root, "src/app/recruiter/jobs/[jobId]/tasks/page.tsx")));
});

test("4 company role team and tasks routes exist", () => {
  assert.ok(existsSync(join(root, "src/app/company/roles/[roleId]/team/page.tsx")));
  assert.ok(existsSync(join(root, "src/app/company/roles/[roleId]/tasks/page.tsx")));
});

test("5 demo-candidate-001 resolves deterministic team collaboration record", () => {
  const record = resolveCandidateTeamCollaboration(TEAM_COLLABORATION_CANDIDATE_DEMO_ID);
  assert.ok(record);
  assert.equal(record?.id, TEAM_COLLABORATION_CANDIDATE_DEMO_ID);
  assert.equal(getCandidateTeamCollaborationDemo().display_name, record?.display_name);
  assert.ok(record?.pilot_labelled);
});

test("6 demo-role-001 resolves job-scoped team collaboration record", () => {
  const record = resolveJobTeamCollaboration(JOB_PIPELINE_DEMO_ID);
  assert.ok(record);
  assert.equal(record?.role_id, JOB_PIPELINE_DEMO_ID);
  assert.ok(record?.follow_up_tasks.length >= 3);
});

test("7 workspace renders all eight section markers", () => {
  const workspace = read("src/components/recruiter/team-collaboration-workspace.tsx");
  assert.match(workspace, new RegExp(TEAM_COLLABORATION_PAGE_MARKER));
  assert.match(workspace, /TEAM_COLLABORATION_MARKERS\.header/);
  assert.match(workspace, /TEAM_COLLABORATION_MARKERS\.activityTimeline/);
  assert.match(workspace, /TEAM_COLLABORATION_MARKERS\.assignments/);
  assert.match(workspace, /TEAM_COLLABORATION_MARKERS\.followUpTasks/);
  assert.match(workspace, /TEAM_COLLABORATION_MARKERS\.openQuestions/);
  assert.match(workspace, /TEAM_COLLABORATION_MARKERS\.decisionChecklist/);
  assert.match(workspace, /TEAM_COLLABORATION_MARKERS\.boundary/);
  assert.match(workspace, /TEAM_COLLABORATION_MARKERS\.auditConnections/);
});

test("8 invalid ids resolve to not-found marker not blank shell", () => {
  assert.equal(resolveCandidateTeamCollaboration("not-a-real-candidate-id"), null);
  assert.equal(resolveJobTeamCollaboration("not-a-real-job-id"), null);
  const workspace = read("src/components/recruiter/team-collaboration-workspace.tsx");
  assert.match(workspace, /TEAM_COLLABORATION_MARKERS\.notFound/);
  assert.match(workspace, /GuidedEmptyState/);
  assert.match(workspace, /teamCollaboration\.notFoundTitle/);
});

test("9 reassign and task actions disabled — no backend mutation", () => {
  const workspace = read("src/components/recruiter/team-collaboration-workspace.tsx");
  assert.match(workspace, /disabled/);
  assert.match(workspace, /teamCollaboration\.reassignCta/);
  assert.match(workspace, /teamCollaboration\.taskActionCta/);
  assert.doesNotMatch(workspace, /fetch\(/);
});

test("10 i18n keys exist for team collaboration layer", () => {
  assert.ok(en.teamCollaboration.pageEyebrow.length > 3);
  assert.ok(en.teamCollaboration.boundaryBody.includes("auto-apply"));
  assert.ok(en.teamCollaboration.checkHumanDecision.length > 3);
});

test("11 safe link integration from candidate profile 360 activity", () => {
  const profile360 = read("src/components/recruiter/candidate-profile-360-workspace.tsx");
  assert.match(profile360, /candidateTeamHref/);
  assert.match(profile360, /candidate-profile-360-team-link/);
  assert.equal(
    candidateTeamHref(TEAM_COLLABORATION_CANDIDATE_DEMO_ID),
    "/recruiter/candidates/demo-candidate-001/team",
  );
});

test("12 safe link integration from job pipeline decision memory", () => {
  const pipeline = read("src/components/recruiter/job-pipeline-workspace.tsx");
  assert.match(pipeline, /job-pipeline-decision-memory-team-link/);
  assert.match(pipeline, /job-pipeline-decision-memory-tasks-link/);
  assert.equal(jobTeamHref(JOB_PIPELINE_DEMO_ID), "/recruiter/jobs/demo-role-001/team");
  assert.equal(jobTasksHref(JOB_PIPELINE_DEMO_ID), "/recruiter/jobs/demo-role-001/tasks");
});

test("13 safe link integration from collaboration and trust audit", () => {
  const collaboration = read("src/components/recruiter/candidate-collaboration-workspace.tsx");
  assert.match(collaboration, /candidate-collaboration-team-link/);
  const trust = read("src/components/recruiter/candidate-trust-workspace.tsx");
  assert.match(trust, /candidate-trust-team-link/);
});

test("14 demo journey includes team collaboration step", () => {
  const routes = read("src/lib/founder-led-demo-routes.ts");
  assert.match(routes, /team_collaboration/);
  assert.match(routes, /candidateTeamHref/);
});

test("15 tasks route uses tasks view on job workspace", () => {
  const tasksPage = read("src/app/recruiter/jobs/[jobId]/tasks/page.tsx");
  assert.match(tasksPage, /view="tasks"/);
  const companyTasks = read("src/app/company/roles/[roleId]/tasks/page.tsx");
  assert.match(companyTasks, /view="tasks"/);
});

test("16 demo data file exists with no PII patterns", () => {
  const demo = read("src/lib/team-collaboration-demo-data.ts");
  assert.match(demo, /pilot_labelled: true/);
  assert.match(demo, /sample/);
  assert.doesNotMatch(demo, /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
});

test("17 forbidden copy not present in team collaboration workspace", () => {
  const workspace = read("src/components/recruiter/team-collaboration-workspace.tsx");
  const forbidden = [
    "message sent",
    "email sent",
    "automatic outreach",
    "automatic application",
    "auto-rejected",
    "AI decided",
    "GDPR compliant",
    "legally compliant",
  ];
  const lower = workspace.toLowerCase();
  for (const phrase of forbidden) {
    assert.doesNotMatch(lower, new RegExp(phrase.replace(/\s/g, "\\s")));
  }
});

test("18 shell/gate/fallback/layout files not modified by team collaboration feature", () => {
  const featurePaths = [
    "src/lib/team-collaboration.ts",
    "src/lib/team-collaboration-demo-data.ts",
    "src/components/recruiter/team-collaboration-workspace.tsx",
    "src/app/recruiter/candidates/[candidateId]/team/page.tsx",
    "src/app/recruiter/jobs/[jobId]/team/page.tsx",
    "src/app/company/roles/[roleId]/tasks/page.tsx",
  ];
  const blob = featurePaths.map((p) => read(p)).join("\n");
  for (const forbidden of FORBIDDEN_SHELL_FILES) {
    assert.doesNotMatch(blob, new RegExp(forbidden.replace(/\//g, "\\/")));
  }
  assert.doesNotMatch(blob, /LightweightRouteShell/);
  assert.doesNotMatch(blob, /PersonaWorkspaceGate/);
  assert.doesNotMatch(blob, /WorkspaceRouteLayout/);
});
