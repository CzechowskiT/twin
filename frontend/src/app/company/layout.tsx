"use client";

import type { ReactNode } from "react";

import { PersonaWorkspaceGate } from "@/components/persona-workspace-gate";

export default function CompanyLayout({ children }: { children: ReactNode }) {
  return (
    <PersonaWorkspaceGate allowed={["company", "recruiter"]} surface="company">
      {children}
    </PersonaWorkspaceGate>
  );
}
