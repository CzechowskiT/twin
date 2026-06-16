import { WorkspaceRouteSkeleton } from "@/components/workspace-route-skeleton";

/** Server shell paints before client auth gate hydrates. */
export default function RecruiterLoading() {
  return <WorkspaceRouteSkeleton />;
}
