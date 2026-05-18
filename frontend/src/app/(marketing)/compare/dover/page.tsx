"use client";

import { ComparisonTwinPage } from "@/components/marketing/comparison-page";

export default function CompareDoverPage() {
  return (
    <ComparisonTwinPage
      title="TWIN vs Dover"
      competitorLabel="Dover-style outbound recruiting stack"
      lead="Dover-class products excel at orchestrated outbound and sequences for hiring teams. TWIN starts from the candidate side: autonomous discovery and applications with a north star of acceptance-ready calendar items."
      competitorBullets={[
        "Employer-centric workflows and integrations for recruiting orgs.",
        "Heavy on outbound campaigns and team coordination.",
        "Less emphasis on candidate-owned autonomous career control.",
      ]}
      twinBullets={[
        "Candidate-first agent: sleep-time progress with explicit consent boundaries.",
        "Polish and EU board adapters (e.g. pracuj.pl, rocketjobs.pl) as part of the MVP arc.",
        "Designed for verification-friendly placement economics, not manual CS tennis.",
      ]}
    />
  );
}
