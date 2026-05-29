"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { OnboardingGate } from "@/components/onboarding-gate";
import { PersonaWorkspaceGate } from "@/components/persona-workspace-gate";
import type { MarketingPersona } from "@/lib/marketing-persona";

const SHARED_CALENDAR_PERSONAS: readonly MarketingPersona[] = [
  "candidate",
  "recruiter",
  "investor",
  "company",
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const sharedCalendar = pathname.startsWith("/dashboard/calendar");
  const allowed: readonly MarketingPersona[] = sharedCalendar
    ? SHARED_CALENDAR_PERSONAS
    : ["candidate"];

  return (
    <PersonaWorkspaceGate allowed={allowed} surface="candidate">
      {sharedCalendar ? children : <OnboardingGate>{children}</OnboardingGate>}
    </PersonaWorkspaceGate>
  );
}
