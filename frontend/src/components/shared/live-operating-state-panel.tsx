"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { useTranslation } from "@/components/language-provider";
import { Card } from "@/components/ui";
import {
  LIVE_OPERATING_STATE_MARKERS,
  type OperatingStateSummary,
} from "@/lib/live-operating-state";
import type { TranslationKey } from "@/lib/i18n";

type Props = {
  titleKey: TranslationKey;
  leadKey: TranslationKey;
  summary: OperatingStateSummary | null;
  testId?: string;
};

export function LiveOperatingStatePanel({ titleKey, leadKey, summary, testId }: Props): ReactNode {
  const { t } = useTranslation();

  return (
    <Card variant="soft" className="border-[var(--twin-border)]/80 p-5 sm:p-6">
      <div data-testid={testId ?? LIVE_OPERATING_STATE_MARKERS.panel}>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--twin-muted-strong)]">
          {t(titleKey)}
        </h2>
        <p className="mt-2 text-xs text-[var(--twin-muted-strong)]">{t(leadKey)}</p>
        <p
          className="mt-2 text-xs text-[var(--twin-muted)]"
          data-testid={LIVE_OPERATING_STATE_MARKERS.sourceBadge}
        >
          {summary ? t(summary.sourceKey) : t("liveOperatingState.loading")}
        </p>
        <dl
          className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6"
          data-testid={LIVE_OPERATING_STATE_MARKERS.channelGrid}
        >
          {(summary?.channels ?? []).map((channel) => (
            <div key={channel.id} className="rounded-lg border border-[var(--twin-border)]/60 px-3 py-2">
              <dt className="text-[10px] uppercase text-[var(--twin-muted)]">{t(channel.labelKey)}</dt>
              <dd className="text-lg font-semibold">{channel.count}</dd>
              <dd className="mt-1 text-[10px] uppercase text-[var(--twin-muted)]">
                {t(channel.source === "live" ? "safePersistence.liveApi" : "safePersistence.demoFallback")}
              </dd>
              <Link href={channel.href} className="twin-link mt-1 inline-block text-[10px]">
                →
              </Link>
            </div>
          ))}
        </dl>
      </div>
    </Card>
  );
}
