import { AiComplianceWorkspace } from "@/components/ai-compliance/ai-compliance-workspace";

export default function Page() {
  return (
    <AiComplianceWorkspace
      persona="recruiter"
      title="Human override"
      subtitle="Override advisory AI outputs — binding auto-hire remains banned."
    />
  );
}
