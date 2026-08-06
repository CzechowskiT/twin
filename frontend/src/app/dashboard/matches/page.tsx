"use client";

import { Suspense } from "react";

import { CandidateMatchesWorkspace } from "@/components/candidate/candidate-matches-workspace";
import { IaActionableEmpty } from "@/components/dashboard/ia-actionable-empty";

/** Dopasowania — distinct candidate matches workspace (no dashboard anchor bounce). */
export default function DashboardMatchesPage() {
  return (
    <Suspense fallback={null}>
      <div className="space-y-4">
        <IaActionableEmpty areaId="opportunities" show />
        <CandidateMatchesWorkspace />
      </div>
    </Suspense>
  );
}
