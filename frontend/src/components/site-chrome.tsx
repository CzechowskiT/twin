"use client";

import { usePathname } from "next/navigation";

import { ChromeHeader } from "@/components/chrome-header";
import { PilotPreviewBoundary } from "@/components/pilot-preview-boundary";
import { RouteAwareBackground } from "@/components/route-aware-background";
import { SiteFooter } from "@/components/site-footer";
import { SiteTopMarquee } from "@/components/site-top-marquee";
import { isPilotPreviewChromePath } from "@/lib/product-polish-p0";

/** Hide global marketing chrome on immersive `/waitlist` landing and lean admin surfaces. */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const publicPreview = pathname === "/preview" || pathname.startsWith("/preview/");
  const immersive =
    publicPreview || pathname === "/waitlist" || pathname.startsWith("/waitlist/");
  const adminSurface = pathname === "/admin" || pathname.startsWith("/admin/");
  const showPilotPreview =
    !immersive && !adminSurface && !publicPreview && isPilotPreviewChromePath(pathname);

  return (
    <>
      {!immersive && !adminSurface ? <RouteAwareBackground /> : null}
      {!immersive && !adminSurface ? <SiteTopMarquee /> : null}
      {!immersive ? <ChromeHeader /> : null}
      {showPilotPreview ? <PilotPreviewBoundary /> : null}
      <main
        className={`relative z-10 flex min-h-0 flex-1 flex-col pb-[env(safe-area-inset-bottom,0)] ${immersive || adminSurface ? "min-h-[100dvh]" : ""}`}
      >
        {children}
      </main>
      {!immersive && !adminSurface ? <SiteFooter /> : null}
    </>
  );
}
