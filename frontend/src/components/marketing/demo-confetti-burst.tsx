"use client";

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  hue: number;
  life: number;
};

type DemoConfettiBurstProps = {
  active: boolean;
  onDone?: () => void;
};

/** Lightweight canvas confetti; skipped when prefers-reduced-motion. */
export function DemoConfettiBurst({ active, onDone }: DemoConfettiBurstProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active) return;
    const reduced =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      onDone?.();
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const particles: Particle[] = Array.from({ length: 48 }, () => ({
      x: w * 0.5 + (Math.random() - 0.5) * 80,
      y: h * 0.35,
      vx: (Math.random() - 0.5) * 6,
      vy: -4 - Math.random() * 5,
      size: 4 + Math.random() * 5,
      hue: 150 + Math.random() * 40,
      life: 1,
    }));

    let frame = 0;
    let raf = 0;

    const tick = () => {
      frame += 1;
      ctx.clearRect(0, 0, w, h);
      let alive = 0;
      for (const p of particles) {
        p.life -= 0.012;
        if (p.life <= 0) continue;
        alive += 1;
        p.vy += 0.18;
        p.x += p.vx;
        p.y += p.vy;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = `hsl(${p.hue} 65% 52%)`;
        ctx.fillRect(p.x, p.y, p.size, p.size * 0.6);
      }
      ctx.globalAlpha = 1;
      if (alive > 0 && frame < 120) {
        raf = requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, w, h);
        onDone?.();
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, onDone]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-20 h-full w-full"
      aria-hidden
    />
  );
}
