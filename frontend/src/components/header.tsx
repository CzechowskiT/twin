"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { AppHeader } from "@/components/app-header";
import { MarketingHeader } from "@/components/marketing-header";
import { getToken } from "@/lib/auth";

/** Picks marketing vs app header based on session (persona switcher only after login). */
export function Header() {
  const pathname = usePathname();
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    const sync = () => setHasSession(Boolean(getToken()));
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [pathname]);

  return hasSession ? <AppHeader /> : <MarketingHeader />;
}
