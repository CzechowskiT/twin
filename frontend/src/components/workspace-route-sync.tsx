"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { isPerformanceLightChromePath } from "@/lib/performance-route-classification";

/** Sets `data-workspace-route` on `<html>` so CSS can strip GPU-heavy chrome on workspace lanes. */
export function WorkspaceRouteSync() {
  const pathname = usePathname() ?? "/";

  useEffect(() => {
    const root = document.documentElement;
    if (isPerformanceLightChromePath(pathname)) {
      root.setAttribute("data-workspace-route", "true");
    } else {
      root.removeAttribute("data-workspace-route");
    }
  }, [pathname]);

  return null;
}
