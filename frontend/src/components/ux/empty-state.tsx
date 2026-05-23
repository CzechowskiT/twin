"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { ButtonCta } from "@/components/ui";

type EmptyStateProps = {
  message: string;
  actionLabel: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
};

/** One sentence + one primary action — no paragraph dumps. */
export function EmptyState({
  message,
  actionLabel,
  actionHref,
  onAction,
  className = "",
}: EmptyStateProps) {
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
      <p className="text-sm leading-relaxed text-[var(--twin-muted-strong)]">{message}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
