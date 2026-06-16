"use client";

import { usePathname } from "next/navigation";

import { ChromeHeader } from "@/components/chrome-header";
import { RouteAwareBackground } from "@/components/route-aware-background";
import { SiteFooter } from "@/components/site-footer";
import { SiteTopMarquee } from "@/components/site-top-marquee";

/** Hide global marketing chrome on immersive `/waitlist` landing. */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const immersive = pathname === "/waitlist" || pathname.startsWith("/waitlist/");

  return (
    <>
      {!immersive ? <RouteAwareBackground /> : null}
      {!immersive ? <SiteTopMarquee /> : null}
      {!immersive ? <ChromeHeader /> : null}
      <main
        className={`relative z-10 flex min-h-0 flex-1 flex-col pb-[env(safe-area-inset-bottom,0)] ${immersive ? "min-h-[100dvh]" : ""}`}
      >
        {children}
      </main>
      {!immersive ? <SiteFooter /> : null}
    </>
  );
}
