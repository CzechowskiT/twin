import { AiComplianceWorkspace } from "@/components/ai-compliance/ai-compliance-workspace";

export default function Page() {
  return (
    <AiComplianceWorkspace
      persona="candidate"
      title="AI decision log"
      subtitle="Advisory AI runs with explainability — never binding hire/reject."
    />
  );
}
