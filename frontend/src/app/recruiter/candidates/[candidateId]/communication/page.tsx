import { CandidateSafeCommunicationWorkspace } from "@/components/recruiter/safe-communication-workspace";

type PageProps = {
  params: Promise<{ candidateId: string }>;
};

export default async function RecruiterCandidateCommunicationPage({ params }: PageProps) {
  const { candidateId } = await params;
  return <CandidateSafeCommunicationWorkspace candidateId={candidateId} surface="recruiter" view="communication" />;
}
