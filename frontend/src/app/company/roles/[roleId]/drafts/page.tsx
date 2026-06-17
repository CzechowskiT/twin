import { JobSafeCommunicationWorkspace } from "@/components/recruiter/safe-communication-workspace";

type PageProps = {
  params: Promise<{ roleId: string }>;
};

export default async function CompanyRoleDraftsPage({ params }: PageProps) {
  const { roleId } = await params;
  return <JobSafeCommunicationWorkspace jobId={roleId} surface="company" view="drafts" />;
}
