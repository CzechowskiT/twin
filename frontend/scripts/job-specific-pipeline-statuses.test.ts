/**
 * Job-Specific Pipeline + Process Statuses — route, demo data, and hard-ban guards (15 assertions).
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  getJobPipelineDemo,
  JOB_PIPELINE_DEMO_ID,
  JOB_PIPELINE_STAGE_ORDER,
} from "../src/lib/job-pipeline-demo-data";
import {
  JOB_PIPELINE_MARKERS,
  JOB_PIPELINE_PAGE_MARKER,
  jobPipelineHref,
  resolveJobPipeline,
} from "../src/lib/job-pipeline";
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

test("1 recruiter job pipeline route page exists", () => {
  assert.ok(existsSync(join(root, "src/app/recruiter/jobs/[jobId]/pipeline/page.tsx")));
});

test("2 recruiter job overview route exists", () => {
  assert.ok(existsSync(join(root, "src/app/recruiter/jobs/[jobId]/page.tsx")));
});

test("3 company roles pipeline alias route exists", () => {
  assert.ok(existsSync(join(root, "src/app/company/roles/[roleId]/pipeline/page.tsx")));
});

test("4 demo-role-001 resolves deterministic pilot record", () => {
  const record = resolveJobPipeline(JOB_PIPELINE_DEMO_ID);
  assert.ok(record);
  assert.equal(record?.id, JOB_PIPELINE_DEMO_ID);
  assert.equal(getJobPipelineDemo().title, record?.title);
  assert.ok(record?.pilot_labelled);
});

test("5 seven pipeline stages defined in order", () => {
  assert.equal(JOB_PIPELINE_STAGE_ORDER.length, 7);
  assert.deepEqual(JOB_PIPELINE_STAGE_ORDER, [
    "new",
    "review",
    "shortlist",
    "interview",
    "offer",
    "rejected",
    "nurture",
  ]);
});

test("6 workspace component renders all section markers", () => {
  const workspace = read("src/components/recruiter/job-pipeline-workspace.tsx");
  assert.match(workspace, new RegExp(JOB_PIPELINE_PAGE_MARKER));
  assert.match(workspace, /JOB_PIPELINE_MARKERS\.header/);
  assert.match(workspace, /JOB_PIPELINE_MARKERS\.board/);
  assert.match(workspace, /JOB_PIPELINE_MARKERS\.stageActions/);
  assert.match(workspace, /JOB_PIPELINE_MARKERS\.decisionMemory/);
  assert.match(workspace, /JOB_PIPELINE_MARKERS\.boundary/);
  assert.match(workspace, /JOB_PIPELINE_MARKERS\.candidateCard/);
});

test("7 invalid job id resolves to not-found marker not blank shell", () => {
  assert.equal(resolveJobPipeline("not-a-real-job-id"), null);
  const workspace = read("src/components/recruiter/job-pipeline-workspace.tsx");
  assert.match(workspace, /JOB_PIPELINE_MARKERS\.notFound/);
  assert.match(workspace, /GuidedEmptyState/);
  assert.match(workspace, /jobPipeline\.notFoundTitle/);
});

test("8 demo-candidate-001 linked to Profile 360 in pipeline data", () => {
  const record = getJobPipelineDemo();
  const linked = record.candidates.find((c) => c.id === "demo-candidate-001");
  assert.ok(linked);
  assert.equal(linked?.profile_link.profile_360_connected, true);
  assert.equal(linked?.profile_link.candidate_id, "demo-candidate-001");
});

test("9 stage actions are disabled with no backend mutation", () => {
  const workspace = read("src/components/recruiter/job-pipeline-workspace.tsx");
  assert.match(workspace, /disabled/);
  assert.match(workspace, /jobPipeline\.actionMoveToReview/);
  assert.doesNotMatch(workspace, /fetch\(/);
});

test("10 i18n keys exist for job pipeline", () => {
  assert.ok(en.jobPipeline.pageEyebrow.length > 3);
  assert.ok(en.jobPipeline.boundaryBody.includes("auto-apply"));
  assert.ok(en.jobPipeline.stageNew.includes("New"));
});

test("11 safe link integration from talent radar and demo journey", () => {
  const radarClient = read("src/app/recruiter/talent-radar/recruiter-talent-radar-client.tsx");
  const routes = read("src/lib/founder-led-demo-routes.ts");
  assert.match(radarClient, /jobPipelineHref/);
  assert.match(routes, /job_pipeline/);
  assert.equal(jobPipelineHref(JOB_PIPELINE_DEMO_ID), "/recruiter/jobs/demo-role-001/pipeline");
});

test("12 recruiter jobs module has demo pipeline link", () => {
  const jobsPage = read("src/app/recruiter/jobs/page.tsx");
  assert.match(jobsPage, /demo-role-001\/pipeline/);
  assert.match(jobsPage, /recruiter-jobs-demo-pipeline-link/);
});

test("13 company roles module has demo pipeline link", () => {
  const rolesPage = read("src/app/company/roles/page.tsx");
  assert.match(rolesPage, /demo-role-001\/pipeline/);
});

test("14 demo has 4-8 candidates spread across stages", () => {
  const record = getJobPipelineDemo();
  assert.ok(record.candidates.length >= 4);
  assert.ok(record.candidates.length <= 8);
  const stages = new Set(record.candidates.map((c) => c.stage));
  assert.ok(stages.size >= 4);
});

test("15 shell/gate/fallback/layout files not modified by job pipeline feature", () => {
  const featurePaths = [
    "src/lib/job-pipeline.ts",
    "src/lib/job-pipeline-demo-data.ts",
    "src/components/recruiter/job-pipeline-workspace.tsx",
    "src/app/recruiter/jobs/[jobId]/page.tsx",
    "src/app/recruiter/jobs/[jobId]/pipeline/page.tsx",
    "src/app/company/roles/[roleId]/pipeline/page.tsx",
  ];
  const blob = featurePaths.map((p) => read(p)).join("\n");
  for (const forbidden of FORBIDDEN_SHELL_FILES) {
    assert.doesNotMatch(blob, new RegExp(forbidden.replace(/\//g, "\\/")));
  }
  assert.doesNotMatch(blob, /LightweightRouteShell/);
  assert.doesNotMatch(blob, /PersonaWorkspaceGate/);
  assert.doesNotMatch(blob, /WorkspaceRouteLayout/);
});
