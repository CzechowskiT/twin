import { AtsImportReadinessInvalidRoute } from "@/components/recruiter/ats-import-readiness-workspace";

type PageProps = {
  params: Promise<{ rest: string[] }>;
};

export default async function CompanyAtsCatchAllPage({ params }: PageProps) {
  await params;
  return <AtsImportReadinessInvalidRoute surface="company" />;
}
