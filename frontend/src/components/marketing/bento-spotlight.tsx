"use client";

import { type MouseEvent, type ReactNode, useCallback, useRef } from "react";

type BentoSpotlightProps = {
  children: ReactNode;
  className?: string;
};

/** Radial highlight following pointer (Linear-style card hover). */
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
      className={`group/spot relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] shadow-[inset_0_1px_0_rgb(255_255_255/0.04)] transition-[border-color,box-shadow] duration-300 hover:border-white/[0.14] hover:shadow-[0_0_0_1px_rgb(255_255_255/0.06),inset_0_1px_0_rgb(255_255_255/0.06)] ${className}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover/spot:opacity-100"
        style={{
          background:
            "radial-gradient(520px circle at var(--spot-x, 50%) var(--spot-y, 50%), rgb(255 255 255 / 0.07), transparent 55%)",
        }}
      />
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}
