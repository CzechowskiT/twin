"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { RecruiterAccessFields } from "@/components/recruiter/recruiter-access-fields";
import { RecruiterWorkspaceNav } from "@/components/recruiter/recruiter-workspace-nav";
import { TalentRadarCandidateGroups } from "@/components/recruiter/talent-radar/talent-radar-candidate-groups";
import { TalentRadarDecisionFilterBar } from "@/components/recruiter/talent-radar/talent-radar-decision-filter-bar";
import {
  TalentRadarDismissModal,
  TalentRadarSnoozeModal,
} from "@/components/recruiter/talent-radar/talent-radar-decision-modals";
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
  buildOutreachDraftText,
  DEFAULT_TALENT_RADAR_FILTERS,
  RECRUITER_TALENT_RADAR_MARKERS,
  talentRadarQueryParams,
  type TalentRadarCandidate,
  type TalentRadarFilters,
  type TalentRadarPayload,
} from "@/lib/recruiter-talent-radar";
import {
  matchesDecisionFilter,
  TALENT_RADAR_DECISION_MARKERS,
  type PostTalentRadarDecisionBody,
  type TalentRadarDecisionFilter,
  type TalentRadarDismissReasonCode,
  type TalentRadarLatestDecision,
  type TalentRadarSnoozeDays,
} from "@/lib/recruiter-talent-radar-decisions";
import { computeTalentRadarSummaryStats } from "@/lib/recruiter-talent-radar-visual";
import { getClientApiLocale } from "@/lib/api-locale";

type RoleOption = { id: number; title: string };

const STATUS_CHIP_KEYS = [
  "chipPilot",
  "chipHumanReview",
  "chipNoAutoOutreach",
  "chipInternalData",
] as const;

type PendingModal =
  | { kind: "snooze"; row: TalentRadarCandidate }
  | { kind: "dismiss"; row: TalentRadarCandidate }
  | null;

export default function RecruiterTalentRadarClient() {
  const { t, locale } = useTranslation();
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
  const [draftText, setDraftText] = useState<string | null>(null);
  const [decisionToast, setDecisionToast] = useState<string | null>(null);
  const [pendingModal, setPendingModal] = useState<PendingModal>(null);
  const [savingDecision, setSavingDecision] = useState(false);
  const autoLoadDone = useRef(false);

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
      const res = await fetch(`/api/recruiter/talent-radar?${q}`, {
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
    } catch {
      setLoadError(t("recruiterInbox.errorNetwork"));
      setRows([]);
      setLoaded(false);
    } finally {
      setLoading(false);
    }
  }, [token, companySlug, filters, t]);

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

  return (
    <Shell wide>
      <RecruiterWorkspaceNav />
      <div className={RECRUITER_TALENT_RADAR_MARKERS.page} data-testid={RECRUITER_TALENT_RADAR_MARKERS.page}>
        <div className="mx-auto max-w-5xl">
          <div data-testid={RECRUITER_TALENT_RADAR_MARKERS.hero}>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--twin-muted-strong)]">
              {t("recruiterTalentRadar.eyebrow")}
            </p>
            <h1 className="twin-section-title mt-2 text-2xl sm:text-3xl">{t("recruiterTalentRadar.title")}</h1>
            <p className="twin-muted mt-3 max-w-3xl text-sm leading-relaxed">{t("recruiterTalentRadar.lead")}</p>
            <p className="mt-2 text-xs text-[var(--twin-muted-strong)]">{t("recruiterTalentRadar.subtitleAgent")}</p>
          </div>

          <div
            className="mt-4 flex flex-wrap gap-2"
            data-testid={RECRUITER_TALENT_RADAR_MARKERS.statusChips}
          >
            {STATUS_CHIP_KEYS.map((key) => (
              <span
                key={key}
                className="rounded-full border border-[var(--twin-border)] bg-[var(--twin-surface-raised)] px-3 py-1 text-xs font-medium text-[var(--twin-muted-strong)]"
              >
                {t(`recruiterTalentRadar.${key}` as TranslationKey)}
              </span>
            ))}
          </div>

          <Card variant="soft" className="mt-6 border-[var(--twin-accent)]/20 p-4 sm:p-5">
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
            <div className="mt-8 space-y-6" data-testid={RECRUITER_TALENT_RADAR_MARKERS.filtersPanel}>
              <TalentRadarFilterToolbar filters={filters} roles={roles} onChange={updateFilter} />
              <TalentRadarDecisionFilterBar value={decisionFilter} onChange={setDecisionFilter} />
              {visibleRows.length > 0 ? (
                <TalentRadarSummaryPanel stats={summaryStats} />
              ) : null}
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
            <div className="mt-8">
              <TalentRadarCandidateGroups
                rows={visibleRows}
                roleTitle={roleTitle}
                onDraft={(row) => {
                  setDraftText(buildOutreachDraftText(row, roleTitle, locale));
                  void runDecisionAction(
                    { application_id: appId(row), action_type: "draft_prepared", meta: { source: "talent_radar" } },
                    "recruiterTalentRadar.decisionDraftSaved",
                  );
                }}
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
            </div>
          ) : null}

          <p
            className="mt-8 rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface-raised)] p-4 text-sm leading-relaxed text-[var(--twin-muted-strong)]"
            data-testid={RECRUITER_TALENT_RADAR_MARKERS.disclaimer}
          >
            {disclaimer || t("recruiterTalentRadar.disclaimer")}
          </p>

          {draftText ? (
            <Card
              variant="soft"
              className="mt-6 border-amber-500/30 p-5"
              data-testid={RECRUITER_TALENT_RADAR_MARKERS.draftPanel}
            >
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                {t("recruiterTalentRadar.draftTitle")}
              </p>
              <p className="twin-muted mt-1 text-xs">{t("recruiterTalentRadar.draftNotSent")}</p>
              <pre className="mt-4 whitespace-pre-wrap rounded-lg bg-[var(--twin-surface)] p-4 text-sm leading-relaxed">
                {draftText}
              </pre>
              <button type="button" className="twin-btn-ghost mt-4 text-sm" onClick={() => setDraftText(null)}>
                {t("recruiterTalentRadar.draftClose")}
              </button>
            </Card>
          ) : null}

          <p className="twin-muted mt-6 text-xs">
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
          </p>
        </div>
      </div>

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
