"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { useAbortableFetch } from "@/hooks/use-abortable-fetch";
import { RecruiterAccessFields } from "@/components/recruiter/recruiter-access-fields";
import { RecruiterWorkspaceNav } from "@/components/recruiter/recruiter-workspace-nav";
import { TalentRadarDigestCopyButton } from "@/components/recruiter/talent-radar/talent-radar-digest-copy-button";
import { TalentRadarDigestNarrative } from "@/components/recruiter/talent-radar/talent-radar-digest-narrative";
import { TalentRadarDigestSection } from "@/components/recruiter/talent-radar/talent-radar-digest-section";
import { TalentRadarDigestSummary } from "@/components/recruiter/talent-radar/talent-radar-digest-summary";
import { Card, Shell } from "@/components/ui";
import { GuidedEmptyState } from "@/components/ux/guided-empty-state";
import type { TranslationKey } from "@/lib/i18n";
import { getClientApiLocale } from "@/lib/api-locale";
import {
  mergeCompanyOptions,
  readRecruiterInboxDemoEnv,
  readRecruiterInboxSession,
  resolveCompanySlugFromRaw,
  writeRecruiterInboxSession,
} from "@/lib/recruiter-inbox";
import {
  parseRecruiterInboxErrorDetail,
  recruiterInboxErrorMessageKey,
} from "@/lib/recruiter-inbox-errors";
import { RECRUITER_TALENT_RADAR_ROUTE } from "@/lib/recruiter-talent-radar";
import {
  RECRUITER_TALENT_RADAR_DIGEST_MARKERS,
  TALENT_RADAR_DIGEST_PERIODS,
  digestHasContent,
  talentRadarDigestQueryParams,
  type TalentRadarDigestPayload,
  type TalentRadarDigestPeriod,
} from "@/lib/recruiter-talent-radar-digest";

const STATUS_CHIP_KEYS = [
  "chipPilot",
  "chipHumanReview",
  "chipNoAutoOutreach",
  "chipInternalData",
] as const;

const EMPTY_SUMMARY = {
  candidatesToReview: 0,
  returningFromSnooze: 0,
  shortlistedWithoutFollowUp: 0,
  newRadarDecisions: 0,
  lowCoverageRoles: 0,
  draftsPreparedNotSent: 0,
  uniqueCandidateCount: 0,
  draftDecisionCount: 0,
};

