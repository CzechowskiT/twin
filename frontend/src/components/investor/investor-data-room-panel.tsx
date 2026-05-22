"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import { Card } from "@/components/ui";
import { getPublicApiBase } from "@/lib/public-api-base";

const CONFIDENTIAL_KEYS = [
  "dataRoom.confidentialCap",
  "dataRoom.confidentialFin",
  "dataRoom.confidentialLegal",
] as const;

export function InvestorDataRoomPanel() {
  const { t } = useTranslation();
  const apiBase = getPublicApiBase();
  const statsUrl = apiBase ? `${apiBase}/api/v1/public/mvp-stats` : "/api/v1/public/mvp-stats";
  const openApiUrl = apiBase ? `${apiBase}/openapi.json` : "/api/v1/openapi.json";

  const packLinks = [
    { href: "/investor/metrics", label: t("dataRoom.packMetrics") },
    { href: statsUrl, label: t("dataRoom.packStatsJson"), external: true },
    { href: openApiUrl, label: t("dataRoom.packOpenApi"), external: true },
    { href: "/status", label: t("dataRoom.packStatus") },
    { href: "/investor/calculator", label: t("dataRoom.packCalculator") },
  ];

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold">{t("dataRoom.packTitle")}</h2>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {packLinks.map((item) =>
            item.external ? (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="twin-link block rounded-lg border border-[var(--twin-border)] px-4 py-3 text-sm font-medium hover:bg-[var(--twin-accent-muted)]/40"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {item.label} ↗
                </a>
              </li>
            ) : (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block rounded-lg border border-[var(--twin-border)] px-4 py-3 text-sm font-medium hover:bg-[var(--twin-accent-muted)]/40"
                >
                  {item.label}
                </Link>
              </li>
            ),
          )}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold">{t("dataRoom.confidentialTitle")}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {CONFIDENTIAL_KEYS.map((key) => (
            <Card key={key} variant="soft" className="p-4 opacity-90">
              <p className="text-sm font-medium">{t(key)}</p>
              <p className="twin-muted mt-2 text-xs">{t("dataRoom.accessNote")}</p>
            </Card>
          ))}
        </div>
        <Link
          href="/contact"
          className="marketing-cta-filled-pill marketing-btn-primary-shadow twin-touch-target mt-6 inline-flex min-h-[2.75rem] items-center justify-center rounded-full bg-[var(--twin-cta)] px-5 text-sm font-semibold text-[var(--twin-on-cta)]"
        >
          {t("dataRoom.confidentialContact")}
        </Link>
      </section>

      <Link href="/workspace/investor" className="twin-link text-sm font-medium">
        ← {t("dataRoom.backInvestor")}
      </Link>
    </div>
  );
}
