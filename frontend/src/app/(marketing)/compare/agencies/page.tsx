"use client";

import { ComparisonTwinPage } from "@/components/marketing/comparison-page";

export default function CompareAgenciesPage() {
  return (
    <ComparisonTwinPage
      title="TWIN vs recruitment agencies"
      competitorLabel="Traditional agencies"
      lead="Agencies earn on placement and relationship. TWIN is software-first: machine-assisted matching, in-product verification paths, and async work toward interviews — without turning your hiring process into forwarded CV threads."
      competitorBullets={[
        "Success fees and retainers aligned to human sourcers and account managers.",
        "Quality varies by desk; speed often trades off against candidate experience.",
        "Heavy email and phone coordination for scheduling and feedback.",
      ]}
      twinBullets={[
        "Transparent pipeline in the product; ranked matches instead of mystery slates.",
        "Automation for repetitive application flows where boards permit it.",
        "Roadmap toward self-serve placement verification instead of default ping-pong.",
      ]}
    />
  );
}
