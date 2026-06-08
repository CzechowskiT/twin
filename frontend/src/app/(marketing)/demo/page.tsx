import type { Metadata } from "next";

import { InteractiveDemoWalkthrough } from "@/components/marketing/interactive-demo-walkthrough";

export const metadata: Metadata = {
  title: "Demo — interactive walkthrough — TWIN",
  description:
    "Eight-step interactive simulation: profile, job scan, ranked matches, transparency, recruiter review, accept/decline, calendar hold, and next steps. Synthetic data only — no live submissions.",
};

export default function DemoPage() {
  return <InteractiveDemoWalkthrough />;
}
