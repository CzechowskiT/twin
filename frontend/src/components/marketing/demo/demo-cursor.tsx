"use client";

import type { DemoCursorPoint } from "@/lib/demo/demo-scene-manifest";

type DemoCursorProps = {
  path?: readonly DemoCursorPoint[];
  progress: number;
  visible: boolean;
};

export function DemoCursor({ path, progress, visible }: DemoCursorProps) {
  if (!visible || !path?.length) return null;
  const idx = Math.min(path.length - 1, Math.floor(progress * path.length));
  const point = path[idx] ?? path[0];
  return (
    <div
      aria-hidden
      data-demo-cursor
      className="pointer-events-none absolute z-20 transition-[left,top] duration-300 ease-out"
      style={{ left: `${point.x}%`, top: `${point.y}%`, transform: "translate(-50%, -50%)" }}
    >
      <span className="relative flex h-5 w-5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--twin-accent)] opacity-40" />
        <span className="relative inline-flex h-5 w-5 rounded-full border-2 border-white bg-[var(--twin-accent)] shadow-md" />
      </span>
    </div>
  );
}
