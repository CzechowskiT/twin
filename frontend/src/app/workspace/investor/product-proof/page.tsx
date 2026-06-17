"use client";

import dynamic from "next/dynamic";

import { PersonaWorkspaceGate } from "@/components/persona-workspace-gate";

const ExecutiveProductProofBoard = dynamic(
  () =>
    import("@/components/investor/executive-product-proof-board").then((m) => m.ExecutiveProductProofBoard),
  { ssr: false },
);

export default function WorkspaceInvestorProductProofPage() {
  return (
    <PersonaWorkspaceGate allowed={["investor"]} surface="investor">
      <ExecutiveProductProofBoard workspace />
    </PersonaWorkspaceGate>
  );
}
