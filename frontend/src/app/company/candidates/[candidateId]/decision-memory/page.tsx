import { DecisionMemoryWorkspace } from "@/components/recruiter/decision-memory-workspace";

type PageProps = {
  params: Promise<{ candidateId: string }>;
};

export default async function CompanyCandidateDecisionMemoryPage({ params }: PageProps) {
  const { candidateId } = await params;
  return <DecisionMemoryWorkspace candidateId={candidateId} surface="company" />;
}
