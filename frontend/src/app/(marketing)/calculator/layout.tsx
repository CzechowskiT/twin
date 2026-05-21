"use client";

import type { ReactNode } from "react";

import { PersonaSpaceGate } from "@/components/persona-space-gate";

/** Investor scenario model — company lane only (not candidate/recruiter product). */
export default function CalculatorLayout({ children }: { children: ReactNode }) {
  return (
    <PersonaSpaceGate allowed={["company", "recruiter"]} surface="calculator">
      {children}
    </PersonaSpaceGate>
  );
}
