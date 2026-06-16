"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

import { usePageVisibility } from "@/hooks/use-page-visibility";
import { useReducedMotionPreference } from "@/hooks/use-reduced-motion-preference";
import { NATURE_WALLPAPER_URLS } from "@/lib/nature-wallpapers";

export type NatureVariant =
  | "canopy"
  | "meadow"
  | "stream"
  | "garden"
  | "dawn"
  | "sprout"
  | "growth"
  | "shade"
  | "trail";

/** Map URL → wallpaper mood (each route gets a different Unsplash scene). */
export function resolveNatureVariant(pathname: string): NatureVariant {
  const p = pathname.split("?")[0] ?? "/";
  if (p === "/" || p === "") return "canopy";
  if (p.startsWith("/dashboard")) return "stream";
  if (p.startsWith("/profile")) return "garden";
  if (
    p.startsWith("/login") ||
    p.startsWith("/forgot-password") ||
    p.startsWith("/reset-password") ||
    p.startsWith("/auth/")
  ) {
    return "dawn";
  }
  if (p.startsWith("/register")) return "sprout";
  if (p.startsWith("/calculator")) return "growth";
  if (p.startsWith("/privacy")) return "shade";
  if (p.startsWith("/terms")) return "shade";
  if (p.startsWith("/onboarding-assistant")) return "trail";
  return "meadow";
}

type NatureBackgroundProps = {
  variant: NatureVariant;
};

/**
 * OS-style full-bleed photo wallpaper + soft scrim so UI stays readable.
 * Photos: Unsplash (see `nature-wallpapers.ts`). Light pointer parallax when motion is allowed.
 */
export function NatureBackground({ variant }: NatureBackgroundProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const src = NATURE_WALLPAPER_URLS[variant];
  const { hidden } = usePageVisibility();
  const reducedMotion = useReducedMotionPreference();

  useEffect(() => {
    const el = rootRef.current;
    if (!el || hidden || reducedMotion) return;

    const onMove = (e: PointerEvent) => {
      const x = (e.clientX / Math.max(window.innerWidth, 1)) * 2 - 1;
      const y = (e.clientY / Math.max(window.innerHeight, 1)) * 2 - 1;
      el.style.setProperty("--twin-nature-px", x.toFixed(4));
      el.style.setProperty("--twin-nature-py", y.toFixed(4));
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [hidden, reducedMotion]);

  return (
    <div
      ref={rootRef}
      aria-hidden
      className={`twin-bg-root twin-nature twin-nature--${variant}`}
    >
      <Image
        className="twin-nature-wallpaper-img"
        src={src}
        alt=""
        fill
        sizes="100vw"
        fetchPriority="low"
        decoding="async"
        quality={88}
      />
      <div className="twin-nature-scrim" />
    </div>
  );
}
