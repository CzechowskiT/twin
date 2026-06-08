"use client";

import Link from "next/link";
import { useMemo } from "react";

import { useTranslation } from "@/components/language-provider";
import { ButtonCta } from "@/components/ui";
import { scrollToDashboardHash } from "@/lib/dashboard-anchor";
import {
  buildMissionCards,
  conversationReadinessKey,
  resolveNextBestAction,
  type DashboardTodayContext,
} from "@/lib/dashboard-next-best-action";

type Props = {
  welcomeTitle: string;
  todayContext: DashboardTodayContext;
};

/** Today hero: mission cards, conversation readiness, single primary CTA. */
export function DashboardTodayHero({ welcomeTitle, todayContext }: Props) {
  const { t } = useTranslation();
  const nba = useMemo(() => resolveNextBestAction(todayContext), [todayContext]);
  const missions = useMemo(() => buildMissionCards(todayContext), [todayContext]);
  const readinessKey = useMemo(() => conversationReadinessKey(todayContext), [todayContext]);

  const primaryCta =
    nba.primaryHref.startsWith("#") ? (
      <a href={nba.primaryHref} onClick={scrollToDashboardHash} className="inline-block">
        <ButtonCta type="button" className="!w-auto">
          {t(nba.primaryLabelKey)}
        </ButtonCta>
      </a>
    ) : (
      <Link href={nba.primaryHref} className="inline-block">
        <ButtonCta type="button" className="!w-auto">
          {t(nba.primaryLabelKey)}
        </ButtonCta>
      </Link>
    );

  return (
    <div className="rounded-xl border border-[var(--twin-border)] bg-[var(--twin-surface-raised)]/50 p-4 sm:p-5">
      <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--twin-accent-hover)]">
        {t("dashboard.todayEyebrow")}
      </p>
      <h2 className="twin-page-intro twin-section-title mt-1 text-xl sm:text-2xl">{welcomeTitle}</h2>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-[var(--twin-muted)]">{t(nba.reasonKey)}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-[var(--twin-border)] bg-[var(--twin-card)] px-3 py-1 text-xs font-medium text-[var(--twin-muted-strong)]">
          {t("dashboard.todayReadinessLabel")}: {t(readinessKey)}
        </span>
      </div>

      <ul className="mt-4 grid gap-2 sm:grid-cols-3" aria-label={t("dashboard.todayMissionsAria")}>
        {missions.map((mission) => (
          <li
            key={mission.id}
            className={`rounded-lg border px-3 py-2.5 text-sm ${
              mission.done
                ? "border-[var(--twin-accent)]/40 bg-[var(--twin-accent-muted)]/30"
                : "border-[var(--twin-border)] bg-[var(--twin-surface-2)]/40"
            }`}
          >
            <span
              className={`mr-2 inline-block h-2 w-2 rounded-full ${
                mission.done ? "bg-[var(--twin-accent)]" : "bg-[var(--twin-border)]"
              }`}
              aria-hidden
            />
            <span className={mission.done ? "text-[var(--foreground)]" : "text-[var(--twin-muted-strong)]"}>
              {t(mission.labelKey)}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-4">{primaryCta}</div>
    </div>
  );
}
