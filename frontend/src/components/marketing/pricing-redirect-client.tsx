"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useMarketingPersona } from "@/components/persona-provider";
import { pricingHrefForPersona } from "@/lib/pricing-routes";

/** `/pricing` follows the stored marketing persona (Cennik is not candidate-only). */
export function PricingRedirectClient() {
  const router = useRouter();
  const { persona } = useMarketingPersona();

  useEffect(() => {
    router.replace(pricingHrefForPersona(persona));
  }, [persona, router]);

  return null;
}
