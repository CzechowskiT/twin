import { JobCollaborationWorkspace } from "@/components/recruiter/candidate-collaboration-workspace";

type PageProps = {
  params: Promise<{ roleId: string }>;
};

export default async function CompanyRoleFeedbackPage({ params }: PageProps) {
  const { roleId } = await params;
  return <JobCollaborationWorkspace jobId={roleId} surface="company" view="job-feedback" />;
}
