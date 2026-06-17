"use client";

import type { ReactNode } from "react";

import { useTranslation } from "@/components/language-provider";
import type { TranslationKey } from "@/lib/i18n";
import type { MarketingPersona } from "@/lib/marketing-persona";
import {
  getSystemOfRecordRoutesForPersona,
  SYSTEM_OF_RECORD_HUB_MARKER,
} from "@/lib/system-of-record-routes";

import { SystemOfRecordModuleCard } from "./system-of-record-module-card";

export function SystemOfRecordNavigationHub({
  persona,
  titleKey,
  leadKey,
  eyebrowKey = "systemOfRecord.hubEyebrow",
  children,
}: {
  persona: MarketingPersona;
  titleKey: TranslationKey;
  leadKey: TranslationKey;
  eyebrowKey?: TranslationKey;
  children?: ReactNode;
}) {
  const { t } = useTranslation();
  const routes = getSystemOfRecordRoutesForPersona(persona);

  return (
    <section
      className="rounded-2xl border border-[var(--twin-border)]/80 bg-[var(--twin-surface-2)]/40 p-4 sm:p-5"
      aria-labelledby={`sor-hub-${persona}-title`}
      data-testid={SYSTEM_OF_RECORD_HUB_MARKER}
      data-sor-persona={persona}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
        {t(eyebrowKey)}
      </p>
      <h2 id={`sor-hub-${persona}-title`} className="mt-1 text-lg font-semibold text-[var(--foreground)]">
        {t(titleKey)}
      </h2>
      <p className="twin-muted mt-2 max-w-3xl text-sm leading-relaxed">{t(leadKey)}</p>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {routes.map((route) => (
          <li key={route.id} className="min-w-0">
            <SystemOfRecordModuleCard route={route} />
          </li>
        ))}
      </ul>
      {children}
    </section>
  );
}
