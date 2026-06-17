import { JobTrustWorkspace } from "@/components/recruiter/candidate-trust-workspace";

type PageProps = {
  params: Promise<{ roleId: string }>;
};

export default async function CompanyRoleConsentPage({ params }: PageProps) {
  const { roleId } = await params;
  return <JobTrustWorkspace jobId={roleId} surface="company" />;
}
