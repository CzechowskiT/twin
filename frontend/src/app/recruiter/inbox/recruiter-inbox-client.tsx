"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";

const STORAGE_TOKEN = "twin_recruiter_inbox_token";
const STORAGE_COMPANY = "twin_recruiter_company_slug";

type BatchRow = {
  application_id: number;
  job_title: string;
  company: string;
  candidate_name: string;
  status: string;
  applied_at: string | null;
  updated_at: string | null;
};

export default function RecruiterInboxClient() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const [token, setToken] = useState("");
  const [companySlug, setCompanySlug] = useState("");
  const [rows, setRows] = useState<BatchRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    try {
      setToken(searchParams.get("token")?.trim() || sessionStorage.getItem(STORAGE_TOKEN) || "");
      setCompanySlug(searchParams.get("company_slug")?.trim() || sessionStorage.getItem(STORAGE_COMPANY) || "");
    } catch {
      /* ignore */
    }
  }, [searchParams]);

  const load = useCallback(async () => {
    const tkn = token.trim();
    const slug = companySlug.trim();
    if (!tkn || !slug) {
      setErr(t("recruiterInbox.missingAuth"));
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      sessionStorage.setItem(STORAGE_TOKEN, tkn);
      sessionStorage.setItem(STORAGE_COMPANY, slug);
    } catch {
      /* ignore */
    }
    try {
      const q = new URLSearchParams({ company_slug: slug, token: tkn });
      const res = await fetch(`/api/recruiter/inbox?${q}`, { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { items: BatchRow[] };
      setRows(data.items ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Load failed");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [token, companySlug, t]);

  async function respond(applicationId: number, action: "accept" | "decline") {
    const tkn = token.trim();
    const slug = companySlug.trim();
    if (!tkn || !slug) return;
    const key = `${applicationId}-${action}`;
    setBusyId(key);
    try {
      const q = new URLSearchParams({ company_slug: slug, token: tkn });
      const res = await fetch(`/api/recruiter/inbox/${applicationId}/respond?${q}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error(await res.text());
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Shell wide>
      <Card>
        <h1 className="mb-2 text-2xl font-semibold">{t("recruiterInbox.title")}</h1>
        <p className="twin-muted mb-6 text-sm leading-relaxed">{t("recruiterInbox.lead")}</p>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end">
          <input
            className="twin-input min-w-0 flex-1"
            type="password"
            placeholder={t("recruiterInbox.tokenPlaceholder")}
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
          <input
            className="twin-input min-w-0 flex-1"
            placeholder={t("recruiterInbox.companyPlaceholder")}
            value={companySlug}
            onChange={(e) => setCompanySlug(e.target.value)}
          />
          <button type="button" className="twin-btn-solid twin-touch-target" disabled={loading} onClick={() => void load()}>
            {loading ? t("common.loadingEllipsis") : t("recruiterInbox.load")}
          </button>
        </div>
        {err ? <p className="mb-4 text-sm text-red-600">{err}</p> : null}
        {!loading && rows.length === 0 && !err ? (
          <p className="twin-muted text-sm">{t("recruiterInbox.empty")}</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => (
              <li
                key={r.application_id}
                className="rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface)] px-4 py-3 text-sm"
              >
                <p className="font-semibold">
                  {r.candidate_name} · {r.job_title}
                </p>
                <p className="twin-muted mt-1 text-xs">
                  {r.company} · {r.status} · #{r.application_id}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="twin-btn-solid text-xs"
                    disabled={busyId !== null}
                    onClick={() => void respond(r.application_id, "accept")}
                  >
                    {busyId === `${r.application_id}-accept` ? t("common.loadingEllipsis") : t("recruiterInbox.accept")}
                  </button>
                  <button
                    type="button"
                    className="twin-btn-ghost text-xs"
                    disabled={busyId !== null}
                    onClick={() => void respond(r.application_id, "decline")}
                  >
                    {busyId === `${r.application_id}-decline` ? t("common.loadingEllipsis") : t("recruiterInbox.decline")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-8 flex flex-wrap gap-4">
          <Link href="/recruiter/jobs" className="twin-link text-sm font-medium">
            {t("recruiterInbox.jobsLink")}
          </Link>
          <Link href="/for-recruiters" className="twin-link text-sm">
            {t("recruiterInbox.back")}
          </Link>
        </div>
      </Card>
    </Shell>
  );
}
