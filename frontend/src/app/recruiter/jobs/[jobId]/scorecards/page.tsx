import { JobCollaborationWorkspace } from "@/components/recruiter/candidate-collaboration-workspace";

type PageProps = {
  params: Promise<{ jobId: string }>;
};

export default async function RecruiterJobScorecardsPage({ params }: PageProps) {
  const { jobId } = await params;
  return <JobCollaborationWorkspace jobId={jobId} surface="recruiter" view="job-scorecards" />;
}
