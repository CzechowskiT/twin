"use client";

import { useTranslation } from "@/components/language-provider";
import type { ProfileProgressInput } from "@/lib/profile-progress";
import { computeProfileProgressPercent } from "@/lib/profile-progress";

export function ProfileProgressBar({
  profile,
  className = "",
}: {
  profile: ProfileProgressInput;
  className?: string;
}) {
  const { t } = useTranslation();
  const pct = computeProfileProgressPercent(profile);

  return (
    <div className={className} role="status" aria-label={t("dashboard.profileProgressAria").replace("{pct}", String(pct))}>
      <div className="mb-1 flex items-center justify-between gap-2 text-xs">
        <span className="font-medium text-[var(--foreground)]">{t("dashboard.profileProgressLabel")}</span>
        <span className="tabular-nums text-[var(--twin-muted-strong)]">{pct}%</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-[var(--twin-border)]"
        aria-hidden
      >
        <div
          className="h-full rounded-full bg-[var(--twin-accent)] transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
