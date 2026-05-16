"use client";

export function MarqueeStrip({ text }: { text: string }) {
  const cell = `${text} · `;
  const run = cell.repeat(8);
  return (
    <div className="border-y border-[var(--twin-border)] bg-[var(--twin-surface)]/80 py-3.5 backdrop-blur-[2px]">
      <div className="overflow-hidden">
        <div className="marketing-marquee-track">
          <span className="inline-flex shrink-0 px-10 font-mono text-[10px] font-semibold uppercase tracking-[0.42em] text-[var(--twin-muted)] sm:text-[11px]">
            {run}
          </span>
          <span
            className="inline-flex shrink-0 px-10 font-mono text-[10px] font-semibold uppercase tracking-[0.42em] text-[var(--twin-muted)] sm:text-[11px]"
            aria-hidden
          >
            {run}
          </span>
        </div>
      </div>
    </div>
  );
}
