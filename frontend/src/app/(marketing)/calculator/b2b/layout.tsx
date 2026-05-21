"use client";

import type { ReactNode } from "react";

import { PersonaSpaceGate } from "@/components/persona-space-gate";

/** B2B ROI calculator — primary company lane; candidates may open from global header CTA. */
export default function CalculatorB2bLayout({ children }: { children: ReactNode }) {
  return (
    <PersonaSpaceGate allowed={["company", "candidate", "recruiter"]} surface="calculatorB2b">
      {children}
    </PersonaSpaceGate>
  );
}
