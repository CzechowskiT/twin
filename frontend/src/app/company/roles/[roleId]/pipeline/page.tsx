import { JobPipelineWorkspace } from "@/components/recruiter/job-pipeline-workspace";

type PageProps = {
  params: Promise<{ roleId: string }>;
};

export default async function CompanyRolePipelinePage({ params }: PageProps) {
  const { roleId } = await params;
  return <JobPipelineWorkspace jobId={roleId} surface="company" mode="pipeline" />;
}
