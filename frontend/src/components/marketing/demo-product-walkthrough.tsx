"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import toast from "react-hot-toast";

import { useTranslation } from "@/components/language-provider";
import { DemoMatchGauge } from "@/components/marketing/demo-match-gauge";
import { LandingAmbient } from "@/components/marketing/landing-ambient";
import { MarketingPageSurface } from "@/components/marketing/marketing-page-surface";
import { PipelinePreview } from "@/components/marketing/pipeline-preview";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";
import { Shell } from "@/components/ui";
import { getToken } from "@/lib/auth";
import {
  DEMO_APPLICATION_STATUSES,
  DEMO_CALENDAR_SLOT,
  DEMO_CV_META,
  DEMO_CV_SKILLS,
  DEMO_CV_TITLES,
  DEMO_MARKET_ACTIVE_COUNT,
  DEMO_MARKET_ROADMAP_COUNT,
  DEMO_MARKET_SOURCES,
  DEMO_PL_PRIORITY,
  DEMO_WALKTHROUGH_JOBS,
} from "@/lib/demo-walkthrough-data";
import type { TranslationKey } from "@/lib/i18n";

const STEP_IDS = [
  "demo-step-hero",
  "demo-step-profile",
  "demo-step-coverage",
  "demo-step-ranking",
  "demo-step-feedback",
  "demo-step-prep",
  "demo-step-statuses",
  "demo-step-calendar",
  "demo-step-cta",
] as const;

const STATUS_LABEL_KEYS: Record<
  (typeof DEMO_APPLICATION_STATUSES)[number]["key"],
  TranslationKey
> = {
  prepared: "demo.statusPrepared",
  manual: "demo.statusManual",
  attempted: "demo.statusAttempted",
  confirmed: "demo.statusConfirmed",
};

const STATUS_BODY_KEYS: Record<(typeof DEMO_APPLICATION_STATUSES)[number]["key"], TranslationKey> = {
  prepared: "demo.statusPreparedBody",
  manual: "demo.statusManualBody",
  attempted: "demo.statusAttemptedBody",
  confirmed: "demo.statusConfirmedBody",
};

const STEP_KEYS = [
  "stepNav1",
  "stepNav2",
  "stepNav3",
  "stepNav4",
  "stepNav5",
  "stepNav6",
  "stepNav7",
  "stepNav8",
  "stepNav9",
] as const;

function scrollToDemoStep(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
}

function DemoBadge() {
  const { t } = useTranslation();
  return (
    <span className="inline-flex shrink-0 items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-900 dark:text-amber-100">
      {t("demo.syntheticBadge")}
    </span>
  );
}

function DemoSection({
  id,
  step,
  eyebrowKey,
  titleKey,
  leadKey,
  children,
}: {
  id: string;
  step: string;
  eyebrowKey: TranslationKey;
  titleKey: TranslationKey;
  leadKey: TranslationKey;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <section id={id} className="demo-walkthrough-section scroll-mt-24 space-y-5" aria-labelledby={`${id}-title`}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-[11px] font-medium text-[var(--twin-accent)]">{step}</span>
        <DemoBadge />
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-muted)]">{t(eyebrowKey)}</p>
        <h2 id={`${id}-title`} className="twin-section-title mt-2 text-xl sm:text-2xl">
          {t(titleKey)}
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[var(--twin-muted-strong)] sm:text-base">{t(leadKey)}</p>
      </div>
      {children}
    </section>
  );
}

