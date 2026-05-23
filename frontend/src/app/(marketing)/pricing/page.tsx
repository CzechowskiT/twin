"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useMarketingPersona } from "@/components/persona-provider";
import { pricingPathForPersona } from "@/lib/persona-access";
import { getToken } from "@/lib/auth";
import { getSessionPersona } from "@/lib/session-persona";

/** Pricing route — logged-out visitors see candidate tiers; signed-in users see their lane only. */
export default function PricingPage() {
  const router = useRouter();
  const { persona } = useMarketingPersona();

  useEffect(() => {
    const sessionPersona = getSessionPersona() ?? persona;
    router.replace(pricingPathForPersona(getToken() ? sessionPersona : "candidate"));
  }, [persona, router]);

  return null;
}
