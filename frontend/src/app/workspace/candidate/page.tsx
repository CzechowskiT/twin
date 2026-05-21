"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { PersonaWorkspaceGate } from "@/components/persona-workspace-gate";

/** Candidate lane → main app (dashboard). */
export default function WorkspaceCandidatePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <PersonaWorkspaceGate allowed={["candidate"]} surface="candidate">
      <p className="twin-muted p-8 text-sm">…</p>
    </PersonaWorkspaceGate>
  );
}
