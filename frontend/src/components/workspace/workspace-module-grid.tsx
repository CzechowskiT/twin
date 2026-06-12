"use client";

import type { WorkspaceModuleDef } from "@/lib/workspace-module-status";

import { WorkspaceModuleCard } from "./workspace-module-card";

export function WorkspaceModuleGrid({ modules }: { modules: readonly WorkspaceModuleDef[] }) {
  return (
    <div
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
      data-testid="workspace-module-grid"
    >
      {modules.map((mod) => (
        <WorkspaceModuleCard key={mod.id} module={mod} />
      ))}
    </div>
  );
}
