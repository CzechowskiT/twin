"use client";

import { Suspense } from "react";

import { CandidateMatchesWorkspace } from "@/components/candidate/candidate-matches-workspace";

/** Dopasowania — distinct candidate matches workspace (no dashboard anchor bounce). */
export default function DashboardMatchesPage() {
  return (
    <Suspense fallback={null}>
      <CandidateMatchesWorkspace />
    </Suspense>
  );
}
