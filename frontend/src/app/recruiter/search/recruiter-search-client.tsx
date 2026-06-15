"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import type { TranslationKey } from "@/lib/i18n";
import { RecruiterAccessFields } from "@/components/recruiter/recruiter-access-fields";
import { Card, Shell } from "@/components/ui";
import { GuidedEmptyState } from "@/components/ux/guided-empty-state";
import { apiFetch } from "@/lib/api";
import { getClientApiLocale } from "@/lib/api-locale";
import { getToken } from "@/lib/auth";
import {
  DEFAULT_RECRUITER_SEARCH_FILTERS,
  RECRUITER_SEARCH_MARKERS,
  recruiterInboxHighlightHref,
  recruiterSearchQueryParams,
  type RecruiterSearchFilters,
} from "@/lib/recruiter-candidate-search";
import {
  parseRecruiterInboxErrorDetail,
  recruiterInboxErrorMessageKey,
} from "@/lib/recruiter-inbox-errors";
import {
  companySlugToLabel,
  mergeCompanyOptions,
  parseRecruiterInviteSearchParams,
  readRecruiterInboxDemoEnv,
  readRecruiterInboxSession,
  resolveCompanySlugFromRaw,
  writeRecruiterInboxSession,
} from "@/lib/recruiter-inbox";
import { recruiterInboxStatusLabelKey } from "@/lib/recruiter-inbox-segments";
import {
  recruiterInboxCandidateCardClass,
  recruiterInboxMatchScoreValueClass,
} from "@/lib/recruiter-inbox-visual";
import type { RecruiterReviewCard } from "@/lib/recruiter-review-card";
import {
  recruiterDataVisibilitySummary,
  type RecruiterDataVisibility,
} from "@/lib/recruiter-data-visibility";

type SearchRow = RecruiterDataVisibility & {
  application_id: number;
  job_title: string;
  company: string;
  candidate_name: string;
  status: string;
  pipeline_status?: string;
  match_score?: number | null;
  match_score_label?: string | null;
  match_reasons?: string[] | null;
  candidate_location?: string | null;
  talent_pool_opt_in?: boolean;
  review_card?: RecruiterReviewCard | null;
};

type AuthMeBilling = { billing_company_name?: string | null };

