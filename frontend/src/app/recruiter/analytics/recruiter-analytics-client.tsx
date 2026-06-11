"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { RecruiterAccessFields } from "@/components/recruiter/recruiter-access-fields";
import { RecruiterWorkspaceNav } from "@/components/recruiter/recruiter-workspace-nav";
import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";
import { type RecruiterAnalyticsPayload } from "@/lib/recruiter-analytics";
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

  const companyOptions = useMemo(
    () => mergeCompanyOptions(companyRaw, readRecruiterInboxSession().companySlug),
    [companyRaw],
  );
  const knownSlugs = useMemo(() => new Set(companyOptions.map((o) => o.slug)), [companyOptions]);
  const companySlug = useMemo(
    () => resolveCompanySlugFromRaw(companyRaw, knownSlugs),
    [companyRaw, knownSlugs],
  );
  const loc = locale === "pl" ? "pl-PL" : "en-US";
  const fmt = (n: number) => n.toLocaleString(loc);

  useEffect(() => {
    const s = readRecruiterInboxSession();
    queueMicrotask(() => {
      setToken(s.token);
      setCompanyRaw(s.companySlug);
    });
  }, []);

  const load = useCallback(async () => {
    const tkn = token.trim();
    const slug = companySlug;
    if (!tkn || !slug) return;
    writeRecruiterInboxSession(tkn, slug);
    setLoading(true);
    try {
      const q = recruiterInboxQuery(tkn, slug);
      const res = await fetch(`/api/recruiter/analytics?${q}`);
      if (res.ok) setPayload((await res.json()) as RecruiterAnalyticsPayload);
      else setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [token, companySlug]);

  return (
    <Shell wide>
      <RecruiterWorkspaceNav />
      <header className="mb-6 space-y-2">
        <h1 className="twin-page-intro text-2xl font-semibold">{t("recruiterAnalytics.title")}</h1>
        <p className="twin-muted max-w-2xl text-sm">{t("recruiterAnalytics.lead")}</p>
      </header>
      <Card variant="soft" className="mb-6 p-4">
        <RecruiterAccessFields
          token={token}
          companySlug={companyRaw}
          companyOptions={companyOptions}
          onTokenChange={setToken}
          onCompanySlugChange={setCompanyRaw}
        />
        <button type="button" className="twin-btn-primary mt-4" disabled={loading} onClick={() => void load()}>
          {loading ? t("recruiterAnalytics.loading") : t("recruiterAnalytics.load")}
        </button>
      </Card>
      {payload ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card variant="soft" className="p-4">
            <p className="text-xs uppercase text-[var(--twin-muted)]">{t("recruiterAnalytics.metricApplications")}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{fmt(payload.applications_total)}</p>
          </Card>
          <Card variant="soft" className="p-4">
            <p className="text-xs uppercase text-[var(--twin-muted)]">{t("recruiterAnalytics.metricAuditEvents")}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{fmt(payload.audit_events_total)}</p>
          </Card>
          <Card variant="soft" className="p-4">
            <p className="text-xs uppercase text-[var(--twin-muted)]">{t("recruiterAnalytics.metricDecisions")}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{fmt(payload.audit_decisions)}</p>
          </Card>
          <Card variant="soft" className="p-4">
            <p className="text-xs uppercase text-[var(--twin-muted)]">{t("recruiterAnalytics.metricReviews")}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{fmt(payload.audit_reviews_opened)}</p>
          </Card>
        </div>
      ) : null}
      <p className="twin-muted mt-6 text-xs">{t("recruiterAnalytics.notLiveNote")}</p>
    </Shell>
  );
}
