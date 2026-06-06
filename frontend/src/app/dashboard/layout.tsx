"use client";

import type { ReactNode } from "react";

import { OnboardingGate } from "@/components/onboarding-gate";
import { PersonaWorkspaceGate } from "@/components/persona-workspace-gate";

/** Candidate dashboard — calendar lives under /dashboard/calendar (candidate-only). */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <PersonaWorkspaceGate allowed={["candidate"]} surface="candidate">
      <OnboardingGate>{children}</OnboardingGate>
    </PersonaWorkspaceGate>
  );
}
