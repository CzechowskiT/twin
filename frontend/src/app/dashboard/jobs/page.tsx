import { redirect } from "next/navigation";

/** Oferty — canonical job feed lives on workspace jobs discovery. */
export default function DashboardJobsAliasPage() {
  redirect("/workspace/candidate/jobs");
}
