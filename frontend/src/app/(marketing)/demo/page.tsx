import type { Metadata } from "next";

import { DemoAutoApplyPage } from "@/components/marketing/demo-auto-apply-page";

export const metadata: Metadata = {
  title: "Demo — auto-apply story — TWIN",
  description:
    "Interactive walkthrough: synthetic CV, high match score using the production matcher, and a simulated auto-apply sequence (no credentials sent).",
};

export default function DemoPage() {
  return <DemoAutoApplyPage />;
}
