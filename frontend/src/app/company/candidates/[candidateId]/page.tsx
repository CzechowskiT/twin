import { CandidateProfile360Workspace } from "@/components/recruiter/candidate-profile-360-workspace";
import { CompanyIntelligenceSubset } from "@/components/company/company-intelligence-subset";

type PageProps = {
  params: Promise<{ candidateId: string }>;
};

export default async function CompanyCandidateProfile360Page({ params }: PageProps) {
  const { candidateId } = await params;
  return (
    <>
      <CandidateProfile360Workspace candidateId={candidateId} surface="company" />
      <div className="px-4 pb-10">
        <CompanyIntelligenceSubset candidateId={candidateId} />
      </div>
    </>
  );
}