export default function RecruiterTalentRadarDigestClient() {
  const { t } = useTranslation();
  const { fetch: fetchAbortable } = useAbortableFetch();
  const [token, setToken] = useState("");
  const [companyRaw, setCompanyRaw] = useState("");
  const [period, setPeriod] = useState<TalentRadarDigestPeriod>("7d");
  const [payload, setPayload] = useState<TalentRadarDigestPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const companyOptions = useMemo(
    () =>
      mergeCompanyOptions(
        companyRaw,
        readRecruiterInboxSession().companySlug,
        readRecruiterInboxDemoEnv().companySlug,
      ),
    [companyRaw],
  );
  const knownSlugs = useMemo(() => new Set(companyOptions.map((o) => o.slug)), [companyOptions]);
  const companySlug = useMemo(
    () => resolveCompanySlugFromRaw(companyRaw, knownSlugs),
    [companyRaw, knownSlugs],
  );

  useEffect(() => {
    const session = readRecruiterInboxSession();
    const demoEnv = readRecruiterInboxDemoEnv();
    queueMicrotask(() => {
      setToken(session.token || demoEnv.token);
      setCompanyRaw(session.companySlug || demoEnv.companySlug);
    });
  }, []);

  const loadDigest = useCallback(async () => {
    const tkn = token.trim();
    const slug = companySlug;
    if (!tkn || !slug) {
      setAuthError(t("recruiterTalentRadarDigest.missingAuth"));
      return;
    }
    setAuthError(null);
    setLoadError(null);
    writeRecruiterInboxSession(tkn, slug);
    setLoading(true);
    try {
      const q = talentRadarDigestQueryParams(tkn, slug, period);
      const res = await fetchAbortable(`/api/recruiter/talent-radar/digest?${q}`, {
        headers: { "X-Locale": getClientApiLocale() ?? "en" },
        cache: "no-store",
      });
      if (!res.ok) {
        const body = await res.text();
        const key = recruiterInboxErrorMessageKey(parseRecruiterInboxErrorDetail(body), res.status);
        setLoadError(t(`recruiterInbox.${key}`));
        setPayload(null);
        setLoaded(false);
        return;
      }
      setPayload((await res.json()) as TalentRadarDigestPayload);
      setLoaded(true);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setLoadError(t("recruiterInbox.errorNetwork"));
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [companySlug, period, t, token, fetchAbortable]);

  const summary = useMemo(() => payload?.summary ?? EMPTY_SUMMARY, [payload]);
  const sections = useMemo(() => payload?.sections, [payload]);
  const sectionMeta = useMemo(() => payload?.sectionMeta, [payload]);
  const hasContent = useMemo(() => (payload ? digestHasContent(payload) : false), [payload]);
  const warnings = useMemo(() => payload?.dataQualityWarnings ?? [], [payload]);

  return (
    <Shell wide>
      <RecruiterWorkspaceNav />
      <div className={RECRUITER_TALENT_RADAR_DIGEST_MARKERS.page} data-testid={RECRUITER_TALENT_RADAR_DIGEST_MARKERS.page}>
        <div className="mx-auto max-w-5xl px-1 pb-12 pt-2 sm:px-2">
          <div className="space-y-6" data-testid={RECRUITER_TALENT_RADAR_DIGEST_MARKERS.hero}>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--twin-muted-strong)]">
              {t("recruiterTalentRadarDigest.eyebrow")}
            </p>
            <h1 className="twin-section-title mt-2 text-2xl sm:text-3xl">{t("recruiterTalentRadarDigest.title")}</h1>
            <p className="twin-muted mt-3 max-w-3xl text-sm leading-relaxed">{t("recruiterTalentRadarDigest.subtitle")}</p>
          </div>

          <div
            className="mt-4 flex flex-wrap gap-2"
            data-testid={RECRUITER_TALENT_RADAR_DIGEST_MARKERS.statusChips}
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

          <Card variant="soft" className="mt-6 border-[var(--twin-accent)]/20 p-5 sm:p-6">
            <p className="text-sm font-semibold text-[var(--foreground)]">{t("recruiterTalentRadarDigest.trustTitle")}</p>
            <p className="twin-muted mt-1 text-sm leading-relaxed">{t("recruiterTalentRadarDigest.trustBody")}</p>
          </Card>

          <div className="mt-6">
            <RecruiterAccessFields
              token={token}
              onTokenChange={setToken}
              companySlug={companyRaw}
              onCompanySlugChange={setCompanyRaw}
              companyOptions={companyOptions}
            />
            <div
              className="mt-4 flex flex-wrap items-center gap-3"
              data-testid={RECRUITER_TALENT_RADAR_DIGEST_MARKERS.periodSelector}
            >
              {TALENT_RADAR_DIGEST_PERIODS.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={
                    period === p
                      ? "twin-btn-solid text-sm"
                      : "twin-btn-outline text-sm"
                  }
                  onClick={() => setPeriod(p)}
                >
                  {t(`recruiterTalentRadarDigest.period_${p}` as TranslationKey)}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="twin-btn-solid mt-4 text-sm"
              disabled={loading}
              onClick={() => void loadDigest()}
            >
              {loading ? t("recruiterTalentRadarDigest.loading") : t("recruiterTalentRadarDigest.loadCta")}
            </button>
            {authError ? <p className="mt-3 text-sm text-red-600">{authError}</p> : null}
            {loadError ? <p className="mt-3 text-sm text-red-600">{loadError}</p> : null}
          </div>

          {loaded && payload ? (
            <div className="mt-10 space-y-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-[var(--twin-muted-strong)]">
                  {payload.period?.label} · {t("recruiterTalentRadarDigest.recruiterDecides")}
                </p>
                <TalentRadarDigestCopyButton payload={payload} />
              </div>

              <TalentRadarDigestSummary summary={summary} />

              {warnings.length > 0 ? (
                <div
                  className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4"
                  data-testid={RECRUITER_TALENT_RADAR_DIGEST_MARKERS.warnings}
                >
                  <p className="text-xs font-semibold text-amber-200/90">{t("recruiterTalentRadarDigest.dataQualityTitle")}</p>
                  <ul className="mt-2 space-y-1 text-xs text-[var(--twin-muted-strong)]">
                    {warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <TalentRadarDigestNarrative narrative={payload.narrative ?? ""} />

              {!hasContent ? (
                <div data-testid={RECRUITER_TALENT_RADAR_DIGEST_MARKERS.emptyState}>
                  <GuidedEmptyState
                    title={t("recruiterTalentRadarDigest.emptyTitle")}
                    message={t("recruiterTalentRadarDigest.emptyBody")}
                    steps={[
                      t("recruiterTalentRadarDigest.emptyActionRadar"),
                      t("recruiterTalentRadarDigest.emptyActionPipeline"),
                      t("recruiterTalentRadarDigest.emptyActionSearch"),
                    ]}
                    actionLabel={t("recruiterTalentRadarDigest.emptyActionRadar")}
                    actionHref={RECRUITER_TALENT_RADAR_ROUTE}
                  />
                </div>
              ) : (
                <div className="space-y-10">
                  <TalentRadarDigestSection
                    sectionId="reviewFirst"
                    kind="candidates"
                    titleKey="recruiterTalentRadarDigest.sectionReviewFirst"
                    emptyKey="recruiterTalentRadarDigest.sectionReviewFirstEmpty"
                    items={sections?.reviewFirst ?? []}
                    meta={sectionMeta?.reviewFirst}
                  />
                  <TalentRadarDigestSection
                    sectionId="returningFromSnooze"
                    kind="candidates"
                    titleKey="recruiterTalentRadarDigest.sectionReturningSnooze"
                    emptyKey="recruiterTalentRadarDigest.sectionReturningSnoozeEmpty"
                    items={sections?.returningFromSnooze ?? []}
                    meta={sectionMeta?.returningFromSnooze}
                  />
                  <TalentRadarDigestSection
                    sectionId="shortlistedWithoutFollowUp"
                    kind="candidates"
                    titleKey="recruiterTalentRadarDigest.sectionShortlistNoFollowUp"
                    emptyKey="recruiterTalentRadarDigest.sectionShortlistNoFollowUpEmpty"
                    items={sections?.shortlistedWithoutFollowUp ?? []}
                    meta={sectionMeta?.shortlistedWithoutFollowUp}
                  />
                  <TalentRadarDigestSection
                    sectionId="dismissedPatterns"
                    kind="dismissed"
                    titleKey="recruiterTalentRadarDigest.sectionDismissedPatterns"
                    emptyKey="recruiterTalentRadarDigest.sectionDismissedPatternsEmpty"
                    items={sections?.dismissedPatterns ?? []}
                    meta={sectionMeta?.dismissedPatterns}
                  />
                  <TalentRadarDigestSection
                    sectionId="lowCoverageRoles"
                    kind="roles"
                    titleKey="recruiterTalentRadarDigest.sectionLowCoverageRoles"
                    emptyKey="recruiterTalentRadarDigest.sectionLowCoverageRolesEmpty"
                    items={sections?.lowCoverageRoles ?? []}
                    meta={sectionMeta?.lowCoverageRoles}
                  />
                  <TalentRadarDigestSection
                    sectionId="draftsPrepared"
                    kind="candidates"
                    titleKey="recruiterTalentRadarDigest.sectionDraftsPrepared"
                    emptyKey="recruiterTalentRadarDigest.sectionDraftsPreparedEmpty"
                    items={sections?.draftsPrepared ?? []}
                    meta={sectionMeta?.draftsPrepared}
                    showNotSent
                  />
                </div>
              )}

              <p className="text-xs text-[var(--twin-muted-strong)]">{payload.disclaimer}</p>
              <Link
                href={RECRUITER_TALENT_RADAR_ROUTE}
                className="inline-block text-sm font-medium text-[var(--twin-accent)] underline"
              >
                {t("recruiterTalentRadarDigest.backToRadar")}
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </Shell>
  );
}
