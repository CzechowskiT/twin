"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { useAbortableFetch } from "@/hooks/use-abortable-fetch";
import { useLoadWhenVisible } from "@/hooks/use-load-when-visible";
import { RecruiterAccessFields } from "@/components/recruiter/recruiter-access-fields";
import { RecruiterWorkspaceNav } from "@/components/recruiter/recruiter-workspace-nav";
import { WorkspacePilotPageHeader } from "@/components/workspace/workspace-pilot-page-header";
import { TalentRadarDecisionFilterBar } from "@/components/recruiter/talent-radar/talent-radar-decision-filter-bar";
import { TalentRadarFilterToolbar } from "@/components/recruiter/talent-radar/talent-radar-filter-toolbar";
import { TalentRadarSummaryPanel } from "@/components/recruiter/talent-radar/talent-radar-summary-panel";
import { Card, Shell } from "@/components/ui";
import { GuidedEmptyState } from "@/components/ux/guided-empty-state";
import type { TranslationKey } from "@/lib/i18n";
import {
  parseRecruiterInboxErrorDetail,
  recruiterInboxErrorMessageKey,
} from "@/lib/recruiter-inbox-errors";
import {
  mergeCompanyOptions,
  parseRecruiterInviteSearchParams,
  readRecruiterInboxDemoEnv,
  readRecruiterInboxSession,
  resolveCompanySlugFromRaw,
  writeRecruiterInboxSession,
} from "@/lib/recruiter-inbox";
import {
  TALENT_RADAR_LIMITED_PILOT,
} from "@/lib/seven-day-d3-recruiter";
import {
  buildOutreachDraftText,
  DEFAULT_TALENT_RADAR_FILTERS,
  RECRUITER_TALENT_RADAR_MARKERS,
  talentRadarQueryParams,
  type TalentRadarCandidate,
  type TalentRadarFilters,
  type TalentRadarPayload,
} from "@/lib/recruiter-talent-radar";
import { RECRUITER_TALENT_RADAR_DIGEST_ROUTE } from "@/lib/recruiter-talent-radar-digest";
import {
  matchesDecisionFilter,
  TALENT_RADAR_DECISION_MARKERS,
  buildDraftPreparedDecisionBody,
  type PostTalentRadarDecisionBody,
  type TalentRadarDecisionFilter,
  type TalentRadarDismissReasonCode,
  type TalentRadarLatestDecision,
  type TalentRadarSnoozeDays,
} from "@/lib/recruiter-talent-radar-decisions";
import { computeTalentRadarSummaryStats, TALENT_RADAR_VISUAL_MARKERS } from "@/lib/recruiter-talent-radar-visual";
import { getClientApiLocale } from "@/lib/api-locale";

const TalentRadarCandidateGroups = dynamic(
  () =>
    import("@/components/recruiter/talent-radar/talent-radar-candidate-groups").then(
      (m) => m.TalentRadarCandidateGroups,
    ),
  { ssr: false },
);

const TalentRadarDismissModal = dynamic(
  () =>
    import("@/components/recruiter/talent-radar/talent-radar-decision-modals").then(
      (m) => m.TalentRadarDismissModal,
    ),
  { ssr: false },
);
const TalentRadarDraftModal = dynamic(
  () =>
    import("@/components/recruiter/talent-radar/talent-radar-decision-modals").then(
      (m) => m.TalentRadarDraftModal,
    ),
  { ssr: false },
);
const TalentRadarSnoozeModal = dynamic(
  () =>
    import("@/components/recruiter/talent-radar/talent-radar-decision-modals").then(
      (m) => m.TalentRadarSnoozeModal,
    ),
  { ssr: false },
);

type RoleOption = { id: number; title: string };

type PendingModal =
  | { kind: "snooze"; row: TalentRadarCandidate }
  | { kind: "dismiss"; row: TalentRadarCandidate }
  | null;

type DraftModalState = {
  row: TalentRadarCandidate;
  text: string;
  auditWarning: boolean;
} | null;

