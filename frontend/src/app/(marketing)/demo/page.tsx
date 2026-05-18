import type { Metadata } from "next";

import { DemoAutoApplyPage } from "@/components/marketing/demo-auto-apply-page";

export const metadata: Metadata = {
  title: "Demo — auto-apply story — TWIN",
  description:
    "Interactive walkthrough: synthetic CV, production matcher, staged apply flow, then a live public sandbox receipt and downloadable calendar file — no employer credentials.",
};

export default function DemoPage() {
  return <DemoAutoApplyPage />;
}
