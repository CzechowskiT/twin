import { JobTeamCollaborationWorkspace } from "@/components/recruiter/team-collaboration-workspace";

type PageProps = {
  params: Promise<{ roleId: string }>;
};

export default async function CompanyRoleTeamPage({ params }: PageProps) {
  const { roleId } = await params;
  return <JobTeamCollaborationWorkspace jobId={roleId} surface="company" view="team" />;
}
