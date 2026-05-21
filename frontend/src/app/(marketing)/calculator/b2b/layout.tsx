"use client";

import type { ReactNode } from "react";

import { PersonaSpaceGate } from "@/components/persona-space-gate";

/** B2B ROI calculator — company lane only. */
export default function CalculatorB2bLayout({ children }: { children: ReactNode }) {
  return (
    <PersonaSpaceGate allowed={["company"]} surface="calculatorB2b">
      {children}
    </PersonaSpaceGate>
  );
}
