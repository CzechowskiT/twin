"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { RecruiterAccessFields } from "@/components/recruiter/recruiter-access-fields";
import { RecruiterWorkspaceNav } from "@/components/recruiter/recruiter-workspace-nav";
import { useTranslation } from "@/components/language-provider";
import { useAbortableFetch } from "@/hooks/use-abortable-fetch";
import { useLoadWhenVisible } from "@/hooks/use-load-when-visible";
import { Card, Shell } from "@/components/ui";
import {
  mergeCompanyOptions,
  readRecruiterInboxSession,
  recruiterInboxQuery,
  resolveCompanySlugFromRaw,
  writeRecruiterInboxSession,
} from "@/lib/recruiter-inbox";
import {
  RECRUITER_TALENT_POOL_MARKERS,
  RECRUITER_TALENT_POOL_ROUTE,
  TALENT_POOL_CSV_TEMPLATE,
  talentPoolImportQuery,
  type TalentPoolCommitPayload,
  type TalentPoolPreviewPayload,
} from "@/lib/recruiter-talent-pool";

export default function RecruiterTalentPoolImportClient() {
  const { t } = useTranslation();
  const { fetch: fetchAbortable } = useAbortableFetch();
  const previewDeferred = useLoadWhenVisible({ rootMargin: "100px 0px" });
  const [token, setToken] = useState("");
  const [companyRaw, setCompanyRaw] = useState("");
  const [csvText, setCsvText] = useState(TALENT_POOL_CSV_TEMPLATE);
  const [preview, setPreview] = useState<TalentPoolPreviewPayload | null>(null);
  const [commitResult, setCommitResult] = useState<TalentPoolCommitPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const companyOptions = useMemo(
    () => mergeCompanyOptions(companyRaw, readRecruiterInboxSession().companySlug),
    [companyRaw],
  );
  const knownSlugs = useMemo(() => new Set(companyOptions.map((o) => o.slug)), [companyOptions]);
  const companySlug = useMemo(
    () => resolveCompanySlugFromRaw(companyRaw, knownSlugs),
    [companyRaw, knownSlugs],
  );

  useEffect(() => {
    const s = readRecruiterInboxSession();
    queueMicrotask(() => {
      setToken(s.token);
      setCompanyRaw(s.companySlug);
    });
  }, []);

  const runPreview = useCallback(async () => {
    const tkn = token.trim();
    const slug = companySlug;
    if (!tkn || !slug) return;
    writeRecruiterInboxSession(tkn, slug);
    setLoading(true);
    setError(null);
    setCommitResult(null);
    try {
      const q = talentPoolImportQuery(tkn, slug);
      const res = await fetchAbortable(`/api/recruiter/talent-pool/import/preview?${q}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv_text: csvText, import_source: "csv_paste" }),
      });
      if (!res.ok) {
        const detail = await res.text();
        setError(detail.slice(0, 200));
        setPreview(null);
        return;
      }
      setPreview((await res.json()) as TalentPoolPreviewPayload);
    } finally {
      setLoading(false);
    }
  }, [token, companySlug, csvText, fetchAbortable]);

  const runCommit = useCallback(async () => {
    if (!preview?.import_id) return;
    const tkn = token.trim();
    const slug = companySlug;
    if (!tkn || !slug) return;
    setLoading(true);
    setError(null);
    try {
      const q = talentPoolImportQuery(tkn, slug);
      const res = await fetchAbortable(`/api/recruiter/talent-pool/import/commit?${q}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ import_id: preview.import_id }),
      });
      if (!res.ok) {
        setError(await res.text());
        return;
      }
      setCommitResult((await res.json()) as TalentPoolCommitPayload);
    } finally {
      setLoading(false);
    }
  }, [preview, token, companySlug, fetchAbortable]);

  return (
    <Shell wide data-testid={RECRUITER_TALENT_POOL_MARKERS.importPage}>
      <RecruiterWorkspaceNav />
      <header className="mb-6 space-y-2">
        <Link href={RECRUITER_TALENT_POOL_ROUTE} className="twin-muted text-xs underline">
          ← {t("recruiterTalentPoolImport.backToPool")}
        </Link>
        <h1 className="twin-page-intro text-2xl font-semibold">{t("recruiterTalentPoolImport.title")}</h1>
        <p className="twin-muted max-w-2xl text-sm">{t("recruiterTalentPoolImport.lead")}</p>
      </header>

      <Card variant="soft" className="mb-6 p-4">
        <RecruiterAccessFields
          token={token}
          companySlug={companyRaw}
          companyOptions={companyOptions}
          onTokenChange={setToken}
          onCompanySlugChange={setCompanyRaw}
        />
      </Card>

      <Card variant="soft" className="mb-6 p-4">
        <label className="mb-2 block text-sm font-medium" htmlFor="csv-paste">
          {t("recruiterTalentPoolImport.csvLabel")}
        </label>
        <p className="twin-muted mb-3 text-xs">{t("recruiterTalentPoolImport.csvHint")}</p>
        <textarea
          id="csv-paste"
          data-testid={RECRUITER_TALENT_POOL_MARKERS.csvPaste}
          className="twin-input min-h-[180px] w-full font-mono text-xs"
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
        />
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" className="twin-btn-primary" disabled={loading} onClick={() => void runPreview()}>
            {loading ? t("recruiterTalentPoolImport.previewing") : t("recruiterTalentPoolImport.previewCta")}
          </button>
        </div>
        {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
      </Card>

      {preview ? (
        <div ref={previewDeferred.ref}>
          {previewDeferred.shouldLoad ? (
        <Card variant="soft" className="mb-6 p-4" data-testid={RECRUITER_TALENT_POOL_MARKERS.previewPanel}>
          <h2 className="mb-2 text-sm font-semibold">{t("recruiterTalentPoolImport.previewTitle")}</h2>
          <p className="twin-muted mb-3 text-xs">
            {t("recruiterTalentPoolImport.previewSummary")
              .replace("{ready}", String(preview.summary.ready))
              .replace("{duplicates}", String(preview.summary.duplicates))
              .replace("{errors}", String(preview.summary.errors))}
          </p>
          <ul className="mb-4 max-h-64 overflow-y-auto divide-y divide-white/5 text-sm">
            {preview.rows.map((row) => (
              <li key={row.row_index} className="flex justify-between py-2">
                <span>{row.display_name}</span>
                <span className={row.status === "ready" ? "text-emerald-400" : row.status === "duplicate" ? "text-amber-400" : "text-red-400"}>
                  {row.status}
                </span>
              </li>
            ))}
          </ul>
          {preview.summary.ready > 0 ? (
            <button
              type="button"
              className="twin-btn-primary"
              data-testid={RECRUITER_TALENT_POOL_MARKERS.commitButton}
              disabled={loading}
              onClick={() => void runCommit()}
            >
              {loading ? t("recruiterTalentPoolImport.committing") : t("recruiterTalentPoolImport.commitCta")}
            </button>
          ) : null}
        </Card>
          ) : (
            <div className="mb-6 h-32 animate-pulse rounded-xl border border-[var(--twin-border)]/60 bg-[var(--twin-surface-soft)]/40" />
          )}
        </div>
      ) : null}

      {commitResult ? (
        <Card variant="soft" className="p-4" data-testid={RECRUITER_TALENT_POOL_MARKERS.resultPanel}>
          <h2 className="mb-2 text-sm font-semibold text-emerald-400">{t("recruiterTalentPoolImport.resultTitle")}</h2>
          <p className="text-sm">
            {t("recruiterTalentPoolImport.resultBody")
              .replace("{accepted}", String(commitResult.summary.accepted))
              .replace("{skipped}", String(commitResult.summary.duplicates_skipped))}
          </p>
          <Link href={RECRUITER_TALENT_POOL_ROUTE} className="twin-btn-secondary mt-4 inline-block">
            {t("recruiterTalentPoolImport.viewPoolCta")}
          </Link>
        </Card>
      ) : null}

      <footer className="mt-8 border-t border-white/10 pt-4 text-xs twin-muted">
        <p>{t("recruiterTalentPoolImport.trustCopy")}</p>
      </footer>
    </Shell>
  );
}
