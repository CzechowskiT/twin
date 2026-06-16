"use client";

import { Card, Shell } from "@/components/ui";

/** Minimal skeleton for workspace route shells — first paint without heavy client trees. */
export function WorkspaceRouteSkeleton() {
  return (
    <Shell wide>
      <Card variant="soft" className="animate-pulse p-6 sm:p-8">
        <div className="h-3 w-24 rounded bg-[var(--twin-surface-soft)]" />
        <div className="mt-4 h-6 w-2/3 max-w-md rounded bg-[var(--twin-surface-soft)]" />
        <div className="mt-3 h-4 w-full max-w-lg rounded bg-[var(--twin-surface-soft)]" />
      </Card>
    </Shell>
  );
}
