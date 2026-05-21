"use client";

import type { ReactNode } from "react";

import { PersonaWorkspaceGate } from "@/components/persona-workspace-gate";

export default function ProfileLayout({ children }: { children: ReactNode }) {
  return (
    <PersonaWorkspaceGate allowed={["candidate"]} surface="candidate">
      {children}
    </PersonaWorkspaceGate>
  );
}
