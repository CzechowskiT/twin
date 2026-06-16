"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { AuthHeader } from "@/components/auth-header";
import { WorkspaceHeader } from "@/components/workspace-header";
import { getToken } from "@/lib/auth";
import { isAuthPath, isWorkspacePath } from "@/lib/performance-route-classification";

const MarketingHeader = dynamic(
  () => import("@/components/marketing-header").then((m) => m.MarketingHeader),
  {
    ssr: false,
    loading: () => (
      <header className="twin-header-bar sticky top-0 z-50">
        <div className="twin-header-stripe" aria-hidden />
        <div className="twin-container h-14 animate-pulse py-3" />
      </header>
    ),
  },
);

/** Route-aware header — workspace/auth avoid marketing header + marquee brand chunk. */
export function ChromeHeader() {
  const pathname = usePathname() ?? "/";
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    const sync = () => setHasSession(Boolean(getToken()));
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [pathname]);

  if (isAuthPath(pathname)) {
    return <AuthHeader />;
  }

  if (hasSession || isWorkspacePath(pathname)) {
    return <WorkspaceHeader />;
  }

  return <MarketingHeader />;
}
