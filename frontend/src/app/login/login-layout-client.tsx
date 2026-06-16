"use client";

import type { ReactNode } from "react";

import { LightweightRouteShell } from "@/components/lightweight-route-shell";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { Card, Shell } from "@/components/ui";

function AuthRouteSkeleton() {
  return (
    <Shell rail>
      <Card className="animate-pulse p-6">
        <div className="h-4 w-32 rounded bg-[var(--twin-surface-soft)]" />
        <div className="mt-6 h-10 w-full rounded bg-[var(--twin-surface-soft)]" />
        <div className="mt-3 h-10 w-full rounded bg-[var(--twin-surface-soft)]" />
      </Card>
    </Shell>
  );
}

export function LoginLayoutClient({ children }: { children: ReactNode }) {
  return (
    <MarketingPageShell>
      <LightweightRouteShell skeleton={<AuthRouteSkeleton />}>{children}</LightweightRouteShell>
    </MarketingPageShell>
  );
}
