import { CandidateSafeCommunicationWorkspace } from "@/components/recruiter/safe-communication-workspace";

type PageProps = {
  params: Promise<{ candidateId: string }>;
};

export default async function CompanyCandidateCommunicationPage({ params }: PageProps) {
  const { candidateId } = await params;
  return <CandidateSafeCommunicationWorkspace candidateId={candidateId} surface="company" view="communication" />;
}
