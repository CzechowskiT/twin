"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";
import {
  AUDIT_EVENT_FOUNDATION_LINKS,
  AUDIT_EVENT_FOUNDATION_MARKERS,
  AUDIT_EVENT_FOUNDATION_PAGE_MARKER,
  LAUNCH_STANCE,
  resolveAuditEventFoundation,
  type AuditEventSample,
} from "@/lib/audit-event-foundation";
import type { TranslationKey } from "@/lib/i18n";

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

function eventRow(event: AuditEventSample): ReactNode {
  return (
    <li key={event.id} className="rounded border border-[var(--twin-border)]/60 px-3 py-2 text-xs font-mono">
      <div className="flex flex-wrap gap-2">
        <span className="text-[var(--twin-accent)]">{event.event_type}</span>
        <span className="text-[var(--twin-muted)]">· {event.actor_persona}</span>
        <span className="text-[var(--twin-muted)]">→ {event.target_type}/{event.target_id}</span>
      </div>
      <p className="mt-1 text-[var(--twin-muted-strong)]">
        external_side_effect={String(event.external_side_effect)} · source={event.source}
      </p>
    </li>
  );
}

export function AuditEventFoundationWorkspace() {
  const { t } = useTranslation();
  const record = resolveAuditEventFoundation();

  return (
    <Shell wide>
      <div
        data-audit-event-foundation-page={AUDIT_EVENT_FOUNDATION_PAGE_MARKER}
        data-testid={AUDIT_EVENT_FOUNDATION_MARKERS.page}
        className="mx-auto max-w-5xl space-y-6"
      >
        <header data-testid={AUDIT_EVENT_FOUNDATION_MARKERS.header} className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
            {t("auditEventFoundation.pageEyebrow")}
          </p>
          <h1 className="twin-section-title text-2xl">{t("auditEventFoundation.pageTitle")}</h1>
          <p className="text-sm text-[var(--twin-muted-strong)]">{t("auditEventFoundation.headerLead")}</p>
          <span
            data-testid={AUDIT_EVENT_FOUNDATION_MARKERS.pilotBadge}
            className="inline-block rounded-full border px-3 py-1 text-xs"
            data-launch-stance={LAUNCH_STANCE}
          >
            {t("auditEventFoundation.pilotBadge")}
          </span>
          <div className="flex flex-wrap gap-3 text-xs">
            {AUDIT_EVENT_FOUNDATION_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="twin-link">
                {t(link.labelKey)}
              </Link>
            ))}
          </div>
        </header>

        {section(
          AUDIT_EVENT_FOUNDATION_MARKERS.contract,
          t("auditEventFoundation.contractTitle"),
          <>
            <p>{t("auditEventFoundation.contractLead")}</p>
            <p className="font-mono text-xs">{record.api_path}</p>
            <p className="text-xs text-[var(--twin-muted)]">
              {t("auditEventFoundation.allowedMethods")}: {record.allowed_methods.join(", ")}
            </p>
            <ul className="list-inside list-disc text-xs">
              {record.contract_fields.map((field) => (
                <li key={field}>{field}</li>
              ))}
            </ul>
          </>,
        )}

        {section(
          AUDIT_EVENT_FOUNDATION_MARKERS.samples,
          t("auditEventFoundation.samplesTitle"),
          <>
            <p>{t("auditEventFoundation.samplesLead")}</p>
            <ol className="space-y-2">{record.sample_events.map(eventRow)}</ol>
          </>,
        )}

        {section(
          AUDIT_EVENT_FOUNDATION_MARKERS.boundaries,
          t("auditEventFoundation.boundariesTitle"),
          <>
            <p>{t("auditEventFoundation.boundariesLead")}</p>
            <ul className="list-inside list-disc text-xs">
              {record.boundaries.map((key) => (
                <li key={key}>{t(key as TranslationKey)}</li>
              ))}
            </ul>
          </>,
        )}

        {section(
          AUDIT_EVENT_FOUNDATION_MARKERS.apiPreview,
          t("auditEventFoundation.apiPreviewTitle"),
          <>
            <p>{t("auditEventFoundation.apiPreviewLead")}</p>
            <p className="text-xs text-[var(--twin-muted)]">{t("auditEventFoundation.apiPreviewNote")}</p>
          </>,
        )}

        {section(
          AUDIT_EVENT_FOUNDATION_MARKERS.launchStatus,
          t("auditEventFoundation.launchTitle"),
          <>
            <p>{t("auditEventFoundation.launchNoGo")}</p>
            <p>{t("auditEventFoundation.p0Open")}</p>
            <p>{t("auditEventFoundation.phase3bBlocked")}</p>
          </>,
        )}
      </div>
    </Shell>
  );
}
