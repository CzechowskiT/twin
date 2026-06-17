import { CandidateTrustWorkspace } from "@/components/recruiter/candidate-trust-workspace";

type PageProps = {
  params: Promise<{ candidateId: string }>;
};

export default async function RecruiterCandidateConsentPage({ params }: PageProps) {
  const { candidateId } = await params;
  return <CandidateTrustWorkspace candidateId={candidateId} surface="recruiter" view="consent" />;
}
