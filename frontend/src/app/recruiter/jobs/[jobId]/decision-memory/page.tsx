import { DecisionMemoryWorkspace } from "@/components/recruiter/decision-memory-workspace";
import { JOB_PIPELINE_DEMO_ID } from "@/lib/job-pipeline-demo-data";

type PageProps = {
  params: Promise<{ jobId: string }>;
};

export default async function RecruiterJobDecisionMemoryPage({ params }: PageProps) {
  const { jobId } = await params;
  const candidateId = jobId.trim() === JOB_PIPELINE_DEMO_ID ? "demo-candidate-001" : jobId;
  return <DecisionMemoryWorkspace candidateId={candidateId} surface="recruiter" />;
}
