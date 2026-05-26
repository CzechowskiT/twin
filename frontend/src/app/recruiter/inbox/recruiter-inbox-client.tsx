"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { RecruiterAccessFields } from "@/components/recruiter/recruiter-access-fields";
import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import {
  RECRUITER_DEMO_COMPANY_SLUG,
  companySlugToLabel,
  mergeCompanyOptions,
  parseRecruiterInviteSearchParams,
  readRecruiterInboxDemoEnv,
  readRecruiterInboxSession,
  recruiterInboxQuery,
  resolveCompanySlugFromRaw,
  writeRecruiterInboxSession,
} from "@/lib/recruiter-inbox";

type BatchRow = {
  application_id: number;
  job_title: string;
  company: string;
  candidate_name: string;
  status: string;
  applied_at: string | null;
  updated_at: string | null;
};

type AuthMeBilling = {
  billing_company_name?: string | null;
};

export default function RecruiterInboxClient() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const [token, setToken] = useState("");
  const [companyRaw, setCompanyRaw] = useState("");
  const [rows, setRows] = useState<BatchRow[]>([]);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [queueLoaded, setQueueLoaded] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [billingCompany, setBillingCompany] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "applied" | "interview">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [declineTargetId, setDeclineTargetId] = useState<number | null>(null);
  const [declineNote, setDeclineNote] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [batchDeclineOpen, setBatchDeclineOpen] = useState(false);
  const [batchDeclineNote, setBatchDeclineNote] = useState("");
  const autoLoadDone = useRef(false);

  const companyOptions = useMemo(
    () =>
      mergeCompanyOptions(
        companyRaw,
        readRecruiterInboxSession().companySlug,
        parseRecruiterInviteSearchParams(searchParams).companySlug,
        readRecruiterInboxDemoEnv().companySlug,
        billingCompany,
      ),
    [companyRaw, searchParams, billingCompany],
  );

  const knownSlugs = useMemo(() => new Set(companyOptions.map((o) => o.slug)), [companyOptions]);

  const companySlug = useMemo(
    () => resolveCompanySlugFromRaw(companyRaw, knownSlugs),
    [companyRaw, knownSlugs],
  );

  useEffect(() => {
    const fromUrl = parseRecruiterInviteSearchParams(searchParams);
    const session = readRecruiterInboxSession();
    const demoEnv = readRecruiterInboxDemoEnv();
    queueMicrotask(() => {
      setToken(fromUrl.token || session.token || demoEnv.token || "");
      setCompanyRaw(fromUrl.companySlug || session.companySlug || demoEnv.companySlug || "");
      setHydrated(true);
    });
  }, [searchParams]);

  useEffect(() => {
    const authToken = getToken();
    if (!authToken) return;
    void (async () => {
      try {
        const me = await apiFetch<AuthMeBilling>("/api/v1/auth/me", {}, authToken);
        const name = (me.billing_company_name ?? "").trim();
        if (name) setBillingCompany(name);
      } catch {
        /* optional */
      }
    })();
  }, []);

  const load = useCallback(async () => {
    const tkn = token.trim();
    const slug = companySlug;
    if (!tkn || !slug) {
      setSubmitAttempted(true);
      setAuthError(t("recruiterInbox.missingAuth"));
      return;
    }
    setSubmitAttempted(true);
    setAuthError(null);
    setLoadError(null);
    setLoading(true);
    writeRecruiterInboxSession(tkn, slug);
    setCompanyRaw(slug);
    try {
      const q = recruiterInboxQuery(tkn, slug);
      const res = await fetch(`/api/recruiter/inbox?${q}`, { cache: "no-store" });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || t("recruiterInbox.loadFailed"));
      }
      const data = (await res.json()) as { items: BatchRow[] };
      setRows(data.items ?? []);
      setSelectedIds(new Set());
      setQueueLoaded(true);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : t("recruiterInbox.loadFailed"));
      setRows([]);
      setQueueLoaded(false);
    } finally {
      setLoading(false);
    }
  }, [token, companySlug, t]);

  useEffect(() => {
    if (!hydrated || autoLoadDone.current) return;
    const tkn = token.trim();
    const slug = companySlug;
    if (!tkn || !slug) return;
    autoLoadDone.current = true;
    queueMicrotask(() => {
      void load();
    });
  }, [hydrated, token, companySlug, load]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!q) return true;
      const hay = `${r.candidate_name} ${r.job_title} ${r.company}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rows, statusFilter, searchQuery]);

  const visibleIds = useMemo(() => filteredRows.map((r) => r.application_id), [filteredRows]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

  function toggleSelected(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllVisible() {
    setSelectedIds((prev) => {
      if (allVisibleSelected) {
        const next = new Set(prev);
        for (const id of visibleIds) next.delete(id);
        return next;
      }
      const next = new Set(prev);
      for (const id of visibleIds) next.add(id);
      return next;
    });
  }

  async function respondBatch(action: "accept" | "decline", opts?: { decline_note?: string }) {
    const tkn = token.trim();
    const slug = companySlug;
    const ids = [...selectedIds];
    if (!tkn || !slug || ids.length === 0) return;
    setBusyId(`batch-${action}`);
    setLoadError(null);
    try {
      const q = recruiterInboxQuery(tkn, slug);
      const body: { action: string; application_ids: number[]; decline_note?: string } = {
        action,
        application_ids: ids,
      };
      if (action === "decline" && opts?.decline_note?.trim()) {
        body.decline_note = opts.decline_note.trim();
      }
      const res = await fetch(`/api/recruiter/inbox/respond-batch?${q}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      setBatchDeclineOpen(false);
      setBatchDeclineNote("");
      setSelectedIds(new Set());
      await load();
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : t("recruiterInbox.loadFailed"));
    } finally {
      setBusyId(null);
    }
  }

  async function respond(
    applicationId: number,
    action: "accept" | "decline",
    opts?: { decline_note?: string },
  ) {
    const tkn = token.trim();
    const slug = companySlug;
    if (!tkn || !slug) return;
    const key = `${applicationId}-${action}`;
    setBusyId(key);
    setLoadError(null);
    try {
      const q = recruiterInboxQuery(tkn, slug);
      const body: { action: string; decline_note?: string } = { action };
      if (action === "decline" && opts?.decline_note?.trim()) {
        body.decline_note = opts.decline_note.trim();
      }
      const res = await fetch(`/api/recruiter/inbox/${applicationId}/respond?${q}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      setDeclineTargetId(null);
      setDeclineNote("");
      await load();
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : t("recruiterInbox.loadFailed"));
    } finally {
      setBusyId(null);
    }
  }

  function applyDemoCompany() {
    setCompanyRaw(RECRUITER_DEMO_COMPANY_SLUG);
    setAuthError(null);
    setSubmitAttempted(false);
  }

  function resetWorkspace() {
    setQueueLoaded(false);
    setRows([]);
    setLoadError(null);
    setAuthError(null);
    setSubmitAttempted(false);
    autoLoadDone.current = false;
  }

  const showAuthError = submitAttempted && authError;
  const companyLabel = companySlug ? companySlugToLabel(companySlug) : "";

  return (
    <Shell wide>
      <Card>
        <h1 className="mb-2 text-2xl font-semibold">{t("recruiterInbox.title")}</h1>
        <p className="twin-muted mb-2 text-sm leading-relaxed">{t("recruiterInbox.lead")}</p>
        <p className="mb-6 text-sm leading-relaxed text-[var(--foreground)]">{t("recruiterInbox.helperInvite")}</p>

        {!queueLoaded ? (
          <div
            className="mb-6 rounded-lg border border-dashed border-[var(--twin-border)] bg-[var(--twin-surface)]/60 px-4 py-4"
            role="status"
          >
            <p className="text-sm font-semibold text-[var(--foreground)]">{t("recruiterInbox.emptyStateTitle")}</p>
            <p className="twin-muted mt-2 text-sm leading-relaxed">{t("recruiterInbox.emptyStateBody")}</p>
          </div>
        ) : null}

        <RecruiterAccessFields
          token={token}
          onTokenChange={(v) => {
            setToken(v);
            setAuthError(null);
          }}
          companySlug={companyRaw}
          onCompanySlugChange={(v) => {
            setCompanyRaw(v);
            setAuthError(null);
          }}
          companyOptions={companyOptions}
        />

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="twin-btn-solid twin-touch-target"
            disabled={loading}
            onClick={() => void load()}
          >
            {loading ? t("common.loadingEllipsis") : t("recruiterInbox.load")}
          </button>
          <button type="button" className="twin-btn-ghost twin-touch-target text-sm" onClick={applyDemoCompany}>
            {t("recruiterInbox.demoCompanyCta")}
          </button>
        </div>

        {billingCompany ? (
          <p className="twin-muted mt-3 text-xs leading-relaxed">
            {t("recruiterInbox.signedInCompanyHint").replace("{company}", billingCompany)}
          </p>
        ) : null}

        {showAuthError ? <p className="mt-3 text-sm text-red-600">{authError}</p> : null}
        {loadError ? <p className="mt-3 text-sm text-red-600">{loadError}</p> : null}

        {queueLoaded ? (
          <>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--twin-border)] pt-6">
              <p className="text-sm font-semibold text-[var(--foreground)]">
                {t("recruiterInbox.queueTitle").replace("{company}", companyLabel || companySlug)}
              </p>
              <button type="button" className="twin-link text-xs font-medium" onClick={resetWorkspace}>
                {t("recruiterInbox.changeWorkspace")}
              </button>
            </div>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <label className="flex min-w-[10rem] flex-col gap-1 text-xs">
                <span className="font-medium text-[var(--foreground)]">{t("recruiterInbox.filterStatusLabel")}</span>
                <select
                  className="twin-input text-sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as "all" | "applied" | "interview")}
                >
                  <option value="all">{t("recruiterInbox.filterStatusAll")}</option>
                  <option value="applied">{t("recruiterInbox.filterStatusApplied")}</option>
                  <option value="interview">{t("recruiterInbox.filterStatusInterview")}</option>
                </select>
              </label>
              <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs">
                <span className="sr-only">{t("recruiterInbox.filterSearchPlaceholder")}</span>
                <input
                  type="search"
                  className="twin-input text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("recruiterInbox.filterSearchPlaceholder")}
                />
              </label>
            </div>
            {filteredRows.length > 0 ? (
              <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface-2)]/60 px-3 py-2">
                <label className="flex items-center gap-2 text-xs font-medium text-[var(--foreground)]">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAllVisible}
                    className="h-4 w-4 rounded border-[var(--twin-border)]"
                  />
                  {t("recruiterInbox.selectAllVisible")}
                </label>
                <span className="text-xs text-[var(--twin-muted)]">
                  {t("recruiterInbox.selectedCount").replace("{count}", String(selectedIds.size))}
                </span>
                <button
                  type="button"
                  className="twin-btn-solid text-xs"
                  disabled={busyId !== null || selectedIds.size === 0}
                  onClick={() => void respondBatch("accept")}
                >
                  {busyId === "batch-accept" ? t("common.loadingEllipsis") : t("recruiterInbox.batchAccept")}
                </button>
                <button
                  type="button"
                  className="twin-btn-ghost text-xs"
                  disabled={busyId !== null || selectedIds.size === 0}
                  onClick={() => {
                    setBatchDeclineOpen(true);
                    setBatchDeclineNote("");
                  }}
                >
                  {t("recruiterInbox.batchDecline")}
                </button>
              </div>
            ) : null}
            {batchDeclineOpen ? (
              <div className="mt-3 rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface-2)]/80 p-3">
                <label className="block text-xs font-medium text-[var(--foreground)]">
                  {t("recruiterInbox.declineNoteLabel")}
                  <textarea
                    className="twin-input mt-1 min-h-[4rem] w-full text-sm"
                    value={batchDeclineNote}
                    onChange={(e) => setBatchDeclineNote(e.target.value)}
                    placeholder={t("recruiterInbox.declineNotePlaceholder")}
                  />
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="twin-btn-solid text-xs"
                    disabled={busyId !== null}
                    onClick={() => void respondBatch("decline", { decline_note: batchDeclineNote })}
                  >
                    {busyId === "batch-decline" ? t("common.loadingEllipsis") : t("recruiterInbox.batchDeclineConfirm")}
                  </button>
                  <button type="button" className="twin-btn-ghost text-xs" onClick={() => setBatchDeclineOpen(false)}>
                    {t("recruiterInbox.declineCancel")}
                  </button>
                </div>
              </div>
            ) : null}
            {!loading && rows.length === 0 && !loadError ? (
              <p className="twin-muted mt-4 text-sm">{t("recruiterInbox.empty")}</p>
            ) : !loading && filteredRows.length === 0 ? (
              <p className="twin-muted mt-4 text-sm">{t("recruiterInbox.empty")}</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {filteredRows.map((r) => (
                  <li
                    key={r.application_id}
                    className="rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface)] px-4 py-3 text-sm"
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(r.application_id)}
                        onChange={() => toggleSelected(r.application_id)}
                        className="mt-1 h-4 w-4 shrink-0 rounded border-[var(--twin-border)]"
                        aria-label={t("recruiterInbox.selectRow").replace("{name}", r.candidate_name)}
                      />
                      <div className="min-w-0 flex-1">
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
                        {busyId === `${r.application_id}-accept`
                          ? t("common.loadingEllipsis")
                          : t("recruiterInbox.accept")}
                      </button>
                      <button
                        type="button"
                        className="twin-btn-ghost text-xs"
                        disabled={busyId !== null}
                        onClick={() => {
                          setDeclineTargetId(r.application_id);
                          setDeclineNote("");
                        }}
                      >
                        {t("recruiterInbox.decline")}
                      </button>
                    </div>
                    {declineTargetId === r.application_id ? (
                      <div className="mt-3 rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface-2)]/80 p-3">
                        <label className="block text-xs font-medium text-[var(--foreground)]">
                          {t("recruiterInbox.declineNoteLabel")}
                          <textarea
                            className="twin-input mt-1 min-h-[4rem] w-full text-sm"
                            value={declineNote}
                            onChange={(e) => setDeclineNote(e.target.value)}
                            placeholder={t("recruiterInbox.declineNotePlaceholder")}
                          />
                        </label>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="twin-btn-solid text-xs"
                            disabled={busyId !== null}
                            onClick={() =>
                              void respond(r.application_id, "decline", { decline_note: declineNote })
                            }
                          >
                            {busyId === `${r.application_id}-decline`
                              ? t("common.loadingEllipsis")
                              : t("recruiterInbox.declineConfirm")}
                          </button>
                          <button
                            type="button"
                            className="twin-btn-ghost text-xs"
                            onClick={() => {
                              setDeclineTargetId(null);
                              setDeclineNote("");
                            }}
                          >
                            {t("recruiterInbox.declineCancel")}
                          </button>
                        </div>
                      </div>
                    ) : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : null}

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
