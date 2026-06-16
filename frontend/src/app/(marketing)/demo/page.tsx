import type { Metadata } from "next";

import { FounderLedDemoFlow } from "@/components/marketing/founder-led-demo-flow";
import { InteractiveDemoWalkthrough } from "@/components/marketing/interactive-demo-walkthrough";

export const metadata: Metadata = {
  title: "Founder-led demo — TWIN product walkthrough",
  description:
    "Controlled founder-led walkthrough: company talent memory, recruiter Talent Pool import, Talent Radar, candidate trust, decision memory, weekly digest, and safe human decision boundaries.",
};

export default function DemoPage() {
  return (
    <>
      <FounderLedDemoFlow />
      <div id="interactive-simulation">
        <InteractiveDemoWalkthrough />
      </div>
    </>
  );
}
