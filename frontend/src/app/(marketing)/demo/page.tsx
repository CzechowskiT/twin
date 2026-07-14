import type { Metadata } from "next";

import { DemoPilotCta } from "@/components/marketing/demo/demo-pilot-cta";
import { DemoSurfaceCatalog } from "@/components/marketing/demo/demo-surface-catalog";
import {
  DemoAboveFoldSection,
  InteractiveDemoSystemMap,
} from "@/components/marketing/demo/interactive-demo-player";
import { FounderLedDemoBelowFold } from "@/components/marketing/founder-led-demo-flow";

export const metadata: Metadata = {
  title: "Founder-led demo — TWIN product walkthrough",
  description:
    "Interactive product story plus founder-led surface catalog: company talent memory, recruiter inbox, candidate trust, calendar north star — sample data only.",
};

export default function DemoPage() {
  return (
    <>
      <DemoAboveFoldSection />
      <InteractiveDemoSystemMap />
      <DemoSurfaceCatalog />
      <FounderLedDemoBelowFold />
      <DemoPilotCta />
    </>
  );
}
