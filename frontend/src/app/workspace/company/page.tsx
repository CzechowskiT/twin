import { redirect } from "next/navigation";

import { COMPANY_ENTRY_DASHBOARD_ROUTE } from "@/lib/company-entry-navigation";

/** Legacy alias — canonical company workspace home is `/company/dashboard`. */
export default function WorkspaceCompanyRedirectPage() {
  redirect(COMPANY_ENTRY_DASHBOARD_ROUTE);
}
