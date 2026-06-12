import { redirect } from "next/navigation";

import { RECRUITER_HUB_ROUTE } from "@/lib/recruiter-workspace-modules";

/** Legacy workspace lane → canonical recruiter hub. */
export default function WorkspaceRecruiterRedirectPage() {
  redirect(RECRUITER_HUB_ROUTE);
}
