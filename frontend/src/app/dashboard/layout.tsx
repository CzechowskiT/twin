"use client";

import type { ReactNode } from "react";

import { CandidateWorkspaceGate } from "@/components/candidate-workspace-gate";
import { useMarketingPersona } from "@/components/persona-provider";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { persona } = useMarketingPersona();

  if (persona !== "candidate") {
    return <CandidateWorkspaceGate surface="dashboard" />;
  }

  return <>{children}</>;
}
