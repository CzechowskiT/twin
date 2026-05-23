"use client";

import { useTranslation } from "@/components/language-provider";

const STEPS = ["none", "declared", "verify_pending", "verified"] as const;

function stepIndex(state: string): number {
  if (state === "disputed") return 2;
  const idx = STEPS.indexOf(state as (typeof STEPS)[number]);
  return idx >= 0 ? idx : 0;
}

/** Compact pipeline → offer → verified progress for placement verification UI. */
export function PlacementStateStepper({ state }: { state: string }) {
  const { t } = useTranslation();
  const current = stepIndex(state || "none");
  const labels = [
    t("dashboard.placementStepPipeline"),
    t("dashboard.placementStepDeclared"),
    t("dashboard.placementStepVerify"),
    t("dashboard.placementStepVerified"),
  ];

  return (
    <ol className="flex flex-wrap items-center gap-1 text-[10px] font-semibold uppercase tracking-wide" aria-label={t("dashboard.placementStepperLabel")}>
      {labels.map((label, idx) => {
        const done = idx < current;
        const active = idx === current;
        return (
          <li key={label} className="flex items-center gap-1">
            {idx > 0 ? <span className="text-[var(--twin-muted)]" aria-hidden>→</span> : null}
            <span
              className={
                active
                  ? "rounded bg-[var(--twin-accent-muted)] px-1.5 py-0.5 text-[var(--twin-accent-hover)]"
                  : done
                    ? "text-[var(--twin-accent)]"
                    : "text-[var(--twin-muted)]"
              }
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
