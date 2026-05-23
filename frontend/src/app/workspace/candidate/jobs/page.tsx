"use client";

import { JobDiscoveryHub } from "@/components/career/job-discovery-hub";
import { PersonaWorkspaceGate } from "@/components/persona-workspace-gate";

export default function CandidateJobsPage() {
  return (
    <PersonaWorkspaceGate allowed={["candidate"]} surface="candidate">
      <JobDiscoveryHub />
    </PersonaWorkspaceGate>
  );
}
