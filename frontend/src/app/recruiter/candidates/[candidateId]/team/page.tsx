import { CandidateTeamCollaborationWorkspace } from "@/components/recruiter/team-collaboration-workspace";

type PageProps = {
  params: Promise<{ candidateId: string }>;
};

export default async function RecruiterCandidateTeamPage({ params }: PageProps) {
  const { candidateId } = await params;
  return <CandidateTeamCollaborationWorkspace candidateId={candidateId} surface="recruiter" view="team" />;
}
