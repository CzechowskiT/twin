"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import { Card } from "@/components/ui";
import { PLACEMENT_VERIFICATION_INTEGRATION_LINKS } from "@/lib/placement-verification-integration";
import type { TranslationKey } from "@/lib/i18n";

const DEMO_EVENTS = [
  { type: "placement.declared", actor: "candidate", at: "T+0" },
  { type: "placement.verify_email_sent", actor: "system", at: "T+1m" },
  { type: "placement.verified", actor: "system", at: "T+2d" },
] as const;

/** Investor-facing illustration of append-only placement verification (matches seeded demo). */
export function PlacementVerificationDemo() {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <p className="twin-muted max-w-2xl text-sm leading-relaxed">{t("placementDemo.lead")}</p>
      <ol className="space-y-3">
        {DEMO_EVENTS.map((ev) => (
          <li key={ev.type}>
            <Card className="p-4">
              <p className="font-mono text-xs text-[var(--twin-accent)]">{ev.type}</p>
              <p className="twin-muted mt-1 text-xs">
                {t("placementDemo.actor")}: {ev.actor} · {ev.at}
              </p>
            </Card>
          </li>
        ))}
      </ol>
      <p className="twin-muted text-xs leading-relaxed">{t("placementDemo.seedNote")}</p>
      <div className="flex flex-wrap gap-2">
        {PLACEMENT_VERIFICATION_INTEGRATION_LINKS.filter((link) => link.id !== "investor_placement").map((link) => (
          <Link key={link.id} href={link.href} className="twin-link rounded-full border border-[var(--twin-border)] px-3 py-1 text-xs">
            {t(link.labelKey as TranslationKey)}
          </Link>
        ))}
      </div>
      <Link href="/login" className="twin-link text-sm font-medium">
        {t("placementDemo.loginDemo")} →
      </Link>
    </div>
  );
}
