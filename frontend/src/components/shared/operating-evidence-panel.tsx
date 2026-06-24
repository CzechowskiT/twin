"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { useTranslation } from "@/components/language-provider";
import { Card } from "@/components/ui";
import { EvidenceStatusBadge } from "@/components/shared/evidence-status-badge";
import {
  OPERATING_EVIDENCE_MARKERS,
  type OperatingEvidenceSnapshot,
} from "@/lib/operating-evidence";
import type { TranslationKey } from "@/lib/i18n";

type CrossLink = {
  id: string;
  href: string;
  labelKey: TranslationKey;
};

type Props = {
  titleKey: TranslationKey;
  leadKey: TranslationKey;
  boundaryKey: TranslationKey;
  snapshot: OperatingEvidenceSnapshot | null;
  crossLinks?: readonly CrossLink[];
  testId?: string;
  children?: ReactNode;
};

export function OperatingEvidencePanel({
  titleKey,
  leadKey,
  boundaryKey,
  snapshot,
  crossLinks,
  testId,
  children,
}: Props): ReactNode {
  const { t } = useTranslation();

  if (!snapshot) {
    return (
      <Card variant="soft" className="border-[var(--twin-border)]/80 p-5 sm:p-6">
        <div data-testid={OPERATING_EVIDENCE_MARKERS.emptyState}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--twin-muted-strong)]">
            {t(titleKey)}
          </h2>
          <p className="mt-3 text-sm text-[var(--twin-muted-strong)]">{t("operatingEvidence.emptyStateLead")}</p>
        </div>
      </Card>
    );
  }

  return (
    <Card variant="soft" className="border-[var(--twin-border)]/80 p-5 sm:p-6">
      <div data-testid={testId ?? OPERATING_EVIDENCE_MARKERS.panel}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--twin-muted-strong)]">
              {t(titleKey)}
            </h2>
            <p className="text-xs text-[var(--twin-muted-strong)]">{t(leadKey)}</p>
          </div>
          <EvidenceStatusBadge source={snapshot.source} />
        </div>

        <dl className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
          <div>
            <dt className="text-[var(--twin-muted)]">{t("operatingEvidence.statusSummaryLabel")}</dt>
            <dd className="font-medium">{t(snapshot.status_summary_key)}</dd>
          </div>
          <div>
            <dt className="text-[var(--twin-muted)]">{t("operatingEvidence.lastCheckedLabel")}</dt>
            <dd className="font-mono" data-testid={OPERATING_EVIDENCE_MARKERS.lastChecked}>
              {snapshot.last_checked_at}
            </dd>
          </div>
        </dl>

        <p className="mt-3 text-xs text-[var(--twin-muted-strong)]">{t(snapshot.status_detail_key)}</p>

        {children ? <div className="mt-4 space-y-3">{children}</div> : null}

        <p className="mt-4 text-xs text-[var(--twin-muted)]">{t(boundaryKey)}</p>

        {crossLinks && crossLinks.length > 0 ? (
          <nav
            className="mt-4 flex flex-wrap gap-2"
            data-testid={OPERATING_EVIDENCE_MARKERS.crossLinks}
            aria-label={t("operatingEvidence.crossLinksTitle")}
          >
            {crossLinks.map((link) => (
              <Link
                key={link.id}
                href={link.href}
                className="twin-link rounded-full border border-[var(--twin-border)] px-3 py-1 text-xs"
              >
                {t(link.labelKey)}
              </Link>
            ))}
          </nav>
        ) : null}
      </div>
    </Card>
  );
}
