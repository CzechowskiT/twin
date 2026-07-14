import type { Metadata } from "next";

import { SalesDemoExperience } from "@/components/marketing/demo/sales/sales-demo-experience";
import { DemoPilotCta } from "@/components/marketing/demo/demo-pilot-cta";

export const metadata: Metadata = {
  title: "TWIN product demo — product film & interactive flows",
  description:
    "Premium product film with real video, then interactive role flows for candidates, recruiters, and companies — sample data, human decision gates.",
};

export default function DemoPage() {
  return (
    <>
      <SalesDemoExperience />
      <DemoPilotCta />
    </>
  );
}
