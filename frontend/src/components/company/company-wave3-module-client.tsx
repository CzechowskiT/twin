"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { CompanyWorkspaceNav } from "@/components/company/company-workspace-nav";
import { RecruiterAccessFields } from "@/components/recruiter/recruiter-access-fields";
import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";
import { GuidedEmptyState } from "@/components/ux/guided-empty-state";
import type { TranslationKey } from "@/lib/i18n";
import {
  COMPANY_WAVE3_MODULE_META,
  type CompanyWave3ModuleId,
} from "@/lib/company-wave3-modules";
import {
  mergeCompanyOptions,
  readRecruiterInboxSession,
  recruiterInboxQuery,
  resolveCompanySlugFromRaw,
  writeRecruiterInboxSession,
} from "@/lib/recruiter-inbox";

type Props = { moduleId: CompanyWave3ModuleId };

function i18nPrefix(moduleId: CompanyWave3ModuleId): string {
  const map: Record<CompanyWave3ModuleId, string> = {
    "org-settings": "companyOrgSettings",
    permissions: "companyPermissions",
    "audit-log": "companyAuditLog",
    scorecards: "companyScorecards",
    notifications: "companyNotifications",
    onboarding: "companyOnboarding",
    "trust-summary": "companyTrustSummary",
  };
  return map[moduleId];
}

