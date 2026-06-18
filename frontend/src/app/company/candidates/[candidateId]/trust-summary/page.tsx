import { CompanyCandidateTrustSummaryWorkspace } from "@/components/company/company-candidate-trust-summary-workspace";

type PageProps = { params: Promise<{ candidateId: string }> };

export default async function CompanyCandidateTrustSummaryPage({ params }: PageProps) {
  const { candidateId } = await params;
  return <CompanyCandidateTrustSummaryWorkspace candidateId={candidateId} />;
}
