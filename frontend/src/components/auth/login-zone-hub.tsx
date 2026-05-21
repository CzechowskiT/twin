"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import { Card } from "@/components/ui";
import { LOGIN_PATH } from "@/lib/persona-auth";
import type { TranslationKey } from "@/lib/i18n";

const ZONES: { href: string; title: TranslationKey; lead: TranslationKey }[] = [
  { href: LOGIN_PATH.candidate, title: "login.zoneCandidateTitle", lead: "login.zoneCandidateLead" },
  { href: LOGIN_PATH.recruiter, title: "login.zoneRecruiterTitle", lead: "login.zoneRecruiterLead" },
  { href: LOGIN_PATH.company, title: "login.zoneInvestorTitle", lead: "login.zoneInvestorLead" },
];

export function LoginZoneHub() {
  const { t } = useTranslation();
  return (
    <Card>
      <h1 className="mb-2 text-2xl font-semibold">{t("login.hubTitle")}</h1>
      <p className="twin-muted mb-6 text-sm leading-relaxed">{t("login.hubLead")}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {ZONES.map((z) => (
          <Link
            key={z.href}
            href={z.href}
            className="rounded-xl border border-[var(--twin-border)] bg-[var(--twin-surface-raised)] p-4 transition hover:border-[var(--twin-accent)]/40 hover:bg-[var(--twin-accent-muted)]/40"
          >
            <p className="font-semibold text-[var(--foreground)]">{t(z.title)}</p>
            <p className="twin-muted mt-2 text-xs leading-relaxed">{t(z.lead)}</p>
          </Link>
        ))}
      </div>
    </Card>
  );
}
