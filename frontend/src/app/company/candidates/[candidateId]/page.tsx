import { CandidateProfile360Workspace } from "@/components/recruiter/candidate-profile-360-workspace";

type PageProps = {
  params: Promise<{ candidateId: string }>;
};

export default async function CompanyCandidateProfile360Page({ params }: PageProps) {
  const { candidateId } = await params;
  return <CandidateProfile360Workspace candidateId={candidateId} surface="company" />;
}