function DemoJobCard({
  job,
  onFeedback,
}: {
  job: (typeof DEMO_WALKTHROUGH_JOBS)[number];
  onFeedback: (label: string) => void;
}) {
  const { t } = useTranslation();
  const feedbackButtons: { key: TranslationKey; label: string }[] = [
    { key: "dashboard.matchFeedbackApplyIntent", label: t("dashboard.matchFeedbackApplyIntent") },
    { key: "dashboard.matchFeedbackRelevant", label: t("dashboard.matchFeedbackRelevant") },
    { key: "dashboard.matchFeedbackNotRelevant", label: t("dashboard.matchFeedbackNotRelevant") },
    { key: "dashboard.matchFeedbackNotNow", label: t("dashboard.matchFeedbackNotNow") },
  ];

  return (
    <li className="demo-ranking-row rounded-xl border border-[var(--twin-border)]/80 bg-[var(--twin-surface-raised)]/60 px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[var(--foreground)]">{job.title}</p>
          <p className="text-sm text-[var(--twin-muted-strong)]">
            {job.company} · {job.location}
          </p>
          <p className="mt-1 text-xs text-[var(--twin-muted)]">
            {job.board}
            {job.inTop20 ? (
              <span className="ml-2 rounded bg-[var(--twin-accent-muted)] px-1.5 py-0.5 font-semibold text-[var(--twin-accent)]">
                {t("demo.top20Chip")}
              </span>
            ) : null}
          </p>
        </div>
        <DemoMatchGauge score={job.score} size="sm" />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {feedbackButtons.map((btn) => (
          <button
            key={btn.key}
            type="button"
            className="rounded-lg border border-[var(--twin-border)] bg-[var(--twin-card)] px-2.5 py-1 text-xs font-medium text-[var(--twin-muted-strong)] transition hover:border-[var(--twin-accent)]/40 hover:text-[var(--foreground)]"
            onClick={() => onFeedback(btn.label)}
            aria-label={t("dashboard.matchFeedbackAria").replace("{title}", job.title)}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </li>
  );
}

export function DemoProductWalkthrough() {
  const { t } = useTranslation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(Boolean(getToken()));
  }, []);

  const onDemoFeedback = useCallback(
    (label: string) => {
      toast.success(t("demo.feedbackToast").replace("{action}", label));
    },
    [t],
  );

  const top20 = DEMO_WALKTHROUGH_JOBS.filter((j) => j.inTop20);
  const wider = DEMO_WALKTHROUGH_JOBS.filter((j) => !j.inTop20);

  return (
    <Shell wide rail>
      <MarketingPageSurface wide withCard={false}>
        <div className="marketing-copy-rail space-y-12 sm:space-y-14">
          <header
            id={STEP_IDS[0]}
            className="demo-hero relative scroll-mt-24 overflow-hidden rounded-3xl border border-[var(--twin-border)]/60 px-5 py-8 sm:px-8 sm:py-10"
          >
            <LandingAmbient />
            <div className="demo-hero__grid pointer-events-none absolute inset-0" aria-hidden />
            <div className="relative space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <p className="demo-hero__eyebrow text-[10px] font-semibold uppercase tracking-[0.32em] text-[var(--twin-accent)]">
                  {t("demo.pageEyebrow")}
                </p>
                <DemoBadge />
              </div>
              <h1 className="marketing-gradient-heading max-w-4xl text-2xl font-semibold leading-tight tracking-[-0.03em] sm:text-3xl md:text-4xl lg:text-[2.65rem]">
                {t("demo.pageTitle")}
              </h1>
              <p className="max-w-3xl text-base leading-relaxed text-[var(--twin-muted-strong)] sm:text-lg">{t("demo.pageLead")}</p>
              <div className="grid gap-6 lg:grid-cols-2 lg:items-center">
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-[var(--foreground)]">{t("demo.heroPipelineTitle")}</p>
                  <p className="text-sm leading-relaxed text-[var(--twin-muted-strong)]">{t("demo.heroPipelineBody")}</p>
                  <PipelinePreview />
                </div>
                <div className="demo-glass-panel p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--twin-accent)]">{t("demo.heroCvLabel")}</p>
                  <p className="mt-2 text-sm text-[var(--twin-muted-strong)]">{DEMO_CV_TITLES.join(" · ")}</p>
                  <p className="mt-1 text-xs text-[var(--twin-muted)]">{DEMO_CV_SKILLS.slice(0, 5).join(", ")}…</p>
                  <p className="mt-4 text-[10px] uppercase tracking-wider text-[var(--twin-muted)]">{t("demo.heroRankLabel")}</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--foreground)]">200 → 20</p>
                  <p className="text-xs text-[var(--twin-muted-strong)]">{t("demo.heroRankHint")}</p>
                </div>
              </div>
            </div>
          </header>

          <aside className="demo-mode-pill flex flex-wrap items-start gap-3 px-4 py-3 sm:px-5" role="status">
            <span className="demo-mode-pill__dot mt-1.5 shrink-0" aria-hidden />
            <div className="min-w-0 flex-1 text-sm leading-relaxed">
              <p className="font-semibold text-[var(--foreground)]">
                {isLoggedIn ? t("demo.modeLoggedInTitle") : t("demo.modeGuestTitle")}
              </p>
              <p className="mt-1 text-[var(--twin-muted-strong)]">
                {isLoggedIn ? t("demo.modeLoggedInBody") : t("demo.modeGuestBody")}
              </p>
            </div>
          </aside>

          <nav aria-label={t("demo.stepNavAria")} className="demo-walkthrough-nav -mx-1 flex gap-2 overflow-x-auto pb-1">
            {STEP_KEYS.map((key, i) => (
              <button
                key={key}
                type="button"
                onClick={() => scrollToDemoStep(STEP_IDS[i])}
                className="shrink-0 rounded-full border border-[var(--twin-border)] bg-[var(--twin-surface-raised)]/80 px-3 py-1.5 text-xs font-medium text-[var(--twin-muted-strong)] transition hover:border-[var(--twin-accent)]/40 hover:text-[var(--foreground)]"
              >
                {t(`demo.${key}` as TranslationKey)}
              </button>
            ))}
          </nav>

          <DemoSection
            id={STEP_IDS[1]}
            step="02"
            eyebrowKey="demo.step2Eyebrow"
            titleKey="demo.step2Title"
            leadKey="demo.step2Lead"
          >
            <ScrollReveal>
              <div className="grid gap-4 sm:grid-cols-2">
                <dl className="rounded-2xl border border-[var(--twin-border)] bg-[var(--twin-surface-raised)]/90 p-5 text-sm">
                  <dt className="font-semibold text-[var(--foreground)]">{t("demo.cvSkills")}</dt>
                  <dd className="mt-1 text-[var(--twin-muted-strong)]">{DEMO_CV_SKILLS.join(", ")}</dd>
                  <dt className="mt-4 font-semibold text-[var(--foreground)]">{t("demo.cvTitles")}</dt>
                  <dd className="mt-1 text-[var(--twin-muted-strong)]">{DEMO_CV_TITLES.join(", ")}</dd>
                  <dt className="mt-4 font-semibold text-[var(--foreground)]">{t("demo.cvExperience")}</dt>
                  <dd className="mt-1 text-[var(--twin-muted-strong)]">
                    {DEMO_CV_META.experienceYears} {t("demo.cvYears")}
                  </dd>
                </dl>
                <div className="flex flex-col justify-center gap-3 rounded-2xl border border-[var(--twin-accent)]/30 bg-[var(--twin-accent-muted)]/30 p-5">
                  <p className="text-sm text-[var(--twin-muted-strong)]">{t("demo.step2ProfileHint")}</p>
                  {isLoggedIn ? (
                    <Link href="/profile" className="section-cta-primary twin-touch-target w-fit px-5 text-sm">
                      {t("demo.ctaProfile")}
                    </Link>
                  ) : (
                    <Link href="/register" className="section-cta-primary twin-touch-target w-fit px-5 text-sm">
                      {t("demo.ctaRegister")}
                    </Link>
                  )}
                </div>
              </div>
            </ScrollReveal>
          </DemoSection>

          <DemoSection
            id={STEP_IDS[2]}
            step="03"
            eyebrowKey="demo.step3Eyebrow"
            titleKey="demo.step3Title"
            leadKey="demo.step3Lead"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-[var(--twin-border)] p-5">
                <p className="text-2xl font-semibold tabular-nums text-[var(--foreground)]">~{DEMO_MARKET_ACTIVE_COUNT}</p>
                <p className="text-sm text-[var(--twin-muted-strong)]">{t("demo.coverageActive")}</p>
              </div>
              <div className="rounded-2xl border border-[var(--twin-border)] p-5">
                <p className="text-2xl font-semibold tabular-nums text-[var(--foreground)]">{DEMO_MARKET_ROADMAP_COUNT}+</p>
                <p className="text-sm text-[var(--twin-muted-strong)]">{t("demo.coverageRoadmap")}</p>
              </div>
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--twin-muted)]">{t("demo.coverageSourcesLabel")}</p>
            <ul className="flex flex-wrap gap-2">
              {DEMO_MARKET_SOURCES.map((s) => (
                <li key={s} className="rounded-full border border-[var(--twin-border)] px-3 py-1 text-xs text-[var(--twin-muted-strong)]">
                  {s}
                </li>
              ))}
            </ul>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--twin-muted)]">{t("demo.coveragePlLabel")}</p>
            <ul className="flex flex-wrap gap-2">
              {DEMO_PL_PRIORITY.map((s) => (
                <li
                  key={s}
                  className="rounded-full border border-[var(--twin-accent)]/35 bg-[var(--twin-accent-muted)]/40 px-3 py-1 text-xs font-medium text-[var(--twin-accent)]"
                >
                  {s}
                </li>
              ))}
            </ul>
          </DemoSection>

          <DemoSection
            id={STEP_IDS[3]}
            step="04"
            eyebrowKey="demo.step4Eyebrow"
            titleKey="demo.step4Title"
            leadKey="demo.step4Lead"
          >
            <p className="text-sm font-semibold text-[var(--foreground)]">{t("demo.top20SectionTitle")}</p>
            <ul className="space-y-3">
              {top20.map((job) => (
                <DemoJobCard key={job.id} job={job} onFeedback={onDemoFeedback} />
              ))}
            </ul>
            {wider.length > 0 ? (
              <>
                <p className="text-sm font-semibold text-[var(--foreground)]">{t("demo.top200SectionTitle")}</p>
                <ul className="space-y-3 opacity-90">
                  {wider.map((job) => (
                    <DemoJobCard key={job.id} job={job} onFeedback={onDemoFeedback} />
                  ))}
                </ul>
              </>
            ) : null}
          </DemoSection>

          <DemoSection
            id={STEP_IDS[4]}
            step="05"
            eyebrowKey="demo.step5Eyebrow"
            titleKey="demo.step5Title"
            leadKey="demo.step5Lead"
          >
            <p className="rounded-xl border border-[var(--twin-border)] bg-[var(--twin-card)]/80 px-4 py-3 text-sm text-[var(--twin-muted-strong)]">
              {t("demo.step5Explain")}
            </p>
          </DemoSection>

          <DemoSection
            id={STEP_IDS[5]}
            step="06"
            eyebrowKey="demo.step6Eyebrow"
            titleKey="demo.step6Title"
            leadKey="demo.step6Lead"
          >
            <ol className="list-none space-y-3 p-0">
              {(["prep1", "prep2", "prep3"] as const).map((k) => (
                <li
                  key={k}
                  className="flex gap-3 rounded-xl border border-[var(--twin-border)] bg-[var(--twin-surface-raised)]/50 px-4 py-3 text-sm text-[var(--twin-muted-strong)]"
                >
                  <span className="font-mono text-[var(--twin-accent)]">✓</span>
                  {t(`demo.${k}` as TranslationKey)}
                </li>
              ))}
            </ol>
          </DemoSection>

          <DemoSection
            id={STEP_IDS[6]}
            step="07"
            eyebrowKey="demo.step7Eyebrow"
            titleKey="demo.step7Title"
            leadKey="demo.step7Lead"
          >
            <ul className="grid gap-3 sm:grid-cols-2">
              {DEMO_APPLICATION_STATUSES.map((row) => (
                <li
                  key={row.key}
                  className="rounded-xl border border-[var(--twin-border)] bg-[var(--twin-card)]/80 p-4"
                >
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--twin-accent)]">
                    {t(STATUS_LABEL_KEYS[row.key])}
                  </span>
                  <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">{row.jobTitle}</p>
                  <p className="text-xs text-[var(--twin-muted-strong)]">{row.company}</p>
                  <p className="mt-2 text-xs leading-relaxed text-[var(--twin-muted)]">{t(STATUS_BODY_KEYS[row.key])}</p>
                </li>
              ))}
            </ul>
          </DemoSection>

          <DemoSection
            id={STEP_IDS[7]}
            step="08"
            eyebrowKey="demo.step8Eyebrow"
            titleKey="demo.step8Title"
            leadKey="demo.step8Lead"
          >
            <div className="demo-glass-panel max-w-lg p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--twin-accent)]">{t("demo.calendarHoldTitle")}</p>
              <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                {DEMO_CALENDAR_SLOT.when} · {DEMO_CALENDAR_SLOT.duration}
              </p>
              <p className="text-sm text-[var(--twin-muted-strong)]">{DEMO_CALENDAR_SLOT.title}</p>
              <p className="mt-2 text-sm text-[var(--twin-muted-strong)]">
                {DEMO_CALENDAR_SLOT.job} @ {DEMO_CALENDAR_SLOT.company}
              </p>
              <p className="mt-3 text-xs leading-relaxed text-[var(--twin-muted)]">{t("demo.calendarHint")}</p>
              {isLoggedIn ? (
                <Link href="/dashboard/calendar" className="mt-4 inline-flex text-sm font-semibold text-[var(--twin-accent)]">
                  {t("demo.ctaCalendar")} →
                </Link>
              ) : null}
            </div>
          </DemoSection>

          <section
            id={STEP_IDS[8]}
            className="demo-walkthrough-cta scroll-mt-24 rounded-3xl border border-[var(--twin-accent)]/35 bg-[var(--twin-accent-muted)]/25 px-5 py-8 sm:px-8"
          >
            <h2 className="twin-section-title text-xl sm:text-2xl">{t("demo.ctaSectionTitle")}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--twin-muted-strong)]">{t("demo.ctaSectionLead")}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              {isLoggedIn ? (
                <>
                  <Link href="/dashboard" className="section-cta-primary marketing-btn-primary-shadow twin-touch-target px-6 text-sm">
                    {t("demo.ctaDashboard")}
                  </Link>
                  <Link href="/profile" className="section-cta-secondary twin-touch-target px-5 text-sm">
                    {t("demo.ctaProfile")}
                  </Link>
                  <Link href="/dashboard#dashboard-matches" className="section-cta-secondary twin-touch-target px-5 text-sm">
                    {t("demo.ctaMatches")}
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/waitlist" className="twin-header-cta twin-nav-waitlist-pill twin-touch-target px-6 text-sm">
                    {t("demo.ctaWishlist")}
                  </Link>
                  <Link href="/register" className="section-cta-primary marketing-btn-primary-shadow twin-touch-target px-6 text-sm">
                    {t("demo.ctaRegister")}
                  </Link>
                </>
              )}
              <Link href="/first-1000" className="section-cta-secondary twin-touch-target px-5 text-sm">
                {t("demo.ctaFounding")}
              </Link>
            </div>
          </section>

          <p className="max-w-3xl text-xs leading-relaxed text-[var(--twin-muted)]">{t("demo.footerNote")}</p>
        </div>
      </MarketingPageSurface>
    </Shell>
  );
}
