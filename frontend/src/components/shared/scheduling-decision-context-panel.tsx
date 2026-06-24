"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo } from "react";

import { useTranslation } from "@/components/language-provider";
import { EvidenceStatusBadge } from "@/components/shared/evidence-status-badge";
import { Card } from "@/components/ui";
import type { SchedulingDecisionSurface } from "@/lib/scheduling-decision-context-demo-data";
import {
  SCHEDULING_DECISION_CONTEXT_CROSS_LINKS,
  SCHEDULING_DECISION_CONTEXT_MARKERS,
  resolveSchedulingDecisionContext,
  schedulingDecisionStatusKey,
} from "@/lib/scheduling-decision-context";
import type { TranslationKey } from "@/lib/i18n";

type Props = {
  surface: SchedulingDecisionSurface;
};

function relationSection(
  marker: string,
  titleKey: TranslationKey,
  rows: ReturnType<typeof resolveSchedulingDecisionContext>["record"]["offer_relations"],
  t: (key: TranslationKey) => string,
): ReactNode {
  return (
    <div data-testid={marker}>
      <h3 className="text-xs font-semibold uppercase text-[var(--twin-muted-strong)]">{t(titleKey)}</h3>
      <ul className="mt-2 space-y-2">
        {rows.map((row) => (
          <li key={row.id} className="rounded border border-[var(--twin-border)]/60 px-3 py-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">{t(row.labelKey)}</span>
              <span className="text-[10px] uppercase text-[var(--twin-accent)]">
                {t(schedulingDecisionStatusKey(row.status))}
              </span>
            </div>
            <p className="mt-1 text-[var(--twin-muted)]">{t(row.detailKey)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SchedulingDecisionContextPanel({ surface }: Props): ReactNode {
  const { t } = useTranslation();
  const bundle = useMemo(() => resolveSchedulingDecisionContext(surface), [surface]);

  return (
    <Card
      variant="soft"
      className="border-[var(--twin-border)]/80 p-5 sm:p-6"
      data-testid={SCHEDULING_DECISION_CONTEXT_MARKERS.panel}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--twin-muted-strong)]">
            {t("schedulingDecisionContext.panelTitle")}
          </h2>
          <p className="mt-2 text-sm text-[var(--twin-muted-strong)]">{t("schedulingDecisionContext.panelLead")}</p>
        </div>
        <EvidenceStatusBadge
          source={bundle.snapshot.source}
          testId={SCHEDULING_DECISION_CONTEXT_MARKERS.sourceBadge}
        />
      </div>

      <p className="mt-3 text-xs text-[var(--twin-muted)]">{t(bundle.snapshot.status_detail_key)}</p>

      <div className="mt-4 space-y-4">
        {relationSection(
          SCHEDULING_DECISION_CONTEXT_MARKERS.offerSection,
          "schedulingDecisionContext.offerSectionTitle",
          bundle.record.offer_relations,
          t,
        )}
        {relationSection(
          SCHEDULING_DECISION_CONTEXT_MARKERS.placementSection,
          "schedulingDecisionContext.placementSectionTitle",
          bundle.record.placement_relations,
          t,
        )}
        {relationSection(
          SCHEDULING_DECISION_CONTEXT_MARKERS.calendarSection,
          "schedulingDecisionContext.calendarSectionTitle",
          bundle.record.calendar_relations,
          t,
        )}
      </div>

      <div
        className="mt-4 rounded border border-[var(--twin-border)]/60 p-3"
        data-testid={SCHEDULING_DECISION_CONTEXT_MARKERS.boundarySection}
      >
        <h3 className="text-xs font-semibold uppercase text-[var(--twin-accent)]">
          {t("schedulingDecisionContext.boundaryTitle")}
        </h3>
        <ul className="mt-2 space-y-1 text-xs text-[var(--twin-muted-strong)]">
          {bundle.record.boundary_keys.map((key) => (
            <li key={key}>· {t(key)}</li>
          ))}
        </ul>
        <p className="mt-2 text-[10px] text-[var(--twin-muted)]">{t("schedulingDecisionContext.boundaryNote")}</p>
      </div>

      <nav
        className="mt-4 flex flex-wrap gap-2"
        data-testid={SCHEDULING_DECISION_CONTEXT_MARKERS.crossLinks}
        aria-label={t("schedulingDecisionContext.crossLinksTitle")}
      >
        {SCHEDULING_DECISION_CONTEXT_CROSS_LINKS.map((link) => (
          <Link
            key={link.id}
            href={link.href}
            className="twin-link rounded-full border border-[var(--twin-border)] px-3 py-1 text-xs"
          >
            {t(link.labelKey)}
          </Link>
        ))}
      </nav>
    </Card>
  );
}
