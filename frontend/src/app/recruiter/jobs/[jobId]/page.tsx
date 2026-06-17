import { JobPipelineWorkspace } from "@/components/recruiter/job-pipeline-workspace";

type PageProps = {
  params: Promise<{ jobId: string }>;
};

export default async function RecruiterJobDetailPage({ params }: PageProps) {
  const { jobId } = await params;
  return <JobPipelineWorkspace jobId={jobId} surface="recruiter" mode="overview" />;
}
