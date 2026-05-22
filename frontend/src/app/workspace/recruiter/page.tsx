"use client";

import { PersonaWorkspaceGate } from "@/components/persona-workspace-gate";
import { WorkspaceLaneHome } from "@/components/workspace-lane-home";

export default function WorkspaceRecruiterPage() {
  return (
    <PersonaWorkspaceGate allowed={["recruiter", "investor"]} surface="recruiter">
      <WorkspaceLaneHome
        title="workspace.recruiterHomeTitle"
        lead="workspace.recruiterHomeLead"
        tools={[
          {
            href: "/recruiter/inbox",
            label: "recruiterInbox.title",
            description: "workspace.toolRecruiterInbox",
          },
          {
            href: "/recruiter/jobs",
            label: "recruiterJobs.title",
            description: "workspace.toolRecruiterJobs",
          },
          {
            href: "/recruiter/integrations/ats",
            label: "atsIntegrations.title",
            description: "workspace.toolRecruiterAts",
          },
          {
            href: "/calculator/b2b",
            label: "nav.calculatorB2bForCompanies",
            description: "workspace.toolRecruiterB2b",
          },
          {
            href: "/for-recruiters",
            label: "nav.forRecruiters",
            description: "workspace.toolRecruiterStory",
          },
        ]}
      />
    </PersonaWorkspaceGate>
  );
}
