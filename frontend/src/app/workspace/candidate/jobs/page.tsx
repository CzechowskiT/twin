"use client";

import { PersonaWorkspaceGate } from "@/components/persona-workspace-gate";
import { CandidateJobDiscovery } from "@/components/job/candidate-job-discovery";

export default function CandidateJobsPage() {
  return (
    <PersonaWorkspaceGate allowed={["candidate"]} surface="candidate">
      <CandidateJobDiscovery />
    </PersonaWorkspaceGate>
  );
}
