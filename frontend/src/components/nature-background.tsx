"use client";

import { useEffect, useRef } from "react";

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

/** Map URL → ambient “place” (soft nature motion stays on-brand across the app). */
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
  if (p.startsWith("/onboarding-assistant")) return "trail";
  return "meadow";
}

type NatureBackgroundProps = {
  variant: NatureVariant;
};

/**
 * Full-viewport soft green canvas + horizon silhouette + mist + slow motion (CSS + light cursor parallax).
 */
export function NatureBackground({ variant }: NatureBackgroundProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;

    const onMove = (e: PointerEvent) => {
      const x = (e.clientX / Math.max(window.innerWidth, 1)) * 2 - 1;
      const y = (e.clientY / Math.max(window.innerHeight, 1)) * 2 - 1;
      el.style.setProperty("--twin-nature-px", x.toFixed(4));
      el.style.setProperty("--twin-nature-py", y.toFixed(4));
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <div
      ref={rootRef}
      aria-hidden
      className={`twin-bg-root twin-nature twin-nature--${variant}`}
    >
      <div className="twin-nature-base" />
      <div className="twin-nature-mesh" />
      <div className="twin-nature-band" />
      <div className="twin-nature-falls" />
      <div className="twin-nature-horizon" />
      <div className="twin-nature-mist" />
      <div className="twin-nature-orbs">
        <div className="twin-nature-orb twin-nature-orb--1" />
        <div className="twin-nature-orb twin-nature-orb--2" />
        <div className="twin-nature-orb twin-nature-orb--3" />
      </div>
    </div>
  );
}
