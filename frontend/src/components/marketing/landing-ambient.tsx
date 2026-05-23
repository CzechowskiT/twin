"use client";

import { useEffect, useState } from "react";

/** Homepage-only mesh, grain, and floating orbs — CSS-only, respects reduced motion. */
export function LandingAmbient() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return (
    <div className="landing-ambient pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
      <div className={`landing-ambient__mesh ${reduced ? "landing-ambient--static" : ""}`} />
      <div className="landing-ambient__grain" />
      <div className={`landing-ambient__orb landing-ambient__orb--1 ${reduced ? "landing-ambient--static" : ""}`} />
      <div className={`landing-ambient__orb landing-ambient__orb--2 ${reduced ? "landing-ambient--static" : ""}`} />
      <div className={`landing-ambient__orb landing-ambient__orb--3 ${reduced ? "landing-ambient--static" : ""}`} />
    </div>
  );
}
