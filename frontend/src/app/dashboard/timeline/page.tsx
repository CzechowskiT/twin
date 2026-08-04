import { redirect } from "next/navigation";

/** Legacy alias → unified history */
export default function TimelineAliasPage() {
  redirect("/dashboard/history");
}
