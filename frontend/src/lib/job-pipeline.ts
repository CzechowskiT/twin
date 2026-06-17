/** Job-Specific Pipeline + Process Statuses — recruiter/company system-of-record (pilot). */

import {
  getJobPipelineDemo,
  JOB_PIPELINE_DEMO_ID,
  type JobPipelineRecord,
  type JobPipelineStageId,
} from "@/lib/job-pipeline-demo-data";

export { JOB_PIPELINE_DEMO_ID, JOB_PIPELINE_STAGE_ORDER } from "@/lib/job-pipeline-demo-data";
export type { JobPipelineRecord, JobPipelineStageId } from "@/lib/job-pipeline-demo-data";

export const JOB_PIPELINE_PAGE_MARKER = "job-pipeline-page";

export const JOB_PIPELINE_MARKERS = {
  page: JOB_PIPELINE_PAGE_MARKER,
  header: "job-pipeline-header",
  board: "job-pipeline-board",
  column: "job-pipeline-column",
  candidateCard: "job-pipeline-candidate-card",
  stageActions: "job-pipeline-stage-actions",
  decisionMemory: "job-pipeline-decision-memory",
  boundary: "job-pipeline-boundary",
  notFound: "job-pipeline-not-found",
  pilotBadge: "job-pipeline-pilot-badge",
  jobOverview: "job-pipeline-job-overview",
} as const;

export const RECRUITER_JOBS_ROUTE = "/recruiter/jobs";
export const COMPANY_ROLES_ROUTE = "/company/roles";

export type JobPipelineSurface = "recruiter" | "company";

export function jobPipelineHref(
  jobId: string,
  surface: JobPipelineSurface = "recruiter",
): string {
  const base = surface === "company" ? COMPANY_ROLES_ROUTE : RECRUITER_JOBS_ROUTE;
  return `${base}/${encodeURIComponent(jobId)}/pipeline`;
}

export function jobOverviewHref(
  jobId: string,
  surface: JobPipelineSurface = "recruiter",
): string {
  const base = surface === "company" ? COMPANY_ROLES_ROUTE : RECRUITER_JOBS_ROUTE;
  return `${base}/${encodeURIComponent(jobId)}`;
}

export function jobsListHref(surface: JobPipelineSurface = "recruiter"): string {
  return surface === "company" ? COMPANY_ROLES_ROUTE : RECRUITER_JOBS_ROUTE;
}

export function resolveJobPipeline(jobId: string): JobPipelineRecord | null {
  const trimmed = jobId.trim();
  if (!trimmed) return null;
  if (trimmed === JOB_PIPELINE_DEMO_ID) {
    return getJobPipelineDemo();
  }
  return null;
}

export function isJobPipelineDemoId(jobId: string): boolean {
  return jobId.trim() === JOB_PIPELINE_DEMO_ID;
}

export function stageColumnTestId(stage: JobPipelineStageId): string {
  return `job-pipeline-column-${stage}`;
}
