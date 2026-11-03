import type { ReactNode } from "react";

import { WorkspaceSearchPalette } from "@/components/candidate/workspace-search-palette";
import { WorkspaceRouteLayout } from "@/components/workspace-route-layout";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <WorkspaceRouteLayout allowed={["candidate"]} surface="candidate" withOnboarding>
      <WorkspaceSearchPalette />
      {children}
    </WorkspaceRouteLayout>
  );
}
