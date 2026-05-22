"use client";

import type { ReactNode } from "react";

import { PersonaWorkspaceGate } from "@/components/persona-workspace-gate";

/** Investor-only tools (scenario model, procurement materials). */
export default function InvestorToolsLayout({ children }: { children: ReactNode }) {
  return (
    <PersonaWorkspaceGate allowed={["investor"]} surface="investor">
      {children}
    </PersonaWorkspaceGate>
  );
}
