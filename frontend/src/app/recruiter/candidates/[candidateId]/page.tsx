import { CandidateProfile360Workspace } from "@/components/recruiter/candidate-profile-360-workspace";
import { CandidateIntelligencePanel } from "@/components/recruiter/candidate-intelligence-panel";

type PageProps = {
  params: Promise<{ candidateId: string }>;
};

export default async function RecruiterCandidateProfile360Page({ params }: PageProps) {
  const { candidateId } = await params;
  const numericId = /^\d+$/.test(candidateId);
  return (
    <>
      <CandidateProfile360Workspace candidateId={candidateId} surface="recruiter" />
      {numericId ? (
        <div className="mx-auto max-w-5xl px-4 pb-10">
          <CandidateIntelligencePanel candidateId={candidateId} />
        </div>
      ) : null}
    </>
  );
}
