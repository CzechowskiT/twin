"use client";

import type { ReactNode } from "react";

import { PersonaSpaceGate } from "@/components/persona-space-gate";

/** Recruiter inbox and tools — not the candidate app workspace. */
export default function RecruiterLayout({ children }: { children: ReactNode }) {
  return (
    <PersonaSpaceGate allowed={["recruiter", "company"]} surface="recruiter">
      {children}
    </PersonaSpaceGate>
  );
}
