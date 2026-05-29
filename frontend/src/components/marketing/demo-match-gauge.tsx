"use client";

type DemoMatchGaugeProps = {
  score: number;
  size?: "sm" | "md" | "lg";
  label?: string;
  hint?: string;
  className?: string;
};

const SIZE = {
  sm: { box: 56, stroke: 4, font: "text-sm" },
  md: { box: 88, stroke: 5, font: "text-xl" },
  lg: { box: 120, stroke: 6, font: "text-3xl" },
} as const;

export function DemoMatchGauge({ score, size = "md", label, hint, className = "" }: DemoMatchGaugeProps) {
  const { box, stroke, font } = SIZE[size];
  const r = (box - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, score));
  const offset = c - (clamped / 100) * c;
  const gradientId = `demo-gauge-gradient-${size}-${box}`;

  return (
    <div
      className={`demo-match-gauge flex items-center gap-4 ${className}`}
      aria-label={label ? `${label}: ${clamped}%` : `${clamped}% match`}
    >
      <div className="demo-match-gauge__ring relative shrink-0" style={{ width: box, height: box }}>
        <svg width={box} height={box} viewBox={`0 0 ${box} ${box}`} className="-rotate-90" aria-hidden>
          <circle
            cx={box / 2}
            cy={box / 2}
            r={r}
            fill="none"
            stroke="var(--twin-border)"
            strokeWidth={stroke}
            opacity={0.45}
          />
          <circle
            cx={box / 2}
            cy={box / 2}
            r={r}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            className="demo-match-gauge__arc"
          />
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgb(52 211 153)" />
              <stop offset="100%" stopColor="rgb(16 185 129)" />
            </linearGradient>
          </defs>
        </svg>
        <span
          className={`demo-match-gauge__value absolute inset-0 flex items-center justify-center font-semibold tabular-nums text-[var(--foreground)] ${font}`}
        >
          {clamped}
          <span className="text-[0.55em] font-bold text-[var(--twin-accent)]">%</span>
        </span>
      </div>
      {(label || hint) && (
        <div className="min-w-0">
          {label ? (
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--twin-accent)]">{label}</p>
          ) : null}
          {hint ? <p className="mt-0.5 text-sm text-[var(--twin-muted-strong)]">{hint}</p> : null}
        </div>
      )}
    </div>
  );
}
