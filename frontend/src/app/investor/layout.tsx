"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { PersonaWorkspaceGate } from "@/components/persona-workspace-gate";

function normalizePath(pathname: string): string {
  const base = pathname.split("?")[0]?.split("#")[0] ?? "/";
  if (base.length > 1 && base.endsWith("/")) return base.slice(0, -1);
  return base || "/";
}

/** Investor tools are gated; public investor room at `/investor` is open. */
export default function InvestorToolsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (normalizePath(pathname ?? "/") === "/investor") return <>{children}</>;

  return (
    <PersonaWorkspaceGate allowed={["investor"]} surface="investor">
      {children}
    </PersonaWorkspaceGate>
  );
}
