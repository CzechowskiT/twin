import { AiComplianceWorkspace } from "@/components/ai-compliance/ai-compliance-workspace";

export default function Page() {
  return (
    <AiComplianceWorkspace
      persona="candidate"
      title="AI security controls"
      subtitle="Prompt-injection and protected-attribute bans."
    />
  );
}
