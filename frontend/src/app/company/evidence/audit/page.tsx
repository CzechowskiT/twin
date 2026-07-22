import { AiComplianceWorkspace } from "@/components/ai-compliance/ai-compliance-workspace";

export default function Page() {
  return (
    <AiComplianceWorkspace
      persona="company"
      title="Company evidence audit"
      subtitle="Decision and override audit trail for hiring teams."
    />
  );
}
