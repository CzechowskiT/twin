"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { RecruiterAccessFields } from "@/components/recruiter/recruiter-access-fields";
import { RecruiterWorkspaceNav } from "@/components/recruiter/recruiter-workspace-nav";
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
  TALENT_RADAR_SEGMENTS,
  TALENT_RADAR_SIGNALS,
  TALENT_RADAR_TIMING,
  talentRadarInboxHighlightHref,
  talentRadarQueryParams,
  type TalentRadarCandidate,
  type TalentRadarFilters,
  type TalentRadarPayload,
} from "@/lib/recruiter-talent-radar";
import { getClientApiLocale } from "@/lib/api-locale";
import {
  recruiterInboxCandidateCardClass,
  recruiterInboxMatchScoreValueClass,
} from "@/lib/recruiter-inbox-visual";

type RoleOption = { id: number; title: string };

const STATUS_CHIP_KEYS = [
  "chipPilot",
  "chipHumanReview",
  "chipNoAutoOutreach",
  "chipInternalData",
] as const;

function statusLabelKey(status: TalentRadarCandidate["status"]): TranslationKey {
  const map: Record<TalentRadarCandidate["status"], TranslationKey> = {
    ready_to_review: "recruiterTalentRadar.statusReady",
    needs_verification: "recruiterTalentRadar.statusNeedsVerification",
    consent_check_required: "recruiterTalentRadar.statusConsent",
    stale_data: "recruiterTalentRadar.statusStale",
    not_enough_evidence: "recruiterTalentRadar.statusNotEnough",
  };
  return map[status];
}

function fitLabelKey(fit: TalentRadarCandidate["fit_label"]): TranslationKey {
  const map: Record<TalentRadarCandidate["fit_label"], TranslationKey> = {
    strong: "recruiterTalentRadar.fitStrong",
    good: "recruiterTalentRadar.fitGood",
    possible: "recruiterTalentRadar.fitPossible",
    weak: "recruiterTalentRadar.fitWeak",
  };
  return map[fit];
}

