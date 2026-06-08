"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { ButtonCta } from "@/components/ui";

type GuidedEmptyStateProps = {
  title?: string;
  message: string;
  steps: string[];
  actionLabel: string;
  actionHref?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
};

/** Premium empty state: short message, up to three guided steps, one primary CTA. */
export function GuidedEmptyState({
  title,
  message,
  steps,
  actionLabel,
  actionHref,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className = "",
}: GuidedEmptyStateProps) {
  const visibleSteps = steps.filter(Boolean).slice(0, 3);

  let action: ReactNode;
  if (actionHref) {
    action = (
      <Link href={actionHref} className="twin-empty-state__cta">
        <ButtonCta type="button" className="!w-auto">
          {actionLabel}
        </ButtonCta>
      </Link>
    );
  } else if (onAction) {
    action = (
      <ButtonCta type="button" className="twin-empty-state__cta !w-auto" onClick={onAction}>
        {actionLabel}
      </ButtonCta>
    );
  } else {
    action = null;
  }

  return (
    <div
      className={`twin-empty-state rounded-xl border border-dashed border-[var(--twin-border)] bg-[var(--twin-surface-raised)]/40 px-4 py-5 sm:px-5 ${className}`}
    >
      {title ? <p className="text-sm font-semibold text-[var(--foreground)]">{title}</p> : null}
      <p className={`text-sm leading-relaxed text-[var(--twin-muted-strong)] ${title ? "mt-2" : ""}`}>{message}</p>
      {visibleSteps.length > 0 ? (
        <ol className="mt-3 space-y-1.5 text-sm text-[var(--foreground)]">
          {visibleSteps.map((step, index) => (
            <li key={`${index}-${step}`} className="flex gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--twin-accent)]/15 text-[11px] font-semibold text-[var(--twin-accent-hover)]">
                {index + 1}
              </span>
              <span className="leading-snug">{step}</span>
            </li>
          ))}
        </ol>
      ) : null}
      {action || secondaryActionLabel ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {action}
          {secondaryActionLabel && onSecondaryAction ? (
            <button type="button" className="twin-btn-ghost text-sm" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
