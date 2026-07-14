import type { Metadata } from "next";

import { DemoPilotCta } from "@/components/marketing/demo/demo-pilot-cta";
import { DemoSurfaceCatalog } from "@/components/marketing/demo/demo-surface-catalog";
import {
  InteractiveDemoPlayer,
  InteractiveDemoSystemMap,
} from "@/components/marketing/demo/interactive-demo-player";
import { FounderLedDemoFlow } from "@/components/marketing/founder-led-demo-flow";
import { InteractiveDemoWalkthrough } from "@/components/marketing/interactive-demo-walkthrough";

export const metadata: Metadata = {
  title: "Founder-led demo — TWIN product walkthrough",
  description:
    "Interactive product story plus founder-led surface catalog: company talent memory, recruiter inbox, candidate trust, calendar north star — sample data only.",
};

export default function DemoPage() {
  return (
    <>
      <FounderLedDemoFlow />
      <InteractiveDemoPlayer />
      <InteractiveDemoSystemMap />
      <DemoSurfaceCatalog />
      <div id="interactive-simulation" className="border-t border-[var(--twin-border)]">
        <InteractiveDemoWalkthrough />
      </div>
      <DemoPilotCta />
    </>
  );
}
