"use client";

import { usePathname } from "next/navigation";
import { FuturisticBackground } from "@/components/futuristic-background";
import { LandingBackground } from "@/components/landing-background";

/** Light mesh for app routes; full-viewport dark mesh on the marketing home page. */
export function RouteAwareBackground() {
  const pathname = usePathname();
  if (pathname === "/") {
    return <LandingBackground fixed />;
  }
  return <FuturisticBackground />;
}
