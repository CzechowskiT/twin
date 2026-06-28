import type { ReactNode } from "react";

/** Minimal gate shell — no PageMomentumRail or other heavy chrome deps. */
export function PersonaWorkspaceGateShell({ children }: { children: ReactNode }) {
  return (
    <div className="twin-shell twin-shell--wide flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex w-full min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

/** Soft card panel for auth / persona-mismatch states inside the gate shell. */
export function PersonaWorkspaceGateCard({ children }: { children: ReactNode }) {
  return (
    <div className="twin-card-panel twin-card-panel--soft mb-4 scroll-mt-24 p-6 text-[var(--foreground)] sm:mb-6 sm:p-8">
      {children}
    </div>
  );
}
