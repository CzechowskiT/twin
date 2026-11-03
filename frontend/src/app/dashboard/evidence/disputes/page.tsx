import { AiComplianceWorkspace } from "@/components/ai-compliance/ai-compliance-workspace";

export default function Page() {
  return (
    <AiComplianceWorkspace
      persona="candidate"
      title="Claim disputes"
      subtitle="Contest inaccurate claims. Smoke uses in-app notify only."
    />
  );
}
