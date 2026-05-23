"use client";

import { EmployerWorkspace } from "@/components/career/employer-workspace";
import { PersonaWorkspaceGate } from "@/components/persona-workspace-gate";

export default function RecruiterEmployerPage() {
  return (
    <PersonaWorkspaceGate allowed={["recruiter", "investor"]} surface="recruiter">
      <EmployerWorkspace />
    </PersonaWorkspaceGate>
  );
}
