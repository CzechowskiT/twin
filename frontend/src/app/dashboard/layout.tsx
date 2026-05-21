"use client";

import type { ReactNode } from "react";

import { OnboardingGate } from "@/components/onboarding-gate";
import { PersonaWorkspaceGate } from "@/components/persona-workspace-gate";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <PersonaWorkspaceGate allowed={["candidate"]} surface="candidate">
      <OnboardingGate>{children}</OnboardingGate>
    </PersonaWorkspaceGate>
  );
}
