import type { Metadata } from "next";

import { DemoExperience } from "@/components/marketing/demo/experience/demo-experience";
import { DemoPilotCta } from "@/components/marketing/demo/demo-pilot-cta";
import { DemoSurfaceCatalog } from "@/components/marketing/demo/demo-surface-catalog";
import { InteractiveDemoSystemMap } from "@/components/marketing/demo/interactive-demo-player";
import { FounderLedDemoBelowFold } from "@/components/marketing/founder-led-demo-flow";

export const metadata: Metadata = {
  title: "TWIN product demo — cinematic walkthrough",
  description:
    "Premium interactive product film: calendar of acceptance for candidates, recruiters, and companies — sample data, human decision gates.",
};

export default function DemoPage() {
  return (
    <>
      <DemoExperience />
      <InteractiveDemoSystemMap />
      <DemoSurfaceCatalog />
      <FounderLedDemoBelowFold />
      <DemoPilotCta />
    </>
  );
}
