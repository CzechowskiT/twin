"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { RecruiterAccessFields } from "@/components/recruiter/recruiter-access-fields";
import { RecruiterDecisionRail } from "@/components/recruiter/recruiter-decision-rail";
import {
  RecruiterSignalList,
  type RecruiterSignalItem,
} from "@/components/recruiter/recruiter-signal-list";
import { useTranslation } from "@/components/language-provider";
import type { TranslationKey } from "@/lib/i18n";
import { Card, Shell } from "@/components/ui";
import { GuidedEmptyState } from "@/components/ux/guided-empty-state";
import { apiFetch } from "@/lib/api";
import { isLikelyBrowserNetworkFailureMessage } from "@/lib/api";
import { getClientApiLocale } from "@/lib/api-locale";
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
import {
  isRecruiterInboxActionable,
  recruiterInboxDecisionBadge,
} from "@/lib/recruiter-inbox-decision";
import {
  RECRUITER_INBOX_SEGMENTS,
  recruiterInboxAwaitingDecisionCount,
  recruiterInboxMatchesSegmentFilter,
  recruiterInboxSegmentCounts,
  recruiterInboxStatusLabelKey,
  type RecruiterInboxSegment,
} from "@/lib/recruiter-inbox-segments";
import {
  parseRecruiterInboxErrorDetail,
  recruiterInboxErrorMessageKey,
  type RecruiterInboxErrorMessageKey,
} from "@/lib/recruiter-inbox-errors";
import {
  REVIEW_CARD_SECTIONS,
  reviewCardDataConfidenceKey,
  reviewCardSectionItems,
  type RecruiterReviewCard,
} from "@/lib/recruiter-review-card";
import {
  recruiterDataVisibilitySummary,
  type RecruiterDataVisibility,
} from "@/lib/recruiter-data-visibility";
import {
  localizeRecruiterInboxChipText,
  shortRecruiterInboxChipText,
} from "@/lib/recruiter-inbox-chip-copy";
import {
  RECRUITER_INBOX_VISUAL_MARKERS,
  recruiterInboxCandidateCardClass,
  recruiterInboxDeclineButtonClass,
  recruiterInboxMatchScoreTone,
  recruiterInboxSegmentTabFocusClass,
} from "@/lib/recruiter-inbox-visual";

type BatchRow = {
  application_id: number;
  job_title: string;
  company: string;
  candidate_name: string;
  status: string;
  applied_at: string | null;
  updated_at: string | null;
  match_score?: number | null;
  match_score_label?: string | null;
  match_reasons?: string[] | null;
  human_decision_required?: boolean;
  pii_context?: string | null;
  data_visibility_context?: string | null;
  data_visibility_summary?: string | null;
  candidate_data_visible?: string[] | null;
  candidate_data_hidden?: string[] | null;
  consent_receipt_available?: boolean;
  review_card?: RecruiterReviewCard | null;
};

type AuthMeBilling = {
  billing_company_name?: string | null;
};

