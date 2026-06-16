import { redirect } from "next/navigation";

import { CANDIDATE_CANONICAL_ROUTES } from "@/lib/candidate-canonical-routes";

/** Plan / billing alias. */
export default function DashboardPlanAliasPage() {
  redirect(CANDIDATE_CANONICAL_ROUTES.billing);
}