export default function RecruiterSearchClient() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const [token, setToken] = useState("");
  const [companyRaw, setCompanyRaw] = useState("");
  const [filters, setFilters] = useState<RecruiterSearchFilters>(DEFAULT_RECRUITER_SEARCH_FILTERS);
  const [rows, setRows] = useState<SearchRow[]>([]);
  const [scopeLabel, setScopeLabel] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [searched, setSearched] = useState(false);
  const [billingCompany, setBillingCompany] = useState<string | null>(null);
  const autoSearchDone = useRef(false);

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
  const isDemo = companySlug === "nova-hiring-pl";

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

  const runSearch = useCallback(async () => {
    const tkn = token.trim();
    const slug = companySlug;
    if (!tkn || !slug) {
      setAuthError(t("recruiterSearch.missingAuth"));
      return;
    }
    setAuthError(null);
    setLoadError(null);
    setLoading(true);
    writeRecruiterInboxSession(tkn, slug);
    setCompanyRaw(slug);
    try {
      const q = recruiterSearchQueryParams(tkn, slug, filters);
      const res = await fetch(`/api/recruiter/search?${q}`, {
        cache: "no-store",
        headers: { "X-Locale": getClientApiLocale() ?? "en" },
      });
      if (!res.ok) {
        const body = await res.text();
        const key = recruiterInboxErrorMessageKey(parseRecruiterInboxErrorDetail(body), res.status);
        setLoadError(t(`recruiterInbox.${key}`));
        setRows([]);
        setSearched(false);
        return;
      }
      const data = (await res.json()) as { items?: SearchRow[]; company_slug?: string };
      setRows(data.items ?? []);
      setScopeLabel(companySlugToLabel(data.company_slug ?? slug));
      setSearched(true);
    } catch {
      setLoadError(t("recruiterInbox.errorNetwork"));
      setRows([]);
      setSearched(false);
    } finally {
      setLoading(false);
    }
  }, [token, companySlug, filters, t]);

  useEffect(() => {
    if (!hydrated || autoSearchDone.current) return;
    const tkn = token.trim();
    const slug = companySlug;
    if (!tkn || !slug) return;
    autoSearchDone.current = true;
    queueMicrotask(() => {
      void runSearch();
    });
  }, [hydrated, token, companySlug, runSearch]);

  function updateFilter<K extends keyof RecruiterSearchFilters>(key: K, value: RecruiterSearchFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <Shell wide>
      <div className={RECRUITER_SEARCH_MARKERS.page} data-testid={RECRUITER_SEARCH_MARKERS.page}>
        <div className="mx-auto max-w-5xl">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--twin-muted-strong)]">
            {t("recruiterSearch.eyebrow")}
          </p>
          <h1 className="twin-section-title mt-2 text-2xl sm:text-3xl">{t("recruiterSearch.title")}</h1>
          <p className="twin-muted mt-3 max-w-3xl text-sm leading-relaxed">{t("recruiterSearch.lead")}</p>

          <Card
            variant="soft"
            className="mt-6 border-[var(--twin-accent)]/20 p-4 sm:p-5"
            data-testid={RECRUITER_SEARCH_MARKERS.scopeBanner}
          >
            <p className="text-sm font-semibold text-[var(--foreground)]">{t("recruiterSearch.scopeTitle")}</p>
            <p className="twin-muted mt-1 text-sm leading-relaxed">{t("recruiterSearch.scopeBody")}</p>
            {isDemo ? (
              <p className="mt-2 text-xs font-medium text-[var(--twin-accent)]">{t("recruiterSearch.demoPoolLabel")}</p>
            ) : null}
            <p className="mt-3 text-sm">
              <Link href="/recruiter/talent-radar" className="font-medium text-[var(--twin-accent)] underline">
                {t("recruiterTalentRadar.navLink")}
              </Link>
            </p>
          </Card>

          <div className="mt-6">
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
              idPrefix="recruiter-search"
            />
            {authError ? <p className="mt-2 text-sm text-rose-400">{authError}</p> : null}
          </div>

          <div
            className="mt-6 rounded-2xl border border-[var(--twin-border)]/80 bg-[var(--twin-surface)]/60 p-4 sm:p-5"
            data-testid={RECRUITER_SEARCH_MARKERS.filtersPanel}
          >
            <p className="text-sm font-semibold text-[var(--foreground)]">{t("recruiterSearch.filtersTitle")}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="flex flex-col gap-1 text-xs sm:col-span-2 lg:col-span-3">
                <span className="font-medium text-[var(--twin-muted-strong)]">{t("recruiterSearch.filterQuery")}</span>
                <input
                  type="search"
                  className="twin-input text-sm"
                  data-testid={RECRUITER_SEARCH_MARKERS.searchInput}
                  value={filters.q}
                  onChange={(e) => updateFilter("q", e.target.value)}
                  placeholder={t("recruiterSearch.filterQueryPlaceholder")}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-medium text-[var(--twin-muted-strong)]">{t("recruiterSearch.filterName")}</span>
                <input className="twin-input text-sm" value={filters.name} onChange={(e) => updateFilter("name", e.target.value)} />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-medium text-[var(--twin-muted-strong)]">{t("recruiterSearch.filterRole")}</span>
                <input className="twin-input text-sm" value={filters.roleTitle} onChange={(e) => updateFilter("roleTitle", e.target.value)} />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-medium text-[var(--twin-muted-strong)]">{t("recruiterSearch.filterSkills")}</span>
                <input className="twin-input text-sm" value={filters.skills} onChange={(e) => updateFilter("skills", e.target.value)} placeholder={t("recruiterSearch.filterSkillsPlaceholder")} />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-medium text-[var(--twin-muted-strong)]">{t("recruiterSearch.filterLocation")}</span>
                <input className="twin-input text-sm" value={filters.location} onChange={(e) => updateFilter("location", e.target.value)} />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-medium text-[var(--twin-muted-strong)]">{t("recruiterSearch.filterMinScore")}</span>
                <input type="number" min={0} max={100} className="twin-input text-sm" value={filters.minScore} onChange={(e) => updateFilter("minScore", e.target.value)} />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-medium text-[var(--twin-muted-strong)]">{t("recruiterSearch.filterMaxScore")}</span>
                <input type="number" min={0} max={100} className="twin-input text-sm" value={filters.maxScore} onChange={(e) => updateFilter("maxScore", e.target.value)} />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-medium text-[var(--twin-muted-strong)]">{t("recruiterSearch.filterStatus")}</span>
                <select className="twin-input text-sm" value={filters.status} onChange={(e) => updateFilter("status", e.target.value)}>
                  <option value="all">{t("recruiterSearch.filterAll")}</option>
                  <option value="applied">{t("recruiterSearch.statusApplied")}</option>
                  <option value="pending">{t("recruiterSearch.statusPending")}</option>
                  <option value="interview">{t("recruiterSearch.statusInterview")}</option>
                  <option value="rejected">{t("recruiterSearch.statusRejected")}</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-medium text-[var(--twin-muted-strong)]">{t("recruiterSearch.filterPipeline")}</span>
                <select className="twin-input text-sm" value={filters.pipelineStatus} onChange={(e) => updateFilter("pipelineStatus", e.target.value)}>
                  <option value="all">{t("recruiterSearch.filterAll")}</option>
                  <option value="new">{t("recruiterSearch.pipelineNew")}</option>
                  <option value="review">{t("recruiterSearch.pipelineReview")}</option>
                  <option value="accepted">{t("recruiterSearch.pipelineAccepted")}</option>
                  <option value="to_contact">{t("recruiterSearch.pipelineToContact")}</option>
                  <option value="invited">{t("recruiterSearch.pipelineInvited")}</option>
                  <option value="on_hold">{t("recruiterSearch.pipelineOnHold")}</option>
                  <option value="rejected">{t("recruiterSearch.pipelineRejected")}</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-medium text-[var(--twin-muted-strong)]">{t("recruiterSearch.filterConfidence")}</span>
                <select className="twin-input text-sm" value={filters.dataConfidence} onChange={(e) => updateFilter("dataConfidence", e.target.value)}>
                  <option value="all">{t("recruiterSearch.filterAll")}</option>
                  <option value="high">{t("recruiterInbox.reviewDataConfidenceHigh")}</option>
                  <option value="medium">{t("recruiterInbox.reviewDataConfidenceMedium")}</option>
                  <option value="low">{t("recruiterInbox.reviewDataConfidenceLow")}</option>
                  <option value="unknown">{t("recruiterInbox.reviewDataConfidenceUnknown")}</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-medium text-[var(--twin-muted-strong)]">{t("recruiterSearch.filterMissingData")}</span>
                <select className="twin-input text-sm" value={filters.missingData} onChange={(e) => updateFilter("missingData", e.target.value)}>
                  <option value="all">{t("recruiterSearch.filterAll")}</option>
                  <option value="yes">{t("recruiterSearch.missingDataYes")}</option>
                  <option value="no">{t("recruiterSearch.missingDataNo")}</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-medium text-[var(--twin-muted-strong)]">{t("recruiterSearch.filterAvailability")}</span>
                <select className="twin-input text-sm" value={filters.availability} onChange={(e) => updateFilter("availability", e.target.value)}>
                  <option value="all">{t("recruiterSearch.filterAll")}</option>
                  <option value="pool_opt_in">{t("recruiterSearch.availabilityPool")}</option>
                  <option value="not_pool">{t("recruiterSearch.availabilityNotPool")}</option>
                </select>
              </label>
            </div>
            <button type="button" className="twin-btn-solid mt-4 text-sm" disabled={loading} onClick={() => void runSearch()}>
              {loading ? t("common.loadingEllipsis") : t("recruiterSearch.searchCta")}
            </button>
          </div>

          {loadError ? <p className="mt-4 text-sm text-rose-400">{loadError}</p> : null}

          {searched && !loading && rows.length === 0 ? (
            <div className="mt-6" data-testid={RECRUITER_SEARCH_MARKERS.emptyState}>
              <GuidedEmptyState
                title={t("recruiterSearch.emptyTitle")}
                message={t("recruiterSearch.emptyBody")}
                steps={[t("recruiterSearch.emptyStep1"), t("recruiterSearch.emptyStep2")]}
                actionLabel={t("recruiterSearch.emptyCta")}
                onAction={() => void runSearch()}
              />
            </div>
          ) : null}

          {searched && rows.length > 0 ? (
            <div className="mt-6">
              <p className="text-sm text-[var(--twin-muted-strong)]">
                {t("recruiterSearch.resultsCount").replace("{count}", String(rows.length))}
                {scopeLabel ? ` · ${scopeLabel}` : ""}
              </p>
              <ul className="mt-4 space-y-4">
                {rows.map((r) => {
                  const visibility = recruiterDataVisibilitySummary(r);
                  const canReviewInInbox = r.status === "applied" || r.status === "pending";
                  const statusKey = recruiterInboxStatusLabelKey(r.status);
                  return (
                    <li
                      key={r.application_id}
                      className={recruiterInboxCandidateCardClass()}
                      data-testid={RECRUITER_SEARCH_MARKERS.resultCard}
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-xl font-bold tracking-tight text-[var(--foreground)]">{r.candidate_name}</p>
                          <p className="twin-muted mt-1 text-sm">
                            {t("recruiterInbox.cardMetaLine")
                              .replace("{job}", r.job_title)
                              .replace("{company}", r.company)
                              .replace("{id}", String(r.application_id))}
                          </p>
                          {r.candidate_location ? (
                            <p className="twin-muted mt-1 text-xs">{r.candidate_location}</p>
                          ) : null}
                          {statusKey ? (
                            <p className="mt-2 text-xs text-[var(--twin-muted-strong)]">
                              {t(`recruiterInbox.${statusKey}` as TranslationKey)}
                              {r.pipeline_status ? ` · ${r.pipeline_status}` : ""}
                            </p>
                          ) : null}
                          {visibility ? (
                            <p className="twin-muted mt-2 text-xs leading-relaxed">{visibility}</p>
                          ) : null}
                          {r.match_reasons?.length ? (
                            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[var(--twin-muted-strong)]">
                              {r.match_reasons.slice(0, 3).map((reason) => (
                                <li key={reason}>{reason}</li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                        {typeof r.match_score === "number" ? (
                          <div className="shrink-0 text-right">
                            <p className={recruiterInboxMatchScoreValueClass()}>{Math.round(r.match_score)}</p>
                            <p className="text-xs text-[var(--twin-muted)]">{t("recruiterInbox.matchScoreCardLabel")}</p>
                          </div>
                        ) : null}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link
                          href={recruiterInboxHighlightHref(r.application_id)}
                          className="twin-btn-ghost text-xs"
                          data-testid={RECRUITER_SEARCH_MARKERS.reviewCardLink}
                        >
                          {t("recruiterSearch.reviewCardLink")}
                        </Link>
                        {canReviewInInbox ? (
                          <Link href={recruiterInboxHighlightHref(r.application_id)} className="twin-btn-solid text-xs">
                            {t("recruiterSearch.addToReview")}
                          </Link>
                        ) : (
                          <Link href="/recruiter/inbox" className="twin-btn-ghost text-xs">
                            {t("recruiterSearch.viewInbox")}
                          </Link>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-4 text-sm">
            <Link href="/recruiter/inbox" className="twin-link">
              {t("recruiterInbox.title")}
            </Link>
            <Link href="/recruiter/jobs" className="twin-link">
              {t("recruiterJobs.title")}
            </Link>
            <Link href="/recruiter/talent-pool" className="twin-link">
              {t("recruiterTalentPool.title")}
            </Link>
            <Link href="/workspace/recruiter" className="twin-link">
              {t("workspace.recruiterHomeTitle")}
            </Link>
          </div>
        </div>
      </div>
    </Shell>
  );
}
