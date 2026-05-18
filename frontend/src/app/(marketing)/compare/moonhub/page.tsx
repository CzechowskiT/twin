"use client";

import { ComparisonTwinPage } from "@/components/marketing/comparison-page";

export default function CompareMoonhubPage() {
  return (
    <ComparisonTwinPage
      title="TWIN vs Moonhub"
      competitorLabel="Typical AI sourcing assistant"
      lead="Moonhub-style tools accelerate outbound search. TWIN is built around consent, ranked acceptance-ready moments, and calendar outcomes — not raw volume in your inbox."
      competitorBullets={[
        "Optimises for sequences and list building across many profiles.",
        "Recruiter stays in the loop for every send and follow-up.",
        "Success is often measured as activity and replies, not scheduled interviews.",
      ]}
      twinBullets={[
        "Autonomous pipeline toward slots worth showing up for — accept, decline, reschedule.",
        "Matching and consent upfront so async work does not flood hiring managers.",
        "Calendar export and interview holds as first-class, including shared ICS where configured.",
      ]}
    />
  );
}
