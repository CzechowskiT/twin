import { JobTeamCollaborationWorkspace } from "@/components/recruiter/team-collaboration-workspace";

type PageProps = {
  params: Promise<{ jobId: string }>;
};

export default async function RecruiterJobTasksPage({ params }: PageProps) {
  const { jobId } = await params;
  return <JobTeamCollaborationWorkspace jobId={jobId} surface="recruiter" view="tasks" />;
}
