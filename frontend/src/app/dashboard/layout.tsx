import type { ReactNode } from "react";

import { WorkspaceRouteLayout } from "@/components/workspace-route-layout";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <WorkspaceRouteLayout allowed={["candidate"]} surface="candidate" withOnboarding>
      {children}
    </WorkspaceRouteLayout>
  );
}
