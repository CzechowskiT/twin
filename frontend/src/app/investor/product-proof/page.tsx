"use client";

import dynamic from "next/dynamic";

const ExecutiveProductProofBoard = dynamic(
  () =>
    import("@/components/investor/executive-product-proof-board").then((m) => m.ExecutiveProductProofBoard),
  { ssr: false },
);

/** Public investor product proof — honest board demo pack (no gated workspace shell). */
export default function InvestorProductProofPage() {
  return <ExecutiveProductProofBoard workspace={false} />;
}
