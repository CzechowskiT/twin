import { JobTrustWorkspace } from "@/components/recruiter/candidate-trust-workspace";

type PageProps = {
  params: Promise<{ jobId: string }>;
};

export default async function RecruiterJobConsentPage({ params }: PageProps) {
  const { jobId } = await params;
  return <JobTrustWorkspace jobId={jobId} surface="recruiter" />;
}