export default function RecruiterTalentRadarClient() {
  const { t, locale } = useTranslation();
  const { fetch: fetchAbortable } = useAbortableFetch();
  const searchParams = useSearchParams();
  const [token, setToken] = useState("");
  const [companyRaw, setCompanyRaw] = useState("");
  const [filters, setFilters] = useState<TalentRadarFilters>(DEFAULT_TALENT_RADAR_FILTERS);
  const [decisionFilter, setDecisionFilter] = useState<TalentRadarDecisionFilter>("active");
  const [rows, setRows] = useState<TalentRadarCandidate[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [disclaimer, setDisclaimer] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [draftModal, setDraftModal] = useState<DraftModalState>(null);
  const [preparingDraftAppId, setPreparingDraftAppId] = useState<number | null>(null);
  const [decisionToast, setDecisionToast] = useState<string | null>(null);
  const [pendingModal, setPendingModal] = useState<PendingModal>(null);
  const [savingDecision, setSavingDecision] = useState(false);
  const autoLoadDone = useRef(false);

  const detailsDeferred = useLoadWhenVisible({ rootMargin: "140px 0px" });
  const summaryDeferred = useLoadWhenVisible({ rootMargin: "80px 0px" });

  const companyOptions = useMemo(
    () =>
      mergeCompanyOptions(
        companyRaw,
        readRecruiterInboxSession().companySlug,
        parseRecruiterInviteSearchParams(searchParams).companySlug,
        readRecruiterInboxDemoEnv().companySlug,
      ),
    [companyRaw, searchParams],
  );
  const knownSlugs = useMemo(() => new Set(companyOptions.map((o) => o.slug)), [companyOptions]);
  const companySlug = useMemo(
    () => resolveCompanySlugFromRaw(companyRaw, knownSlugs),
    [companyRaw, knownSlugs],
  );
  const isDemo = companySlug === "nova-hiring-pl";
  const roleTitle = roles.find((r) => String(r.id) === filters.roleId)?.title ?? "";

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

  const postDecision = useCallback(
    async (body: PostTalentRadarDecisionBody): Promise<TalentRadarLatestDecision | null> => {
      const tkn = token.trim();
      const slug = companySlug;
      if (!tkn || !slug) return null;
      const q = new URLSearchParams({ company_slug: slug, token: tkn });
      const res = await fetch(`/api/recruiter/talent-radar/decisions?${q}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Locale": getClientApiLocale() ?? "en" },
        body: JSON.stringify(body),
      });
      if (!res.ok) return null;
      return (await res.json()) as TalentRadarLatestDecision;
    },
    [token, companySlug],
  );

  const applyOptimisticDecision = useCallback(
    (applicationId: number, decision: TalentRadarLatestDecision) => {
      setRows((prev) =>
        prev.map((row) =>
          Number(row.application_id ?? row.id) === applicationId
            ? { ...row, latest_decision: decision }
            : row,
        ),
      );
    },
    [],
  );

  const runDecisionAction = useCallback(
    async (body: PostTalentRadarDecisionBody, toastKey: TranslationKey) => {
      setSavingDecision(true);
      try {
        const saved = await postDecision(body);
        if (!saved) {
          setLoadError(t("recruiterTalentRadar.decisionError"));
          return;
        }
        const enriched: TalentRadarLatestDecision = {
          ...saved,
          decision_state: saved.decision_state ?? (
            body.action_type === "shortlisted"
              ? "shortlisted"
              : body.action_type === "dismissed"
                ? "dismissed"
                : body.action_type === "snoozed"
                  ? "snoozed"
                  : "active"
          ),
        };
        applyOptimisticDecision(body.application_id, enriched);
        setDecisionToast(t(toastKey));
        window.setTimeout(() => setDecisionToast(null), 4000);
      } finally {
        setSavingDecision(false);
        setPendingModal(null);
      }
    },
    [applyOptimisticDecision, postDecision, t],
  );

  const runRadar = useCallback(async () => {
    const tkn = token.trim();
    const slug = companySlug;
    if (!tkn || !slug) {
      setAuthError(t("recruiterTalentRadar.missingAuth"));
      return;
    }
    setAuthError(null);
    setLoadError(null);
    setLoading(true);
    writeRecruiterInboxSession(tkn, slug);
    setCompanyRaw(slug);
    try {
      const q = talentRadarQueryParams(tkn, slug, filters);
      const res = await fetchAbortable(`/api/recruiter/talent-radar?${q}`, {
        cache: "no-store",
        headers: { "X-Locale": getClientApiLocale() ?? "en" },
      });
      if (!res.ok) {
        const body = await res.text();
        const key = recruiterInboxErrorMessageKey(parseRecruiterInboxErrorDetail(body), res.status);
        setLoadError(t(`recruiterInbox.${key}`));
        setRows([]);
        setLoaded(false);
        return;
      }
      const data = (await res.json()) as TalentRadarPayload;
      setRows(data.suggestions ?? []);
      setRoles((data.filters?.roles ?? []).map((r) => ({ id: r.id, title: r.title })));
      setDisclaimer(data.disclaimer ?? t("recruiterTalentRadar.disclaimer"));
      setWarnings(data.data_quality_warnings ?? []);
      setLoaded(true);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setLoadError(t("recruiterInbox.errorNetwork"));
      setRows([]);
      setLoaded(false);
    } finally {
      setLoading(false);
    }
  }, [token, companySlug, filters, t, fetchAbortable]);

  useEffect(() => {
    if (!hydrated || autoLoadDone.current) return;
    const tkn = token.trim();
    const slug = companySlug;
    if (!tkn || !slug) return;
    autoLoadDone.current = true;
    queueMicrotask(() => void runRadar());
  }, [hydrated, token, companySlug, runRadar]);

  const visibleRows = useMemo(
    () => rows.filter((r) => matchesDecisionFilter(r.latest_decision, decisionFilter)),
    [rows, decisionFilter],
  );
  const summaryStats = useMemo(() => computeTalentRadarSummaryStats(visibleRows), [visibleRows]);

  function updateFilter<K extends keyof TalentRadarFilters>(key: K, value: TalentRadarFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function appId(row: TalentRadarCandidate): number {
    return Number(row.application_id ?? row.id);
  }

  const handleDraft = useCallback(
    async (row: TalentRadarCandidate) => {
      const aid = appId(row);
      setPreparingDraftAppId(aid);
      const text = buildOutreachDraftText(row, roleTitle, locale);
      try {
        const saved = await postDecision(buildDraftPreparedDecisionBody(row, filters.roleId));
        if (saved) {
          const enriched: TalentRadarLatestDecision = {
            ...saved,
            decision_state: saved.decision_state ?? "active",
          };
          applyOptimisticDecision(aid, enriched);
          setDraftModal({ row, text, auditWarning: false });
          setDecisionToast(t("recruiterTalentRadar.decisionDraftSaved"));
          window.setTimeout(() => setDecisionToast(null), 4000);
        } else {
          setDraftModal({ row, text, auditWarning: true });
        }
      } catch {
        setDraftModal({ row, text, auditWarning: true });
      } finally {
        setPreparingDraftAppId(null);
      }
    },
    [applyOptimisticDecision, filters.roleId, locale, postDecision, roleTitle, t],
  );

  return (
    <Shell wide>
      <RecruiterWorkspaceNav />
      <div className={RECRUITER_TALENT_RADAR_MARKERS.page} data-testid={RECRUITER_TALENT_RADAR_MARKERS.page}>
        <div className="mx-auto max-w-5xl px-1 pb-12 pt-2 sm:px-2">
          <WorkspacePilotPageHeader
            eyebrowKey="recruiterTalentRadar.eyebrow"
            titleKey="recruiterTalentRadar.title"
            leadKey="recruiterTalentRadar.lead"
            status="pilot"
            testId={RECRUITER_TALENT_RADAR_MARKERS.hero}
          />
          {TALENT_RADAR_LIMITED_PILOT ? (
            <p
              className="twin-muted mb-4 text-sm leading-relaxed"
              data-seven-day-talent-radar-pilot-boundary
            >
              {t("recruiterTalentRadar.pilotBoundaryBody")}
            </p>
          ) : null}
          <p className="text-xs text-[var(--twin-muted-strong)]">{t("recruiterTalentRadar.subtitleAgent")}</p>

          <Card variant="soft" className="border-[var(--twin-accent)]/20 p-5 sm:p-6">
            <p className="text-sm font-semibold text-[var(--foreground)]">{t("recruiterTalentRadar.scopeTitle")}</p>
            <p className="twin-muted mt-1 text-sm leading-relaxed">{t("recruiterTalentRadar.scopeBody")}</p>
            {isDemo ? (
              <p className="mt-2 text-xs font-medium text-[var(--twin-accent)]">{t("recruiterTalentRadar.demoLabel")}</p>
            ) : null}
          </Card>

          <div className="mt-6">
            <RecruiterAccessFields
              token={token}
              onTokenChange={setToken}
              companySlug={companyRaw}
              onCompanySlugChange={setCompanyRaw}
              companyOptions={companyOptions}
            />
            <button
              type="button"
              className="twin-btn-solid mt-4 text-sm"
              disabled={loading}
              onClick={() => void runRadar()}
            >
              {loading ? t("recruiterTalentRadar.loading") : t("recruiterTalentRadar.loadCta")}
            </button>
            {authError ? <p className="mt-3 text-sm text-red-600">{authError}</p> : null}
            {loadError ? <p className="mt-3 text-sm text-red-600">{loadError}</p> : null}
          </div>

          {loaded ? (
            <div className="mt-10 space-y-8" data-testid={RECRUITER_TALENT_RADAR_MARKERS.filtersPanel}>
              <TalentRadarFilterToolbar filters={filters} roles={roles} onChange={updateFilter} />
              <TalentRadarDecisionFilterBar value={decisionFilter} onChange={setDecisionFilter} />
              {visibleRows.length > 0 ? (
                <div ref={summaryDeferred.ref}>
                  {summaryDeferred.shouldLoad ? (
                    <TalentRadarSummaryPanel stats={summaryStats} />
                  ) : (
                    <div className="h-20 animate-pulse rounded-xl border border-[var(--twin-border)]/60 bg-[var(--twin-surface-soft)]/40" />
                  )}
                </div>
              ) : null}
              <p className="text-sm">
                <Link
                  href={RECRUITER_TALENT_RADAR_DIGEST_ROUTE}
                  className="font-medium text-[var(--twin-accent)] underline"
                  data-testid="recruiter-talent-radar-digest-link"
                >
                  {t("recruiterTalentRadar.digestLink")}
                </Link>
                <span className="twin-muted mx-2">·</span>
                <Link
                  href="/recruiter/talent-pool"
                  className="font-medium text-[var(--twin-accent)] underline"
                  data-testid="recruiter-talent-radar-profile-360-link"
                >
                  {t("candidateProfile360.viewProfile360")}
                </Link>
                <span className="twin-muted mx-2">·</span>
                <Link
                  href="/recruiter/pipeline"
                  className="font-medium text-[var(--twin-accent)] underline"
                  data-testid="recruiter-talent-radar-job-pipeline-link"
                >
                  {t("jobPipeline.openPipeline")}
                </Link>
              </p>
            </div>
          ) : null}

          {decisionToast ? (
            <p
              className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-800 dark:text-emerald-300"
              data-testid={TALENT_RADAR_DECISION_MARKERS.decisionToast}
            >
              {decisionToast}
            </p>
          ) : null}

          {warnings.length > 0 ? (
            <ul className="mt-4 space-y-1 text-xs text-amber-700 dark:text-amber-400">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          ) : null}

          {loaded && visibleRows.length === 0 ? (
            <div className="mt-8" data-testid={RECRUITER_TALENT_RADAR_MARKERS.emptyState}>
              <GuidedEmptyState
                title={t("recruiterTalentRadar.emptyTitle")}
                message={t("recruiterTalentRadar.emptyBody")}
                steps={[
                  t("recruiterTalentRadar.emptyActionJobs"),
                  t("recruiterTalentRadar.emptyActionSearch"),
                  t("recruiterTalentRadar.emptyActionInbox"),
                ]}
                actionLabel={t("recruiterTalentRadar.emptyActionSearch")}
                actionHref="/recruiter/search"
              />
            </div>
          ) : null}

          {visibleRows.length > 0 ? (
            <div className="mt-10" ref={detailsDeferred.ref}>
              {detailsDeferred.shouldLoad ? (
              <TalentRadarCandidateGroups
                rows={visibleRows}
                roleTitle={roleTitle}
                preparingDraftAppId={preparingDraftAppId}
                onDraft={(row) => void handleDraft(row)}
                onShortlist={(row) =>
                  void runDecisionAction(
                    { application_id: appId(row), action_type: "shortlisted", meta: { source: "talent_radar" } },
                    "recruiterTalentRadar.decisionShortlisted",
                  )
                }
                onDismiss={(row) => setPendingModal({ kind: "dismiss", row })}
                onSnooze={(row) => setPendingModal({ kind: "snooze", row })}
                onReviewCardOpen={(row) =>
                  void runDecisionAction(
                    { application_id: appId(row), action_type: "review_card_opened", meta: { source: "talent_radar" } },
                    "recruiterTalentRadar.decisionReviewLogged",
                  )
                }
              />
              ) : (
                <div className="h-40 animate-pulse rounded-xl border border-[var(--twin-border)]/60 bg-[var(--twin-surface-soft)]/40" />
              )}
            </div>
          ) : null}

          <p
            className="mt-10 rounded-xl border border-[var(--twin-border)] bg-[var(--twin-surface-raised)] p-5 text-sm leading-relaxed text-[var(--twin-muted-strong)]"
            data-testid={RECRUITER_TALENT_RADAR_MARKERS.disclaimer}
          >
            {disclaimer || t("recruiterTalentRadar.disclaimer")}
          </p>

          <p
            className="mt-4 rounded-xl border border-[var(--twin-border)]/70 bg-[var(--twin-surface)]/80 p-4 text-xs leading-relaxed text-[var(--twin-muted-strong)]"
            data-testid={TALENT_RADAR_VISUAL_MARKERS.trustFooter}
          >
            {t("recruiterTalentRadar.trustFooter")}
          </p>

          <p className="twin-muted mt-8 text-xs">
            {t("recruiterTalentRadar.contextLinks")}{" "}
            <Link href="/recruiter/search" className="underline">
              {t("recruiterSearch.title")}
            </Link>
            {" · "}
            <Link href="/recruiter/pipeline" className="underline">
              {t("recruiterPipeline.title")}
            </Link>
            {" · "}
            <Link href="/recruiter/inbox" className="underline">
              {t("recruiterInbox.title")}
            </Link>
            {" · "}
            <Link href="/recruiter/talent-pool" className="underline">
              {t("recruiterTalentPool.title")}
            </Link>
          </p>
        </div>
      </div>

      <TalentRadarDraftModal
        open={draftModal != null}
        row={draftModal?.row ?? null}
        roleTitle={roleTitle}
        draftText={draftModal?.text ?? ""}
        auditWarning={draftModal?.auditWarning}
        onClose={() => setDraftModal(null)}
        onReviewCardOpen={
          draftModal
            ? () => {
                void runDecisionAction(
                  {
                    application_id: appId(draftModal.row),
                    action_type: "review_card_opened",
                    meta: { source: "talent_radar" },
                  },
                  "recruiterTalentRadar.decisionReviewLogged",
                );
              }
            : undefined
        }
      />
      <TalentRadarSnoozeModal
        open={pendingModal?.kind === "snooze"}
        onClose={() => setPendingModal(null)}
        saving={savingDecision}
        onConfirm={(days: TalentRadarSnoozeDays) => {
          const row = pendingModal?.kind === "snooze" ? pendingModal.row : null;
          if (!row) return;
          void runDecisionAction(
            {
              application_id: appId(row),
              action_type: "snoozed",
              snooze_days: days,
              meta: { source: "talent_radar" },
            },
            "recruiterTalentRadar.decisionSnoozed",
          );
        }}
      />
      <TalentRadarDismissModal
        open={pendingModal?.kind === "dismiss"}
        onClose={() => setPendingModal(null)}
        saving={savingDecision}
        onConfirm={(reason: TalentRadarDismissReasonCode) => {
          const row = pendingModal?.kind === "dismiss" ? pendingModal.row : null;
          if (!row) return;
          void runDecisionAction(
            {
              application_id: appId(row),
              action_type: "dismissed",
              dismiss_reason_code: reason,
              meta: { source: "talent_radar" },
            },
            "recruiterTalentRadar.decisionDismissed",
          );
        }}
      />
    </Shell>
  );
}
