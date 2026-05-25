import type { Metadata } from "next";

import { DemoProductWalkthrough } from "@/components/marketing/demo-product-walkthrough";

export const metadata: Metadata = {
  title: "Demo — product walkthrough — TWIN",
  description:
    "Investor and product demo: CV to ranked pipeline, market coverage, top 20 matches, honest application statuses, and calendar north star. Synthetic data — no live submissions on this page.",
};

export default function DemoPage() {
  return <DemoProductWalkthrough />;
}
