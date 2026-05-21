import { redirect } from "next/navigation";

/** US-C001: dedicated pricing route → candidate self-serve tiers. */
export default function PricingPage() {
  redirect("/for-candidates#persona-pricing");
}