export default function RecruiterTalentRadarClient() {
  const { t, locale } = useTranslation();
  const searchParams = useSearchParams();
  const [token, setToken] = useState("");
  const [companyRaw, setCompanyRaw] = useState("");
  const [filters, setFilters] = useState<TalentRadarFilters>(DEFAULT_TALENT_RADAR_FILTERS);
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
  const [snoozed, setSnoozed] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
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

  const visibleRows = rows.filter((r) => !snoozed.has(r.id) && !dismissed.has(r.id));

  function updateFilter<K extends keyof TalentRadarFilters>(key: K, value: TalentRadarFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
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
                {t(`recruiterTalentRadar.${key}`)}
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
            <div
              className="mt-8 grid gap-4 sm:grid-cols-2"
              data-testid={RECRUITER_TALENT_RADAR_MARKERS.filtersPanel}
            >
              <label className="block text-sm">
                <span className="font-medium">{t("recruiterTalentRadar.filterRole")}</span>
                <select
                  className="mt-1 w-full rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface)] px-3 py-2 text-sm"
                  value={filters.roleId}
                  onChange={(e) => updateFilter("roleId", e.target.value)}
                >
                  <option value="">{t("recruiterTalentRadar.filterAllRoles")}</option>
                  {roles.map((r) => (
                    <option key={r.id} value={String(r.id)}>
                      {r.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="font-medium">{t("recruiterTalentRadar.filterSegment")}</span>
                <select
                  className="mt-1 w-full rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface)] px-3 py-2 text-sm"
                  value={filters.segment}
                  onChange={(e) => updateFilter("segment", e.target.value as TalentRadarFilters["segment"])}
                >
                  {TALENT_RADAR_SEGMENTS.map((s) => (
                    <option key={s} value={s}>
                      {t(`recruiterTalentRadar.segment_${s}` as TranslationKey)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="font-medium">{t("recruiterTalentRadar.filterTiming")}</span>
                <select
                  className="mt-1 w-full rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface)] px-3 py-2 text-sm"
                  value={filters.timingWindow}
                  onChange={(e) => updateFilter("timingWindow", e.target.value as TalentRadarFilters["timingWindow"])}
                >
                  {TALENT_RADAR_TIMING.map((tw) => (
                    <option key={tw} value={tw}>
                      {t(`recruiterTalentRadar.timing_${tw}` as TranslationKey)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="font-medium">{t("recruiterTalentRadar.filterSignal")}</span>
                <select
                  className="mt-1 w-full rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface)] px-3 py-2 text-sm"
                  value={filters.signalType}
                  onChange={(e) => updateFilter("signalType", e.target.value as TalentRadarFilters["signalType"])}
                >
                  {TALENT_RADAR_SIGNALS.map((sig) => (
                    <option key={sig} value={sig}>
                      {t(`recruiterTalentRadar.signal_${sig}` as TranslationKey)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
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
            <ul className="mt-8 space-y-5">
              {visibleRows.map((row) => (
                <li key={row.id}>
                  <Card
                    variant="soft"
                    className={`${recruiterInboxCandidateCardClass} p-5`}
                    data-testid={RECRUITER_TALENT_RADAR_MARKERS.candidateCard}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-semibold text-[var(--foreground)]">{row.display_name}</h2>
                        {row.headline ? (
                          <p className="twin-muted text-sm">{row.headline}</p>
                        ) : null}
                        {row.job_title ? (
                          <p className="mt-1 text-xs text-[var(--twin-muted-strong)]">{row.job_title}</p>
                        ) : null}
                      </div>
                      <div className="text-right">
                        <p className={`text-2xl font-bold ${recruiterInboxMatchScoreValueClass}`}>{row.score}</p>
                        <p className="text-xs font-medium uppercase tracking-wide text-[var(--twin-muted-strong)]">
                          {t(fitLabelKey(row.fit_label))}
                        </p>
                        <p className="mt-1 text-xs">{t(statusLabelKey(row.status))}</p>
                      </div>
                    </div>

                    <RadarSection title={t("recruiterTalentRadar.whySurfaced")} items={row.why_surfaced} />
                    <RadarSection title={t("recruiterTalentRadar.whyNow")} items={row.why_now} />
                    <RadarSection title={t("recruiterTalentRadar.evidence")} items={row.evidence} />
                    <RadarSection title={t("recruiterTalentRadar.risks")} items={row.risks} variant="risk" />
                    <RadarSection title={t("recruiterTalentRadar.missingData")} items={row.missing_data} />

                    <div className="mt-4 flex flex-wrap gap-3 text-xs text-[var(--twin-muted-strong)]">
                      <span>
                        {t("recruiterTalentRadar.dataConfidence")}: {row.data_confidence}
                      </span>
                      {row.last_interaction ? (
                        <span>
                          {t("recruiterTalentRadar.lastInteraction")}: {row.last_interaction.slice(0, 10)}
                        </span>
                      ) : null}
                      <span className="font-medium text-amber-700 dark:text-amber-400">
                        {t("recruiterTalentRadar.humanDecisionRequired")}
                      </span>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <Link
                        href={talentRadarInboxHighlightHref(Number(row.application_id ?? row.id))}
                        className="twin-btn-solid text-xs"
                      >
                        {t("recruiterTalentRadar.ctaReviewCard")}
                      </Link>
                      <button type="button" className="twin-btn-ghost text-xs" onClick={() => {}}>
                        {t("recruiterTalentRadar.ctaShortlist")}
                      </button>
                      <button
                        type="button"
                        className="twin-btn-ghost text-xs"
                        onClick={() =>
                          setDraftText(buildOutreachDraftText(row, roleTitle, locale))
                        }
                      >
                        {t("recruiterTalentRadar.ctaDraft")}
                      </button>
                      <button
                        type="button"
                        className="twin-btn-ghost text-xs"
                        onClick={() => setDismissed((s) => new Set(s).add(row.id))}
                      >
                        {t("recruiterTalentRadar.ctaNotRelevant")}
                      </button>
                      <button
                        type="button"
                        className="twin-btn-ghost text-xs"
                        onClick={() => setSnoozed((s) => new Set(s).add(row.id))}
                      >
                        {t("recruiterTalentRadar.ctaSnooze")}
                      </button>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
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
    </Shell>
  );
}

function RadarSection({
  title,
  items,
  variant,
}: {
  title: string;
  items: string[];
  variant?: "risk";
}) {
  if (!items.length) return null;
  return (
    <div className="mt-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--twin-muted-strong)]">{title}</p>
      <ul className={`mt-1 list-inside list-disc text-sm ${variant === "risk" ? "text-amber-800 dark:text-amber-300" : ""}`}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
