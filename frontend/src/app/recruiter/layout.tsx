"use client";

import type { ReactNode } from "react";

import { PersonaWorkspaceGate } from "@/components/persona-workspace-gate";

/** Recruiter inbox and tools — requires session + recruiter or investor context. */
export default function RecruiterLayout({ children }: { children: ReactNode }) {
  return (
    <PersonaWorkspaceGate allowed={["recruiter"]} surface="recruiter">
      {children}
    </PersonaWorkspaceGate>
  );
}
