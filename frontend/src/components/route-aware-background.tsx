"use client";

import { usePathname } from "next/navigation";

import { NatureBackground, resolveNatureVariant } from "@/components/nature-background";

/** Route-specific ambient nature layers (same palette tokens, contextual motion). */
export function RouteAwareBackground() {
  const pathname = usePathname();
  const variant = resolveNatureVariant(pathname ?? "/");
  return <NatureBackground variant={variant} />;
}
