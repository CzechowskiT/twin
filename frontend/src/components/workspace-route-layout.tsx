"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

import { LightweightRouteShell } from "@/components/lightweight-route-shell";
import { PersonaWorkspaceGate } from "@/components/persona-workspace-gate";

const OnboardingGate = dynamic(
  () => import("@/components/onboarding-gate").then((m) => ({ default: m.OnboardingGate })),
  { ssr: false },
);
import { WorkspaceRouteSkeleton } from "@/components/workspace-route-skeleton";
import type { MarketingPersona } from "@/lib/marketing-persona";

type WorkspaceLayoutProps = {
  allowed: readonly MarketingPersona[];
  surface: "candidate" | "recruiter" | "investor" | "company";
  children: ReactNode;
  withOnboarding?: boolean;
};

/** Shared workspace layout with auth gate + lightweight paint shell. */
export function WorkspaceRouteLayout({
  allowed,
  surface,
  children,
  withOnboarding = false,
}: WorkspaceLayoutProps) {
  const gated = (
    <PersonaWorkspaceGate allowed={allowed} surface={surface}>
      {withOnboarding ? <OnboardingGate>{children}</OnboardingGate> : children}
    </PersonaWorkspaceGate>
  );

  return (
    <LightweightRouteShell skeleton={<WorkspaceRouteSkeleton />}>{gated}</LightweightRouteShell>
  );
}
