import { redirect } from "next/navigation";

import { CANDIDATE_CANONICAL_ROUTES } from "@/lib/candidate-canonical-routes";

/** CV shortcut — same surface as profile. */
export default function DashboardCvAliasPage() {
  redirect(CANDIDATE_CANONICAL_ROUTES.profile);
}
