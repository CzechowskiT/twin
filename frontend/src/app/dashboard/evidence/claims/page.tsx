import { AiComplianceWorkspace } from "@/components/ai-compliance/ai-compliance-workspace";

export default function Page() {
  return (
    <AiComplianceWorkspace
      persona="candidate"
      title="Career evidence claims"
      subtitle="Declared, extracted, and AI-inferred claims with explicit provenance — never a single verified badge."
    />
  );
}
