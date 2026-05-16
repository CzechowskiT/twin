"use client";

import { type MouseEvent, type ReactNode, useCallback, useRef } from "react";

type BentoSpotlightProps = {
  children: ReactNode;
  className?: string;
};

/** Radial highlight following pointer — light cards, teal-tinted hover (same system as app). */
export function BentoSpotlight({ children, className = "" }: BentoSpotlightProps) {
  const root = useRef<HTMLDivElement>(null);

  const onMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    const el = root.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--spot-x", `${e.clientX - r.left}px`);
    el.style.setProperty("--spot-y", `${e.clientY - r.top}px`);
  }, []);

  const onLeave = useCallback(() => {
    const el = root.current;
    if (!el) return;
    el.style.removeProperty("--spot-x");
    el.style.removeProperty("--spot-y");
  }, []);

  return (
    <div
      ref={root}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`group/spot relative overflow-hidden rounded-2xl border border-[var(--twin-border)] bg-[var(--twin-card)] shadow-[var(--twin-shadow)] transition-[border-color,box-shadow] duration-300 hover:border-teal-300/80 hover:shadow-[var(--twin-shadow-md)] ${className}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover/spot:opacity-100"
        style={{
          background:
            "radial-gradient(520px circle at var(--spot-x, 50%) var(--spot-y, 50%), rgb(13 148 136 / 0.1), transparent 55%)",
        }}
      />
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}
