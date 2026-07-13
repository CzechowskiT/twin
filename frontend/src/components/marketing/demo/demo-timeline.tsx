"use client";

import { useTranslation } from "@/components/language-provider";
import type { DemoScene } from "@/lib/demo/demo-scene-manifest";

type DemoTimelineProps = {
  scenes: readonly DemoScene[];
  activeIndex: number;
  elapsedMs: number;
  onSeek: (index: number) => void;
};

export function DemoTimeline({ scenes, activeIndex, elapsedMs, onSeek }: DemoTimelineProps) {
  const { t } = useTranslation();
  const total = scenes.reduce((s, sc) => s + sc.durationMs, 0);
  const pct = total > 0 ? Math.min(100, (elapsedMs / total) * 100) : 0;

  return (
    <div className="space-y-2" data-demo-timeline>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-[var(--twin-border)]"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        aria-label={t("interactiveDemoPlayer.timelineAria")}
      >
        <div className="h-full bg-[var(--twin-accent)] transition-[width] duration-150" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-[var(--twin-muted)]">
        <span>{formatMs(elapsedMs)}</span>
        <span>{formatMs(total)}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {scenes.map((scene, i) => (
          <button
            key={scene.id}
            type="button"
            onClick={() => onSeek(i)}
            aria-current={i === activeIndex ? "step" : undefined}
            className={`rounded px-2 py-0.5 text-[10px] ${
              i === activeIndex
                ? "bg-[var(--twin-accent)] text-white"
                : "bg-[var(--twin-surface-soft)] text-[var(--twin-muted-strong)] hover:bg-[var(--twin-border)]"
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}

function formatMs(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, "0")}`;
}