export function CompanyWave3ModuleClient({ moduleId }: Props) {
  const { t } = useTranslation();
  const meta = COMPANY_WAVE3_MODULE_META[moduleId];
  const prefix = i18nPrefix(moduleId);
  const tk = useCallback(
    (suffix: string) => `${prefix}.${suffix}` as TranslationKey,
    [prefix],
  );

  const [token, setToken] = useState("");
  const [companyRaw, setCompanyRaw] = useState("");
  const [subjectId, setSubjectId] = useState("cand-synth-wave3");
  const [payload, setPayload] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [timezone, setTimezone] = useState("Europe/Warsaw");
  const [locale, setLocale] = useState("pl");
  const [scoreSummary, setScoreSummary] = useState("");
  const [notifPreview, setNotifPreview] = useState("Wave3 notification draft preview");

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
    setError(null);
    try {
      const q = new URLSearchParams(recruiterInboxQuery(tkn, slug));
      if (moduleId === "trust-summary") {
        q.set("subject_id", subjectId.trim() || "cand-synth-wave3");
      }
      const method = moduleId === "notifications" ? "POST" : "GET";
      const init: RequestInit = { method, cache: "no-store" };
      if (method === "POST") {
        init.headers = { "Content-Type": "application/json" };
        init.body = JSON.stringify({
          template_key: "company.notification.wave3",
          body_preview: notifPreview.slice(0, 500),
          send: false,
        });
      }
      const res = await fetch(`/api/company/wave3/${meta.apiPath}?${q}`, init);
      if (!res.ok) {
        setPayload(null);
        setError(t(tk("loadFailed")));
        return;
      }
      const data = (await res.json()) as Record<string, unknown>;
      setPayload(data);
      if (moduleId === "org-settings" && data && typeof data === "object") {
        if (typeof data.display_name === "string") setDisplayName(data.display_name);
        if (typeof data.timezone === "string") setTimezone(data.timezone);
        if (typeof data.locale === "string") setLocale(data.locale);
      }
    } finally {
      setLoading(false);
    }
  }, [token, companySlug, moduleId, meta.apiPath, subjectId, notifPreview, t, tk]);

  const saveOrgSettings = useCallback(async () => {
    const tkn = token.trim();
    const slug = companySlug;
    if (!tkn || !slug) return;
    setLoading(true);
    setError(null);
    try {
      const q = recruiterInboxQuery(tkn, slug);
      const res = await fetch(`/api/company/wave3/org-settings?${q}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName.slice(0, 120),
          timezone,
          locale,
          hiring_policy: {},
          updated_by_role: "admin",
        }),
        cache: "no-store",
      });
      if (!res.ok) {
        setError(t(tk("saveFailed")));
        return;
      }
      setPayload(await res.json());
    } finally {
      setLoading(false);
    }
  }, [token, companySlug, displayName, timezone, locale, t, tk]);

  const createScorecard = useCallback(async () => {
    const tkn = token.trim();
    const slug = companySlug;
    if (!tkn || !slug) return;
    setLoading(true);
    setError(null);
    try {
      const q = recruiterInboxQuery(tkn, slug);
      const res = await fetch(`/api/company/wave3/scorecards?${q}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject_type: "candidate",
          subject_id: subjectId.trim() || "cand-synth-wave3",
          decision_code: "advance",
          summary: scoreSummary.slice(0, 500) || "Wave3 scorecard",
          rating: 3,
        }),
        cache: "no-store",
      });
      if (!res.ok) {
        setError(t(tk("saveFailed")));
        return;
      }
      await load();
    } finally {
      setLoading(false);
    }
  }, [token, companySlug, subjectId, scoreSummary, load, t, tk]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  return (
    <Shell wide>
      <CompanyWorkspaceNav />
      <div data-company-wave3-module={moduleId} data-testid={meta.marker}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
          {t(tk("eyebrow"))}
        </p>
        <h1 className="mt-2 text-2xl font-semibold">{t(tk("title"))}</h1>
        <p className="twin-muted mb-6 mt-2 text-sm">{t(tk("lead"))}</p>

        <Card variant="soft" className="mb-6 border-[var(--twin-border)]/80 p-4">
          <RecruiterAccessFields
            idPrefix={`company-wave3-${moduleId}`}
            token={token}
            companySlug={companyRaw}
            companyOptions={companyOptions}
            onTokenChange={setToken}
            onCompanySlugChange={setCompanyRaw}
          />
          {(moduleId === "trust-summary" || moduleId === "scorecards") && (
            <label className="mt-4 block text-sm">
              <span className="twin-muted">{t(tk("subjectLabel"))}</span>
              <input
                className="twin-input mt-1 w-full"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                aria-label={t(tk("subjectLabel"))}
              />
            </label>
          )}
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading || !token.trim() || !companySlug}
            className="twin-btn-primary mt-4 disabled:opacity-50"
          >
            {loading ? t(tk("loading")) : t(tk("loadCta"))}
          </button>
        </Card>

        {error ? (
          <p className="mb-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        {!payload && !loading ? (
          <GuidedEmptyState
            title={t(tk("emptyTitle"))}
            message={t(tk("emptyBody"))}
            steps={[t(tk("emptyStep1")), t(tk("emptyStep2"))]}
            actionLabel={t(tk("loadCta"))}
            onAction={() => void load()}
          />
        ) : null}

        {moduleId === "org-settings" && payload ? (
          <Card variant="soft" className="mb-6 space-y-3 border-[var(--twin-border)]/80 p-4">
            <label className="block text-sm">
              <span className="twin-muted">{t(tk("displayName"))}</span>
              <input
                className="twin-input mt-1 w-full"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="twin-muted">{t(tk("timezone"))}</span>
              <input
                className="twin-input mt-1 w-full"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="twin-muted">{t(tk("locale"))}</span>
              <input
                className="twin-input mt-1 w-full"
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="twin-btn-primary disabled:opacity-50"
              disabled={loading}
              onClick={() => void saveOrgSettings()}
            >
              {t(tk("saveCta"))}
            </button>
          </Card>
        ) : null}

        {moduleId === "scorecards" && payload ? (
          <Card variant="soft" className="mb-6 space-y-3 border-[var(--twin-border)]/80 p-4">
            <label className="block text-sm">
              <span className="twin-muted">{t(tk("summaryLabel"))}</span>
              <textarea
                className="twin-input mt-1 w-full"
                rows={3}
                value={scoreSummary}
                onChange={(e) => setScoreSummary(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="twin-btn-primary disabled:opacity-50"
              disabled={loading}
              onClick={() => void createScorecard()}
            >
              {t(tk("createCta"))}
            </button>
          </Card>
        ) : null}

        {moduleId === "notifications" && payload ? (
          <Card variant="soft" className="mb-6 space-y-3 border-[var(--twin-border)]/80 p-4">
            <p className="text-sm twin-muted">{t(tk("draftOnlyNotice"))}</p>
            <label className="block text-sm">
              <span className="twin-muted">{t(tk("previewLabel"))}</span>
              <textarea
                className="twin-input mt-1 w-full"
                rows={3}
                value={notifPreview}
                onChange={(e) => setNotifPreview(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="twin-btn-primary disabled:opacity-50"
              disabled={loading}
              onClick={() => void load()}
            >
              {t(tk("draftCta"))}
            </button>
          </Card>
        ) : null}

        {payload ? (
          <Card variant="soft" className="border-[var(--twin-border)]/80 p-4">
            <h2 className="text-sm font-semibold">{t(tk("payloadTitle"))}</h2>
            <pre
              className="mt-3 max-h-[28rem] overflow-auto rounded-md bg-[var(--twin-surface-soft)] p-3 text-xs leading-relaxed"
              data-company-wave3-payload
            >
              {JSON.stringify(payload, null, 2)}
            </pre>
          </Card>
        ) : null}
      </div>
    </Shell>
  );
}
