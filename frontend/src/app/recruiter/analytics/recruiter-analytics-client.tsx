"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { RecruiterAccessFields } from "@/components/recruiter/recruiter-access-fields";
import { RecruiterWorkspaceNav } from "@/components/recruiter/recruiter-workspace-nav";
import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";
import { GuidedEmptyState } from "@/components/ux/guided-empty-state";
import type { RecruiterAnalyticsPayload } from "@/lib/recruiter-analytics";
import {
  mergeCompanyOptions,
  readRecruiterInboxSession,
  recruiterInboxQuery,
  resolveCompanySlugFromRaw,
  writeRecruiterInboxSession,
} from "@/lib/recruiter-inbox";

export default function RecruiterAnalyticsClient() {
  const { t, locale } = useTranslation();
  const [token, setToken] = useState("");
  const [companyRaw, setCompanyRaw] = useState("");
  const [payload, setPayload] = useState<RecruiterAnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const loc = locale === "pl" ? "pl-PL" : "en-US";
  const fmt = (n: number) => n.toLocaleString(loc);

  const companyOptions = useMemo(
    () => mergeCompanyOptions(readRecruiterInboxSession().companySlug, companyRaw),
    [companyRaw],
  );
  const knownSlugs = useMemo(() => new Set(companyOptions.map((o) => o.slug)), [companyOptions]);
  const companySlug = useMemo(
    () => resolveCompanySlugFromRaw(companyRaw, knownSlugs),
    [companyRaw, knownSlugs],
  );

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
      const res = await fetch(`/api/recruiter/analytics?${q}`, { cache: "no-store" });
      if (!res.ok) {
        setPayload(null);
        return;
      }
      setPayload((await res.json()) as RecruiterAnalyticsPayload);
    } finally {
      setLoading(false);
    }
  }, [token, companySlug]);

  return (
    <Shell wide>
      <RecruiterWorkspaceNav />
      <header className="mb-8 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
          {t("recruiterAnalytics.eyebrow")}
        </p>
        <h1 className="twin-page-intro text-2xl font-semibold sm:text-3xl">{t("recruiterAnalytics.title")}</h1>
        <p className="twin-muted max-w-2xl text-sm leading-relaxed">{t("recruiterAnalytics.lead")}</p>
      </header>

      <Card variant="soft" className="mb-6 border-[var(--twin-border)]/80 p-4">
        <RecruiterAccessFields
          token={token}
          companyRaw={companyRaw}
          companyOptions={companyOptions}
          onTokenChange={setToken}
          onCompanyChange={setCompanyRaw}
        />
        <button type="button" onClick={() => void load()} disabled={loading || !token.trim() || !companySlug} className="twin-btn-primary mt-4 disabled:opacity-50">
          {loading ? t("recruiterAnalytics.loading") : t("recruiterAnalytics.load")}
        </button>
      </Card>

      {!payload && !loading ? (
        <GuidedEmptyState
          title={t("recruiterAnalytics.emptyTitle")}
          message={t("recruiterAnalytics.emptyBody")}
          steps={[t("recruiterAnalytics.emptyStep1"), t("recruiterAnalytics.emptyStep2")]}
          actionLabel={t("recruiterAnalytics.load")}
          onAction={() => void load()}
        />
      ) : null}

      {payload ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card variant="soft" className="p-4">
              <p className="text-xs uppercase text-[var(--twin-muted)]">{t("recruiterAnalytics.metricInReview")}</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">{fmt(payload.inbox.in_review)}</p>
            </Card>
            <Card variant="soft" className="p-4">
              <p className="text-xs uppercase text-[var(--twin-muted)]">{t("recruiterAnalytics.metricAccepted")}</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">{fmt(payload.inbox.accepted)}</p>
            </Card>
            <Card variant="soft" className="p-4">
              <p className="text-xs uppercase text-[var(--twin-muted)]">{t("recruiterAnalytics.metricAudit7d")}</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">{fmt(payload.activity.audit_events_7d)}</p>
            </Card>
            <Card variant="soft" className="p-4">
              <p className="text-xs uppercase text-[var(--twin-muted)]">{t("recruiterAnalytics.metricDecisions7d")}</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">{fmt(payload.activity.decisions_logged_7d)}</p>
            </Card>
          </div>
          <p className="twin-muted text-xs leading-relaxed">{t("recruiterAnalytics.scopeNote")}</p>
        </div>
      ) : null}
    </Shell>
  );
}
