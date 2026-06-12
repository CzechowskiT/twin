import { redirect } from "next/navigation";

import { RECRUITER_INTEGRATIONS_ROUTE } from "@/lib/recruiter-integrations-readiness";

/** Alias — never a blank integrations shell. */
export default function WorkspaceRecruiterIntegrationsRedirectPage() {
  redirect(RECRUITER_INTEGRATIONS_ROUTE);
}
