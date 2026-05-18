"use client";

import { ComparisonTwinPage } from "@/components/marketing/comparison-page";

export default function CompareLinkedInPage() {
  return (
    <ComparisonTwinPage
      title="TWIN vs LinkedIn"
      competitorLabel="LinkedIn (jobs + InMail ecosystem)"
      lead="LinkedIn is the town square for careers. TWIN is the agent that works while you are away — matching, applying where allowed, and pushing toward calendar acceptance instead of inbox noise."
      competitorBullets={[
        "Broad reach; candidates and recruiters self-serve in the same noisy feed.",
        "Premium features centre on visibility and messaging credits.",
        "No single autonomous career agent with GDPR-first pipeline semantics.",
      ]}
      twinBullets={[
        "Focused on your bar, your consent, and ranked opportunities — not infinite scroll.",
        "Auto-apply only where boards and policy allow; tailored packages when configured.",
        "Interview scheduling, ICS, and placement verification hooks aligned to TWIN’s roadmap.",
      ]}
    />
  );
}
