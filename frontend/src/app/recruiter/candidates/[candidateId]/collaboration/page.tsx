import { CandidateCollaborationWorkspace } from "@/components/recruiter/candidate-collaboration-workspace";

type PageProps = {
  params: Promise<{ candidateId: string }>;
};

export default async function RecruiterCandidateCollaborationPage({ params }: PageProps) {
  const { candidateId } = await params;
  return <CandidateCollaborationWorkspace candidateId={candidateId} surface="recruiter" view="collaboration" />;
}