export default function RecruiterInboxClient() {
  const { t, locale } = useTranslation();
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
  const [segmentFilter, setSegmentFilter] = useState<RecruiterInboxSegment>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [declineTargetId, setDeclineTargetId] = useState<number | null>(null);
  const [declineNote, setDeclineNote] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [batchDeclineOpen, setBatchDeclineOpen] = useState(false);
  const [batchDeclineNote, setBatchDeclineNote] = useState("");
  const [expandedReviewCards, setExpandedReviewCards] = useState<Set<number>>(new Set());
  const [accessExpanded, setAccessExpanded] = useState(false);
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

  const inboxErrorText = useCallback(
    (key: RecruiterInboxErrorMessageKey) => t(`recruiterInbox.${key}`),
    [t],
  );

  const formatInboxLoadError = useCallback(
    (body: string, status: number, networkFailure = false) =>
      inboxErrorText(recruiterInboxErrorMessageKey(parseRecruiterInboxErrorDetail(body), status, networkFailure)),
    [inboxErrorText],
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
      const res = await fetch(`/api/recruiter/inbox?${q}`, {
        cache: "no-store",
        headers: { "X-Locale": getClientApiLocale() ?? "en" },
      });
      if (!res.ok) {
        const body = await res.text();
        setLoadError(formatInboxLoadError(body, res.status));
        setRows([]);
        setQueueLoaded(false);
        return;
      }
      const data = (await res.json()) as { items: BatchRow[] };
      setRows(data.items ?? []);
      setSelectedIds(new Set());
      setQueueLoaded(true);
      setAccessExpanded(false);
    } catch (e) {
      const networkFailure =
        e instanceof Error && isLikelyBrowserNetworkFailureMessage(e.message);
      setLoadError(formatInboxLoadError("", 0, networkFailure));
      setRows([]);
      setQueueLoaded(false);
    } finally {
      setLoading(false);
    }
  }, [token, companySlug, t, formatInboxLoadError]);

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
      if (!recruiterInboxMatchesSegmentFilter(r, segmentFilter)) return false;
      if (!q) return true;
      const hay = `${r.candidate_name} ${r.job_title} ${r.company}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rows, segmentFilter, searchQuery]);

  const awaitingDecisionCount = useMemo(() => recruiterInboxAwaitingDecisionCount(rows), [rows]);
  const segmentCounts = useMemo(() => recruiterInboxSegmentCounts(rows), [rows]);

  const actionableVisibleIds = useMemo(
    () =>
      filteredRows
        .filter((r) => isRecruiterInboxActionable(r.status))
        .map((r) => r.application_id),
    [filteredRows],
  );

  const allVisibleSelected =
    actionableVisibleIds.length > 0 && actionableVisibleIds.every((id) => selectedIds.has(id));

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
        for (const id of actionableVisibleIds) next.delete(id);
        return next;
      }
      const next = new Set(prev);
      for (const id of actionableVisibleIds) next.add(id);
      return next;
    });
  }

  function patchRowStatus(applicationId: number, status: string) {
    setRows((prev) =>
      prev.map((row) => (row.application_id === applicationId ? { ...row, status } : row)),
    );
    setSelectedIds((prev) => {
      if (!prev.has(applicationId)) return prev;
      const next = new Set(prev);
      next.delete(applicationId);
      return next;
    });
  }

  function patchRowsFromBatchResults(
    results: Array<{ application_id?: number; status?: string; ok?: boolean }>,
  ) {
    setRows((prev) => {
      const byId = new Map(
        results
          .filter((r) => r.ok && r.application_id != null && r.status)
          .map((r) => [r.application_id as number, r.status as string]),
      );
      if (byId.size === 0) return prev;
      return prev.map((row) => {
        const nextStatus = byId.get(row.application_id);
        return nextStatus ? { ...row, status: nextStatus } : row;
      });
    });
    setSelectedIds(new Set());
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
      if (!res.ok) {
        setLoadError(formatInboxLoadError(await res.text(), res.status));
        return;
      }
      const data = (await res.json()) as {
        results?: Array<{ application_id?: number; status?: string; ok?: boolean }>;
      };
      patchRowsFromBatchResults(data.results ?? []);
      setBatchDeclineOpen(false);
      setBatchDeclineNote("");
      await load();
    } catch (e) {
      const networkFailure =
        e instanceof Error && isLikelyBrowserNetworkFailureMessage(e.message);
      setLoadError(formatInboxLoadError("", 0, networkFailure));
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
      if (!res.ok) {
        setLoadError(formatInboxLoadError(await res.text(), res.status));
        return;
      }
      const data = (await res.json()) as { status?: string };
      if (data.status) patchRowStatus(applicationId, data.status);
      setDeclineTargetId(null);
      setDeclineNote("");
      await load();
    } catch (e) {
      const networkFailure =
        e instanceof Error && isLikelyBrowserNetworkFailureMessage(e.message);
      setLoadError(formatInboxLoadError("", 0, networkFailure));
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
    setAccessExpanded(true);
    autoLoadDone.current = false;
  }

  const showAuthError = submitAttempted && authError;
  const companyLabel = companySlug ? companySlugToLabel(companySlug) : "";

  function decisionBadgeLabel(status: string): string | null {
    const badge = recruiterInboxDecisionBadge(status);
    if (badge === "accepted") return t("recruiterInbox.statusAcceptedInterview");
    if (badge === "declined") return t("recruiterInbox.statusDeclined");
    return null;
  }

  function segmentLabel(segment: RecruiterInboxSegment): string {
    const map = {
      all: "recruiterInbox.segmentAll",
      strong_fit: "recruiterInbox.segmentStrongFit",
      good_fit: "recruiterInbox.segmentGoodFit",
      needs_verification: "recruiterInbox.segmentNeedsVerification",
      decided: "recruiterInbox.segmentDecided",
    } as const;
    return t(map[segment]);
  }

  function decisionConsoleHeader(count: number): string {
    const key = count === 1 ? "recruiterInbox.decisionConsoleHeaderOne" : "recruiterInbox.decisionConsoleHeader";
    return t(key).replace("{count}", String(count));
  }

  function localizeChip(text: string): string {
    return localizeRecruiterInboxChipText(text, locale);
  }

  function shortChip(text: string): string {
    return shortRecruiterInboxChipText(text, locale);
  }

  function chipOverflowLabel(count: number): string {
    return t("recruiterInbox.chipOverflowInReviewCard").replace("{count}", String(count));
  }

  function rowEvidencePreview(row: BatchRow): { visible: RecruiterSignalItem[]; moreCount: number } {
    const merged: string[] = [];
    for (const item of row.match_reasons ?? []) {
      if (!merged.includes(item)) merged.push(item);
    }
    for (const item of row.review_card?.requirements_matched ?? []) {
      if (!merged.includes(item)) merged.push(item);
    }
    const localized = merged.map((chip) => ({ text: shortChip(chip), kind: "positive" as const }));
    return { visible: localized.slice(0, 2), moreCount: Math.max(0, localized.length - 2) };
  }

  function rowVerificationPreview(row: BatchRow): { visible: RecruiterSignalItem[]; moreCount: number } {
    const chips: RecruiterSignalItem[] = (row.review_card?.uncertain_or_missing ?? []).map((item) => ({
      text: shortChip(item),
      kind: "verification" as const,
    }));
    const confidenceKey = rowConfidenceKey(row);
    if (confidenceKey) chips.push({ text: t(confidenceKey), kind: "neutral" });
    return { visible: chips.slice(0, 2), moreCount: Math.max(0, chips.length - 2) };
  }

  function rowConfidenceKey(row: BatchRow): TranslationKey | null {
    const confidence = row.review_card?.data_confidence;
    if (!confidence) return null;
    return `recruiterInbox.${reviewCardDataConfidenceKey(confidence)}`;
  }

  function matchScoreLabelKey(label: string | null | undefined): string {
    const key = (label ?? "").trim().toLowerCase();
    if (key === "excellent") return t("recruiterInbox.matchScoreExcellent");
    if (key === "good") return t("recruiterInbox.matchScoreGood");
    if (key === "possible") return t("recruiterInbox.matchScorePossible");
    if (key === "weak") return t("recruiterInbox.matchScoreWeak");
    return t("recruiterInbox.matchScoreUnknown");
  }

  function reviewCardSectionLabel(section: (typeof REVIEW_CARD_SECTIONS)[number]): string {
    const map = {
      whyThisCandidate: "recruiterInbox.reviewWhyThisCandidate",
      requirementsMatched: "recruiterInbox.reviewRequirementsMatched",
      uncertainOrMissing: "recruiterInbox.reviewUncertainOrMissing",
      whatToVerify: "recruiterInbox.reviewWhatToVerify",
      dataConfidence: "recruiterInbox.reviewDataConfidence",
      redFlags: "recruiterInbox.reviewRedFlags",
      humanDecision: "recruiterInbox.reviewHumanDecision",
      disclaimer: "recruiterInbox.reviewDisclaimer",
    } as const;
    return t(map[section]);
  }

  function toggleReviewCard(applicationId: number) {
    setExpandedReviewCards((prev) => {
      const next = new Set(prev);
      if (next.has(applicationId)) next.delete(applicationId);
      else next.add(applicationId);
      return next;
    });
  }

  return (
    <Shell wide>
      <Card className="w-full max-w-none">
        {!queueLoaded ? (
          <>
            <h1 className="mb-2 text-2xl font-semibold">{t("recruiterInbox.title")}</h1>
            <p className="twin-muted mb-2 text-sm leading-relaxed">{t("recruiterInbox.lead")}</p>
            <p className="mb-6 text-sm leading-relaxed text-[var(--foreground)]">{t("recruiterInbox.helperInvite")}</p>
            <div className="mb-6">
              <GuidedEmptyState
                title={t("recruiterInbox.emptyStateTitle")}
                message={t("recruiterInbox.emptyStateBody")}
                steps={[
                  t("ux.guidedEmptyInboxStep1"),
                  t("ux.guidedEmptyInboxStep2"),
                  t("ux.guidedEmptyInboxStep3"),
                ]}
                actionLabel={t("recruiterInbox.load")}
                onAction={() => void load()}
              />
            </div>
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
          </>
        ) : (
          <>
            <div className="mb-4 rounded-lg border border-[var(--twin-border)]/70 bg-[var(--twin-surface-2)]/40 px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--twin-muted-strong)]">
                    {t("recruiterInbox.accessStripTitle")}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-[var(--foreground)]">
                    {companyLabel || companySlug}
                    {token.trim() ? " · · ·" : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="twin-link text-xs font-medium"
                    onClick={() => setAccessExpanded((v) => !v)}
                  >
                    {accessExpanded ? t("recruiterInbox.accessStripCollapse") : t("recruiterInbox.accessStripExpand")}
                  </button>
                  <button type="button" className="twin-link text-xs font-medium" onClick={resetWorkspace}>
                    {t("recruiterInbox.changeWorkspace")}
                  </button>
                  <button
                    type="button"
                    className="twin-btn-ghost text-xs"
                    disabled={loading}
                    onClick={() => void load()}
                  >
                    {loading ? t("common.loadingEllipsis") : t("recruiterInbox.load")}
                  </button>
                </div>
              </div>
              {accessExpanded ? (
                <div className="mt-3 border-t border-[var(--twin-border)]/60 pt-3">
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
                  <button
                    type="button"
                    className="twin-btn-ghost twin-touch-target mt-3 text-sm"
                    onClick={applyDemoCompany}
                  >
                    {t("recruiterInbox.demoCompanyCta")}
                  </button>
                </div>
              ) : null}
            </div>
          </>
        )}

        {billingCompany && !queueLoaded ? (
          <p className="twin-muted mt-3 text-xs leading-relaxed">
            {t("recruiterInbox.signedInCompanyHint").replace("{company}", billingCompany)}
          </p>
        ) : null}

        {showAuthError ? <p className="mt-3 text-sm text-red-600">{authError}</p> : null}
        {loadError ? <p className="mt-3 text-sm text-red-600">{loadError}</p> : null}

        {queueLoaded ? (
          <>
            <div
              className={`${RECRUITER_INBOX_VISUAL_MARKERS.decisionConsoleHeader} rounded-2xl border border-[var(--twin-border)] bg-gradient-to-br from-[var(--twin-surface)] to-[var(--twin-surface-2)]/80 p-5 shadow-sm sm:p-6`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--twin-muted-strong)]">
                {t("recruiterInbox.decisionConsoleTitle")}
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">
                {decisionConsoleHeader(awaitingDecisionCount)}
              </h2>
              <p className="mt-2 text-sm font-medium text-[var(--twin-accent)]">
                {t("recruiterInbox.decisionConsoleTrustLine")}
              </p>
              <p className="twin-muted mt-2 max-w-3xl text-sm leading-relaxed">
                {t("recruiterInbox.decisionConsoleSubcopy")}
              </p>
              <p className="twin-muted mt-2 text-xs">
                {t("recruiterInbox.queueTitle").replace("{company}", companyLabel || companySlug)}
              </p>
              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                {(
                  [
                    ["strong_fit", "statStrongFit", segmentCounts.strong_fit],
                    ["good_fit", "statGoodFit", segmentCounts.good_fit],
                    ["needs_verification", "statNeedsVerification", segmentCounts.needs_verification],
                    ["decided", "statDecided", segmentCounts.decided],
                  ] as const
                ).map(([segment, labelKey, count]) => (
                  <button
                    key={segment}
                    type="button"
                    className="rounded-xl border border-[var(--twin-border)]/80 bg-[var(--twin-surface)]/90 px-3 py-2.5 text-left transition-colors hover:border-[var(--twin-accent)]/40"
                    onClick={() => setSegmentFilter(segment)}
                  >
                    <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--twin-muted-strong)]">
                      {t(`recruiterInbox.${labelKey}` as TranslationKey)}
                    </p>
                    <p className="mt-0.5 text-xl font-bold tabular-nums text-[var(--foreground)]">{count}</p>
                  </button>
                ))}
              </div>
            </div>
            <p className="mt-4 rounded-lg border border-[var(--twin-border)]/60 bg-[var(--twin-surface-2)]/40 px-3 py-2 text-xs leading-relaxed text-[var(--twin-muted-strong)]">
              {filteredRows[0]
                ? recruiterDataVisibilitySummary(filteredRows[0] as RecruiterDataVisibility) ??
                  t("recruiterInbox.dataVisibilityNote")
                : t("recruiterInbox.dataVisibilityNote")}
            </p>
            <div
              className="mt-5 flex flex-wrap gap-2"
              role="tablist"
              aria-label={t("recruiterInbox.filterStatusLabel")}
            >
              {(["all", ...RECRUITER_INBOX_SEGMENTS] as RecruiterInboxSegment[]).map((segment) => {
                const count = segment === "all" ? rows.length : segmentCounts[segment];
                const active = segmentFilter === segment;
                return (
                  <button
                    key={segment}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    className={`${RECRUITER_INBOX_VISUAL_MARKERS.segmentTab} ${recruiterInboxSegmentTabFocusClass()} rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
                      active
                        ? "border-[var(--twin-accent)] bg-[var(--twin-accent)]/15 text-[var(--foreground)] shadow-sm"
                        : "border-[var(--twin-border)] bg-[var(--twin-surface)] text-[var(--twin-muted)] hover:border-[var(--twin-accent)]/30 hover:text-[var(--foreground)]"
                    }`}
                    onClick={() => setSegmentFilter(segment)}
                  >
                    {segmentLabel(segment)}
                    <span className="ml-2 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-[var(--twin-surface-2)] px-1.5 py-0.5 text-xs font-bold tabular-nums">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
            <label className="mt-4 flex min-w-[12rem] flex-col gap-1 text-xs">
              <span className="sr-only">{t("recruiterInbox.filterSearchPlaceholder")}</span>
              <input
                type="search"
                className="twin-input text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("recruiterInbox.filterSearchPlaceholder")}
              />
            </label>
            {actionableVisibleIds.length > 0 ? (
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
              <GuidedEmptyState
                className="mt-4"
                title={t("ux.guidedEmptyInboxFilterTitle")}
                message={t("ux.guidedEmptyInboxFilterMessage")}
                steps={[]}
                actionLabel={t("ux.guidedEmptyInboxFilterCta")}
                onAction={() => {
                  setSegmentFilter("all");
                  setSearchQuery("");
                }}
              />
            ) : (
              <ul className="mt-5 space-y-4">
                {filteredRows.map((r) => {
                  const actionable = isRecruiterInboxActionable(r.status);
                  const badgeLabel = decisionBadgeLabel(r.status);
                  const statusKey = recruiterInboxStatusLabelKey(r.status);
                  const evidencePreview = rowEvidencePreview(r);
                  const verificationPreview = rowVerificationPreview(r);
                  const confidenceKey = rowConfidenceKey(r);
                  const scoreTone = recruiterInboxMatchScoreTone(r.match_score, r.match_score_label);
                  const reviewExpanded = expandedReviewCards.has(r.application_id);
                  return (
                  <li key={r.application_id} className={recruiterInboxCandidateCardClass()}>
                    <div className="flex items-start gap-3 sm:gap-4">
                      {actionable ? (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(r.application_id)}
                          onChange={() => toggleSelected(r.application_id)}
                          className="mt-2.5 h-4 w-4 shrink-0 rounded border-[var(--twin-border)]"
                          aria-label={t("recruiterInbox.selectRow").replace("{name}", r.candidate_name)}
                        />
                      ) : (
                        <span className="mt-2.5 w-4 shrink-0" aria-hidden />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-6">
                          <div
                            className={`${RECRUITER_INBOX_VISUAL_MARKERS.contentZone} min-w-0 flex-1 space-y-4`}
                          >
                            <div>
                              <p className="text-xl font-bold tracking-tight text-[var(--foreground)] sm:text-2xl">
                                {r.candidate_name}
                              </p>
                              <p className="twin-muted mt-1 text-sm leading-relaxed sm:text-base">
                                {t("recruiterInbox.cardMetaLine")
                                  .replace("{job}", r.job_title)
                                  .replace("{company}", r.company)
                                  .replace("{id}", String(r.application_id))}
                              </p>
                              {r.match_score_label || typeof r.match_score === "number" ? (
                                <p className="mt-2 text-sm font-medium text-[var(--twin-muted-strong)]">
                                  {matchScoreLabelKey(r.match_score_label)}
                                </p>
                              ) : null}
                            </div>
                            <RecruiterSignalList
                              items={evidencePreview.visible}
                              overflowCount={evidencePreview.moreCount}
                              overflowLabel={chipOverflowLabel(evidencePreview.moreCount)}
                              sectionLabel={t("recruiterInbox.cardWhyReview")}
                            />
                            <RecruiterSignalList
                              items={verificationPreview.visible}
                              overflowCount={verificationPreview.moreCount}
                              overflowLabel={chipOverflowLabel(verificationPreview.moreCount)}
                              sectionLabel={t("recruiterInbox.cardNeedsVerification")}
                            />
                            {badgeLabel ? (
                              <p className="twin-muted text-sm">{t("recruiterInbox.decisionSaved")}</p>
                            ) : null}
                            {reviewExpanded && r.review_card ? (
                          <div className="rounded-xl border border-[var(--twin-border)] bg-[var(--twin-surface-2)]/60 p-4 sm:p-5">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--twin-border)]/60 pb-2">
                              <p className="text-xs font-semibold text-[var(--foreground)]">
                                {t("recruiterInbox.reviewCardDueDiligence")}
                              </p>
                              {confidenceKey ? (
                                <span className="rounded-full bg-[var(--twin-surface)] px-2 py-0.5 text-[0.6875rem] font-medium text-[var(--foreground)]">
                                  {t(confidenceKey)}
                                </span>
                              ) : null}
                            </div>
                            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                              {REVIEW_CARD_SECTIONS.map((section) => {
                                const items = reviewCardSectionItems(r.review_card as RecruiterReviewCard, section);
                                if (section === "humanDecision") {
                                  return (
                                    <div key={section} className="sm:col-span-2 rounded-md border border-[var(--twin-border)]/50 bg-[var(--twin-surface)]/80 p-2.5">
                                      <dt className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--twin-muted-strong)]">
                                        {reviewCardSectionLabel(section)}
                                      </dt>
                                      <dd className="mt-1 text-xs text-[var(--foreground)]">
                                        {t("recruiterInbox.humanDecisionNote")}
                                      </dd>
                                    </div>
                                  );
                                }
                                if (section === "dataConfidence") return null;
                                if (section === "whyThisCandidate" || section === "disclaimer") {
                                  return (
                                    <div key={section} className="sm:col-span-2 rounded-md border border-[var(--twin-border)]/50 bg-[var(--twin-surface)]/80 p-2.5">
                                      <dt className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--twin-muted-strong)]">
                                        {reviewCardSectionLabel(section)}
                                      </dt>
                                      <dd className="mt-1 text-xs leading-relaxed text-[var(--foreground)]">
                                        {items[0] ? localizeChip(items[0]) : t("recruiterInbox.reviewNoneListed")}
                                      </dd>
                                    </div>
                                  );
                                }
                                return (
                                  <div key={section} className="rounded-md border border-[var(--twin-border)]/50 bg-[var(--twin-surface)]/80 p-2.5">
                                    <dt className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--twin-muted-strong)]">
                                      {reviewCardSectionLabel(section)}
                                    </dt>
                                    <dd className="mt-1">
                                      {items.length > 0 ? (
                                        <ul className="space-y-0.5 text-xs text-[var(--foreground)]">
                                          {items.map((item) => (
                                            <li key={`${section}-${item}`} className="leading-snug">
                                              {localizeChip(item)}
                                            </li>
                                          ))}
                                        </ul>
                                      ) : (
                                        <p className="text-xs text-[var(--twin-muted)]">
                                          {t("recruiterInbox.reviewNoneListed")}
                                        </p>
                                      )}
                                    </dd>
                                  </div>
                                );
                              })}
                            </dl>
                          </div>
                            ) : null}
                          </div>
                          <RecruiterDecisionRail
                            matchScore={
                              typeof r.match_score === "number"
                                ? {
                                    label: t("recruiterInbox.matchScoreCardLabel"),
                                    score: r.match_score,
                                    toneLabel: matchScoreLabelKey(r.match_score_label),
                                    tone: scoreTone,
                                  }
                                : undefined
                            }
                            statusBadge={
                              badgeLabel
                                ? {
                                    label: badgeLabel,
                                    variant:
                                      recruiterInboxDecisionBadge(r.status) === "accepted"
                                        ? "accepted"
                                        : "declined",
                                  }
                                : statusKey
                                  ? {
                                      label: t(`recruiterInbox.${statusKey}` as TranslationKey),
                                      variant: "awaiting",
                                    }
                                  : undefined
                            }
                            reviewCard={
                              r.review_card
                                ? {
                                    expanded: reviewExpanded,
                                    openLabel: t("recruiterInbox.reviewCardCtaShort"),
                                    closeLabel: t("recruiterInbox.hideReviewCardExpanded"),
                                    onToggle: () => toggleReviewCard(r.application_id),
                                  }
                                : undefined
                            }
                            actions={
                              <>
                                {actionable ? (
                                  <div className="flex flex-col gap-2">
                                    <button
                                      type="button"
                                      className={`${RECRUITER_INBOX_VISUAL_MARKERS.acceptButton} twin-btn-solid w-full text-sm`}
                                      disabled={busyId !== null}
                                      onClick={() => void respond(r.application_id, "accept")}
                                    >
                                      {busyId === `${r.application_id}-accept`
                                        ? t("common.loadingEllipsis")
                                        : t("recruiterInbox.accept")}
                                    </button>
                                    <button
                                      type="button"
                                      className={`${recruiterInboxDeclineButtonClass()} w-full`}
                                      disabled={busyId !== null}
                                      onClick={() => {
                                        setDeclineTargetId(r.application_id);
                                        setDeclineNote("");
                                      }}
                                    >
                                      {t("recruiterInbox.decline")}
                                    </button>
                                  </div>
                                ) : null}
                                {actionable && declineTargetId === r.application_id ? (
                                  <div className="rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface-2)]/80 p-3">
                                    <label className="block text-sm font-medium text-[var(--foreground)]">
                                      {t("recruiterInbox.declineNoteLabel")}
                                      <textarea
                                        className="twin-input mt-1 min-h-[4rem] w-full text-sm"
                                        value={declineNote}
                                        onChange={(e) => setDeclineNote(e.target.value)}
                                        placeholder={t("recruiterInbox.declineNotePlaceholder")}
                                      />
                                    </label>
                                    <div className="mt-2 flex flex-col gap-2">
                                      <button
                                        type="button"
                                        className="twin-btn-solid w-full text-sm"
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
                                        className="twin-btn-ghost w-full text-sm"
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
                              </>
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </li>
                  );
                })}
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
