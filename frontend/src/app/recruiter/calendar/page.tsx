"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { RecruiterAccessFields } from "@/components/recruiter/recruiter-access-fields";
import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";
import { WorkspaceStatusBadge } from "@/components/workspace/workspace-status-badge";
import {
  mergeCompanyOptions,
  readRecruiterInboxSession,
  recruiterInboxQuery,
  resolveCompanySlugFromRaw,
  writeRecruiterInboxSession,
} from "@/lib/recruiter-inbox";

type InterviewRow = {
  id?: number | string;
  title?: string;
  company_name?: string;
  starts_at?: string;
  status?: string;
  source?: string;
};

export default function RecruiterCalendarPage() {
  const { t } = useTranslation();
  const [token, setToken] = useState("");
  const [companyRaw, setCompanyRaw] = useState("");
  const [rows, setRows] = useState<InterviewRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [holdTitle, setHoldTitle] = useState("Interview hold");

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
      setRows([]);
      return;
    }
    writeRecruiterInboxSession(tkn, slug);
    setLoading(true);
    setError(null);
    try {
      const q = recruiterInboxQuery(tkn, slug);
      const res = await fetch(`/api/recruiter/calendar/interviews?${q}`, { cache: "no-store" });
      if (!res.ok) {
        setError(t("recruiterCalendar.loadFailed"));
        setRows([]);
        return;
      }
      const data = (await res.json()) as { interviews?: InterviewRow[]; holds?: InterviewRow[] };
      setRows([...(data.interviews ?? []), ...(data.holds ?? [])]);
    } finally {
      setLoading(false);
    }
  }, [token, companySlug, t]);

  const createHold = useCallback(async () => {
    const tkn = token.trim();
    const slug = companySlug;
    if (!tkn || !slug) return;
    setLoading(true);
    setError(null);
    try {
      const q = recruiterInboxQuery(tkn, slug);
      const start = new Date(Date.now() + 86400000);
      const end = new Date(start.getTime() + 3600000);
      const res = await fetch(`/api/recruiter/calendar/holds?${q}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: holdTitle.slice(0, 200),
          starts_at: start.toISOString(),
          ends_at: end.toISOString(),
        }),
        cache: "no-store",
      });
      if (!res.ok) {
        setError(t("recruiterCalendar.saveFailed"));
        return;
      }
      await load();
    } finally {
      setLoading(false);
    }
  }, [token, companySlug, holdTitle, load, t]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  return (
    <Shell wide>
      <div className="mx-auto max-w-4xl" data-recruiter-calendar-live>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--twin-muted-strong)]">
            {t("recruiterCalendar.eyebrow")}
          </p>
          <WorkspaceStatusBadge status="live" />
        </div>
        <h1 className="twin-section-title mt-2 text-2xl sm:text-3xl">{t("recruiterCalendar.title")}</h1>
        <p className="twin-muted mt-3 text-sm leading-relaxed">{t("recruiterCalendar.liveLead")}</p>

        <Card variant="soft" className="mt-6 border-[var(--twin-border)]/80 p-4">
          <RecruiterAccessFields
            idPrefix="recruiter-calendar"
            token={token}
            companySlug={companyRaw}
            companyOptions={companyOptions}
            onTokenChange={setToken}
            onCompanySlugChange={setCompanyRaw}
          />
          <button
            type="button"
            className="twin-btn-primary mt-4 disabled:opacity-50"
            disabled={loading || !token.trim() || !companySlug}
            onClick={() => void load()}
          >
            {loading ? t("recruiterCalendar.loading") : t("recruiterCalendar.loadCta")}
          </button>
        </Card>

        {error ? (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <Card variant="soft" className="mt-6 space-y-3 border-[var(--twin-border)]/80 p-4">
          <h2 className="text-sm font-semibold">{t("recruiterCalendar.holdsTitle")}</h2>
          <p className="twin-muted text-sm">{t("recruiterCalendar.holdsLead")}</p>
          <label className="block text-sm">
            <span className="twin-muted">{t("recruiterCalendar.holdTitleLabel")}</span>
            <input
              className="twin-input mt-1 w-full"
              value={holdTitle}
              onChange={(e) => setHoldTitle(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="twin-btn-primary disabled:opacity-50"
            disabled={loading || !token.trim() || !companySlug}
            onClick={() => void createHold()}
          >
            {t("recruiterCalendar.createHoldCta")}
          </button>
        </Card>

        <Card variant="soft" className="mt-6 border-[var(--twin-border)]/80 p-4">
          <h2 className="text-sm font-semibold">{t("recruiterCalendar.listTitle")}</h2>
          {rows.length === 0 ? (
            <p className="twin-muted mt-3 text-sm">{t("recruiterCalendar.empty")}</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {rows.map((row, idx) => (
                <li
                  key={`${row.id ?? idx}`}
                  className="rounded-md bg-[var(--twin-surface-soft)] px-3 py-2 text-sm"
                >
                  <span className="font-medium">{row.title || row.company_name || "Hold"}</span>
                  {row.starts_at ? (
                    <span className="twin-muted ml-2">{row.starts_at}</span>
                  ) : null}
                  {row.status ? (
                    <span className="twin-muted ml-2">· {row.status}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </Shell>
  );
}
