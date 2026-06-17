import { CandidateTeamCollaborationWorkspace } from "@/components/recruiter/team-collaboration-workspace";

type PageProps = {
  params: Promise<{ candidateId: string }>;
};

export default async function CompanyCandidateTeamPage({ params }: PageProps) {
  const { candidateId } = await params;
  return <CandidateTeamCollaborationWorkspace candidateId={candidateId} surface="company" view="team" />;
}
