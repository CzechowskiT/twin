"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { CompanyWorkspaceNav } from "@/components/company/company-workspace-nav";
import { RecruiterAccessFields } from "@/components/recruiter/recruiter-access-fields";
import { useTranslation } from "@/components/language-provider";
import type { TranslationKey } from "@/lib/i18n";
import { Card, Shell } from "@/components/ui";
import { GuidedEmptyState } from "@/components/ux/guided-empty-state";
import {
  type CompanyPlanUsagePayload,
} from "@/lib/company-billing-readiness";
import {
  mergeCompanyOptions,
  readRecruiterInboxSession,
  recruiterInboxQuery,
  resolveCompanySlugFromRaw,
  companySlugToLabel,
  writeRecruiterInboxSession,
} from "@/lib/recruiter-inbox";

const INTEGRATION_KEYS = [
  "acceptance_inbox",
  "ats_webhooks",
  "employer_calendar",
  "employer_billing",
] as const;

export default function CompanyBillingClient() {
  const { t, locale } = useTranslation();
  const [token, setToken] = useState("");
  const [companyRaw, setCompanyRaw] = useState("");
  const [payload, setPayload] = useState<CompanyPlanUsagePayload | null>(null);
  const [loading, setLoading] = useState(false);

  const companyOptions = useMemo(
    () => mergeCompanyOptions(readRecruiterInboxSession().companySlug, companyRaw),
    [companyRaw],
  );
  const knownSlugs = useMemo(() => new Set(companyOptions.map((o) => o.slug)), [companyOptions]);
  const companySlug = useMemo(
    () => resolveCompanySlugFromRaw(companyRaw, knownSlugs),
    [companyRaw, knownSlugs],
  );
  const loc = locale === "pl" ? "pl-PL" : "en-US";
  const fmt = (n: number) => n.toLocaleString(loc);
  const companyLabel = companySlugToLabel(companySlug || companyRaw);

  useEffect(() => {
    const session = readRecruiterInboxSession();
    queueMicrotask(() => {
      setToken(session.token);
      setCompanyRaw(session.companySlug);
    });
  }, []);

  const load = useCallback(async () => {
    const tkn = token.trim();
    const slug = companySlug;
    if (!tkn || !slug) {
      setPayload(null);
      return;
    }
    writeRecruiterInboxSession(tkn, slug);
    setLoading(true);
    try {
      const q = recruiterInboxQuery(tkn, slug);
      const res = await fetch(`/api/company/billing?${q}`, { cache: "no-store" });
      if (!res.ok) {
        setPayload(null);
        return;
      }
      setPayload((await res.json()) as CompanyPlanUsagePayload);
    } finally {
      setLoading(false);
    }
  }, [token, companySlug]);

  const planKey = (payload?.plan ?? "free") as "demo" | "pilot" | "free";
  const planTitleKey = `companyBilling.plan_${planKey}` as TranslationKey;
  const planBodyKey = `companyBilling.planBody_${planKey}` as TranslationKey;

  const integrationLabel = (key: string): TranslationKey =>
    `companyBilling.integration_${key}` as TranslationKey;
  const integrationStatusLabel = (status: string): TranslationKey =>
    `companyBilling.integrationStatus_${status}` as TranslationKey;

  return (
    <Shell wide>
      <CompanyWorkspaceNav />
      <header className="mb-8 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
          {t("companyBilling.eyebrow")}
        </p>
        <h1 className="twin-page-intro text-2xl font-semibold sm:text-3xl">{t("companyBilling.title")}</h1>
        <p className="twin-muted max-w-2xl text-sm leading-relaxed">{t("companyBilling.lead")}</p>
      </header>

      <Card variant="soft" className="mb-6 border-amber-500/30 bg-amber-500/5 p-4">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">{t("companyBilling.billingNotLiveTitle")}</h2>
        <p className="twin-muted mt-2 text-sm leading-relaxed">{t("companyBilling.billingNotLiveBody")}</p>
      </Card>

      <Card variant="soft" className="mb-6 border-[var(--twin-border)]/80 p-4">
        <RecruiterAccessFields
          token={token}
          companySlug={companyRaw}
          companyOptions={companyOptions}
          onTokenChange={setToken}
          onCompanySlugChange={setCompanyRaw}
        />
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading || !token.trim() || !companySlug}
          className="twin-btn-primary mt-4 disabled:opacity-50"
        >
          {loading ? t("companyBilling.loading") : t("companyBilling.loadCta")}
        </button>
      </Card>

      {!payload && !loading ? (
        <GuidedEmptyState
          title={t("companyBilling.emptyTitle")}
          message={t("companyBilling.emptyBody")}
          steps={[
            t("companyBilling.emptyStep1"),
            t("companyBilling.emptyStep2"),
            t("companyBilling.emptyStep3"),
          ]}
          actionLabel={t("companyBilling.loadCta")}
          onAction={() => void load()}
        />
      ) : null}

      {payload ? (
        <div className="space-y-8">
          <p className="text-sm text-[var(--twin-muted-strong)]">
            {t("companyBilling.workspaceLine").replace("{company}", companyLabel || payload.company_slug)}
          </p>

          <Card variant="soft" className="border-[var(--twin-border)]/80 p-4">
            <h2 className="text-lg font-semibold">{t("companyBilling.planTitle")}</h2>
            <p className="mt-2 font-medium text-[var(--foreground)]">{t(planTitleKey)}</p>
            <p className="twin-muted mt-2 text-sm leading-relaxed">{t(planBodyKey)}</p>
          </Card>

          <section>
            <h2 className="text-lg font-semibold">{t("companyBilling.usageTitle")}</h2>
            <p className="twin-muted mt-1 text-sm">{t("companyBilling.usageLead")}</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Card variant="soft" className="p-4">
                <p className="text-xs uppercase tracking-wide text-[var(--twin-muted)]">{t("companyBilling.usageRoles")}</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums">{fmt(payload.usage.open_roles)}</p>
              </Card>
              <Card variant="soft" className="p-4">
                <p className="text-xs uppercase tracking-wide text-[var(--twin-muted)]">{t("companyBilling.usageReviewed")}</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums">{fmt(payload.usage.reviewed_candidates)}</p>
              </Card>
              <Card variant="soft" className="p-4">
                <p className="text-xs uppercase tracking-wide text-[var(--twin-muted)]">{t("companyBilling.usageSeats")}</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums">{fmt(payload.usage.team_seats)}</p>
              </Card>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold">{t("companyBilling.integrationsTitle")}</h2>
            <p className="twin-muted mt-1 text-sm">{t("companyBilling.integrationsLead")}</p>
            <ul className="mt-4 space-y-2">
              {payload.integrations.map((row) => (
                <li
                  key={row.key}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--twin-border)]/70 px-3 py-2 text-sm"
                >
                  <span>{t(integrationLabel(row.key))}</span>
                  <span className="rounded-full bg-[var(--twin-surface-soft)] px-2 py-0.5 text-xs font-medium">
                    {t(integrationStatusLabel(row.status))}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <Card variant="soft" className="border-[var(--twin-border)]/80 p-4">
            <h2 className="text-sm font-semibold">{t("companyBilling.ctaTitle")}</h2>
            <p className="twin-muted mt-2 text-sm">{t("companyBilling.ctaBody")}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/contact" className="twin-btn-primary inline-flex">
                {t("companyBilling.ctaContact")}
              </Link>
              <Link href="/for-companies" className="twin-link font-medium">
                {t("companyBilling.ctaPilot")}
              </Link>
            </div>
          </Card>

          <p className="twin-muted text-xs leading-relaxed">{t("companyBilling.scopeNote")}</p>
        </div>
      ) : null}
    </Shell>
  );
}
