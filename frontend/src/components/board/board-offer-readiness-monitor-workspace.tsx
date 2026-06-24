"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo } from "react";

import { useTranslation } from "@/components/language-provider";
import { OperationalCrossLinksPanel } from "@/components/shared/operational-cross-links-panel";
import { OfferReadinessEvidencePanel } from "@/components/shared/offer-readiness-evidence-panel";
import { OfferCalendarReadinessCard } from "@/components/shared/offer-calendar-readiness-card";
import { Card, Shell } from "@/components/ui";
import { LAUNCH_STANCE } from "@/lib/investor-metrics-reality";
import {
  BOARD_OFFER_READINESS_LINKS,
  BOARD_OFFER_READINESS_MARKERS,
  BOARD_OFFER_READINESS_PAGE_MARKER,
  offerReadinessSourceKey,
  resolveBoardOfferReadinessMonitor,
} from "@/lib/board-offer-readiness-monitor";

function section(marker: string, title: string, children: ReactNode): ReactNode {
  return (
    <Card variant="soft" className="border-[var(--twin-border)]/80 p-5">
      <div data-testid={marker}>
        <h2 className="text-sm font-semibold uppercase text-[var(--twin-muted-strong)]">{title}</h2>
        <div className="mt-3 space-y-2 text-sm">{children}</div>
      </div>
    </Card>
  );
}

export function BoardOfferReadinessMonitorWorkspace(): ReactNode {
  const { t } = useTranslation();
  const record = useMemo(() => resolveBoardOfferReadinessMonitor(), []);
  const crossLinks = useMemo(() => BOARD_OFFER_READINESS_LINKS, []);

  return (
    <Shell wide>
      <div
        data-board-offer-readiness-monitor-page={BOARD_OFFER_READINESS_PAGE_MARKER}
        data-testid={BOARD_OFFER_READINESS_MARKERS.page}
        className="mx-auto max-w-5xl space-y-6"
      >
        <header data-testid={BOARD_OFFER_READINESS_MARKERS.header} className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
            {t("boardOfferReadiness.pageEyebrow")}
          </p>
          <h1 className="twin-section-title text-2xl">{t("boardOfferReadiness.pageTitle")}</h1>
          <p className="text-sm text-[var(--twin-muted-strong)]">{t("boardOfferReadiness.headerLead")}</p>
          <p className="font-mono text-xs text-[var(--twin-muted)]">
            {record.candidate_id} · {record.role_id}
          </p>
          <span className="inline-block rounded-full border px-3 py-1 text-xs" data-testid={BOARD_OFFER_READINESS_MARKERS.sourceBadge}>
            {t(offerReadinessSourceKey(record.demo_source))}
          </span>
          <span className="ml-2 inline-block rounded-full border px-3 py-1 text-xs" data-launch-stance={LAUNCH_STANCE}>
            {t("boardOfferReadiness.pilotBadge")}
          </span>
        </header>

        {section(
          BOARD_OFFER_READINESS_MARKERS.evidenceMatrix,
          t("boardOfferReadiness.evidenceMatrixTitle"),
          <>
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("boardOfferReadiness.evidenceMatrixLead")}</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--twin-border)]/60 text-[var(--twin-muted)]">
                    <th className="py-1 pr-2">{t("boardOfferReadiness.colPersona")}</th>
                    <th className="py-1 pr-2">{t("boardOfferReadiness.colRoute")}</th>
                    <th className="py-1 pr-2">{t("boardOfferReadiness.colKind")}</th>
                    <th className="py-1">{t("boardOfferReadiness.colStatus")}</th>
                  </tr>
                </thead>
                <tbody>
                  {record.evidence_matrix.map((row) => (
                    <tr key={row.id} className="border-b border-[var(--twin-border)]/40">
                      <td className="py-1 pr-2">{row.persona}</td>
                      <td className="py-1 pr-2 font-mono">{row.route}</td>
                      <td className="py-1 pr-2">{row.evidence_kind}</td>
                      <td className="py-1 uppercase text-[var(--twin-accent)]">{row.status.replace("_", " ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>,
        )}

        {section(
          BOARD_OFFER_READINESS_MARKERS.safetyBoundaries,
          t("boardOfferReadiness.safetyTitle"),
          <>
            <p className="text-[var(--twin-muted-strong)]">{t(record.safety_note_key)}</p>
            <ul className="mt-2 space-y-1 text-xs text-[var(--twin-muted)]">
              <li>{t("boardOfferReadiness.safetyNoOfferSend")}</li>
              <li>{t("boardOfferReadiness.safetyNoContract")}</li>
              <li>{t("boardOfferReadiness.safetyNoPayment")}</li>
              <li>{t("boardOfferReadiness.safetyNoGuarantee")}</li>
            </ul>
          </>,
        )}

        <OfferCalendarReadinessCard candidateId={record.candidate_id} />

        <OfferReadinessEvidencePanel candidateId={record.candidate_id} />

        {section(
          BOARD_OFFER_READINESS_MARKERS.personaRoutes,
          t("boardOfferReadiness.personaRoutesTitle"),
          <>
            <div className="flex flex-wrap gap-2">
              {crossLinks.map((link) => (
                <Link
                  key={link.id}
                  href={link.href}
                  className="twin-link rounded-full border border-[var(--twin-border)] px-3 py-1 text-xs"
                >
                  {t(link.labelKey)}
                </Link>
              ))}
            </div>
          </>,
        )}

        <OperationalCrossLinksPanel />

        <nav
          className="flex flex-wrap gap-2 text-xs"
          data-testid={BOARD_OFFER_READINESS_MARKERS.crossLinks}
          aria-label={t("boardOfferReadiness.crossLinksTitle")}
        >
          {crossLinks.map((link) => (
            <Link key={link.id} href={link.href} className="twin-link rounded-full border border-[var(--twin-border)] px-3 py-1">
              {t(link.labelKey)}
            </Link>
          ))}
        </nav>
      </div>
    </Shell>
  );
}
