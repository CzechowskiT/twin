"use client";

import { PersonaWorkspaceGate } from "@/components/persona-workspace-gate";
import { WorkspaceLaneHome } from "@/components/workspace-lane-home";

export default function WorkspaceCandidatePage() {
  return (
    <PersonaWorkspaceGate allowed={["candidate"]} surface="candidate">
      <WorkspaceLaneHome
        title="workspace.candidateHomeTitle"
        lead="workspace.candidateHomeLead"
        tools={[
          {
            href: "/workspace/candidate/jobs",
            label: "careerDiscovery.hubTitle",
            description: "workspace.toolCandidateJobs",
          },
          {
            href: "/dashboard",
            label: "nav.dashboard",
            description: "workspace.toolCandidateDashboard",
          },
          {
            href: "/demo",
            label: "nav.demo",
            description: "workspace.toolCandidateDemo",
          },
        ]}
      />
    </PersonaWorkspaceGate>
  );
}
