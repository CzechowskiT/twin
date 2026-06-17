import { JobSafeCommunicationWorkspace } from "@/components/recruiter/safe-communication-workspace";

type PageProps = {
  params: Promise<{ jobId: string }>;
};

export default async function RecruiterJobDraftsPage({ params }: PageProps) {
  const { jobId } = await params;
  return <JobSafeCommunicationWorkspace jobId={jobId} surface="recruiter" view="drafts" />;
}
