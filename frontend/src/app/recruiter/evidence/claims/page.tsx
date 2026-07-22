import { AiComplianceWorkspace } from "@/components/ai-compliance/ai-compliance-workspace";

export default function Page() {
  return (
    <AiComplianceWorkspace
      persona="recruiter"
      title="Recruiter claim review"
      subtitle="Human confirmation and provenance before any employment use."
    />
  );
}
