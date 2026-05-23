import { redirect } from "next/navigation";

import { employerPricingHref } from "@/lib/pricing-routes";

/** Legacy / employer alias → company program pricing on the Companies lane. */
export default function ForEmployersPricingPage() {
  redirect(employerPricingHref());
}
