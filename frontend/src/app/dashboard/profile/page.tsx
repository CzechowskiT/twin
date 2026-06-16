import { redirect } from "next/navigation";

import { CANDIDATE_CANONICAL_ROUTES } from "@/lib/candidate-canonical-routes";

/** Profil i CV — alias to canonical profile editor. */
export default function DashboardProfileAliasPage() {
  redirect(CANDIDATE_CANONICAL_ROUTES.profile);
}
