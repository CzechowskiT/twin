import { redirect } from "next/navigation";

/** Legacy alias → Command Center */
export default function LifecycleAliasPage() {
  redirect("/dashboard");
}
