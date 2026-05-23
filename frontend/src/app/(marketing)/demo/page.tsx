import type { Metadata } from "next";

import { DemoAutoApplyPage } from "@/components/marketing/demo-auto-apply-page";

export const metadata: Metadata = {
  title: "Demo — auto-apply story — TWIN",
  description:
    "Interactive walkthrough: synthetic CV and match score. Logged-out users see a timed simulation; signed-in users can run real auto-apply on the seeded investor-demo job.",
};

export default function DemoPage() {
  return <DemoAutoApplyPage />;
}
