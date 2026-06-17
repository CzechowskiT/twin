import { CandidateTrustWorkspace } from "@/components/recruiter/candidate-trust-workspace";

type PageProps = {
  params: Promise<{ candidateId: string }>;
};

export default async function CompanyCandidateContactHistoryPage({ params }: PageProps) {
  const { candidateId } = await params;
  return <CandidateTrustWorkspace candidateId={candidateId} surface="company" view="contact-history" />;
}
