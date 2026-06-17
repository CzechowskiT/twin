import { DecisionMemoryWorkspace } from "@/components/recruiter/decision-memory-workspace";
import { JOB_PIPELINE_DEMO_ID } from "@/lib/job-pipeline-demo-data";

type PageProps = {
  params: Promise<{ roleId: string }>;
};

export default async function CompanyRoleDecisionMemoryPage({ params }: PageProps) {
  const { roleId } = await params;
  const candidateId = roleId.trim() === JOB_PIPELINE_DEMO_ID ? "demo-candidate-001" : roleId;
  return <DecisionMemoryWorkspace candidateId={candidateId} surface="company" />;
}
