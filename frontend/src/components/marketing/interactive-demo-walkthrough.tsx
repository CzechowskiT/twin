"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { useTranslation } from "@/components/language-provider";
import { DemoMatchGauge } from "@/components/marketing/demo-match-gauge";
import { DemoSampleBadge } from "@/components/marketing/demo-sample-badge";
import { MarketingPageSurface } from "@/components/marketing/marketing-page-surface";
import { Shell } from "@/components/ui";
import { getToken } from "@/lib/auth";
import {
  DEMO_CALENDAR_SLOT,
  DEMO_CV_META,
  DEMO_CV_SKILLS,
  DEMO_CV_TITLES,
  DEMO_INBOX_CANDIDATE,
  DEMO_MARKET_ACTIVE_COUNT,
  DEMO_MARKET_SOURCES,
  DEMO_REVIEW_CARD,
  DEMO_WALKTHROUGH_JOBS,
} from "@/lib/demo-walkthrough-data";
import type { TranslationKey } from "@/lib/i18n";
import {
  REVIEW_CARD_SECTIONS,
  reviewCardDataConfidenceKey,
  reviewCardSectionItems,
} from "@/lib/recruiter-review-card";

const STEP_COUNT = 8;
const AUTOPLAY_MS = 5200;

const STEP_TITLE_KEYS = [
  "interactiveDemo.step1Title",
  "interactiveDemo.step2Title",
  "interactiveDemo.step3Title",
  "interactiveDemo.step4Title",
  "interactiveDemo.step5Title",
  "interactiveDemo.step6Title",
  "interactiveDemo.step7Title",
  "interactiveDemo.step8Title",
] as const;

const STEP_LEAD_KEYS = [
  "interactiveDemo.step1Lead",
  "interactiveDemo.step2Lead",
  "interactiveDemo.step3Lead",
  "interactiveDemo.step4Lead",
  "interactiveDemo.step5Lead",
  "interactiveDemo.step6Lead",
  "interactiveDemo.step7Lead",
  "interactiveDemo.step8Lead",
] as const;

const REVIEW_LABEL_KEYS: Record<(typeof REVIEW_CARD_SECTIONS)[number], TranslationKey> = {
  whyThisCandidate: "recruiterInbox.reviewWhyThisCandidate",
  requirementsMatched: "recruiterInbox.reviewRequirementsMatched",
  uncertainOrMissing: "recruiterInbox.reviewUncertainOrMissing",
  whatToVerify: "recruiterInbox.reviewWhatToVerify",
  dataConfidence: "recruiterInbox.reviewDataConfidence",
  redFlags: "recruiterInbox.reviewRedFlags",
  humanDecision: "recruiterInbox.reviewHumanDecision",
  disclaimer: "recruiterInbox.reviewDisclaimer",
};

function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduce(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return reduce;
}

export function InteractiveDemoWalkthrough() {
  const { t } = useTranslation();
  const reduceMotion = usePrefersReducedMotion();
  const [step, setStep] = useState(0);
  const [autoplay, setAutoplay] = useState(false);
  const [decision, setDecision] = useState<"pending" | "accepted" | "declined">("pending");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setIsLoggedIn(Boolean(getToken())));
  }, []);

  useEffect(() => {
    if (!autoplay || reduceMotion) return;
    const id = window.setInterval(() => {
      setStep((s) => (s >= STEP_COUNT - 1 ? 0 : s + 1));
    }, AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [autoplay, reduceMotion]);

  const top20 = useMemo(() => DEMO_WALKTHROUGH_JOBS.filter((j) => j.inTop20), []);

  const goNext = useCallback(() => setStep((s) => Math.min(s + 1, STEP_COUNT - 1)), []);
  const goBack = useCallback(() => setStep((s) => Math.max(s - 1, 0)), []);

  const onDemoDecision = (action: "accept" | "decline") => {
    setDecision(action === "accept" ? "accepted" : "declined");
    const label = action === "accept" ? t("recruiterInbox.accept") : t("recruiterInbox.decline");
    toast.success(t("interactiveDemo.decisionToast").replace("{action}", label));
  };

  const stepAnimClass = reduceMotion ? "" : "interactive-demo-step-enter";

  return (
    <Shell wide rail>
      <MarketingPageSurface wide withCard={false}>
        <div className="marketing-copy-rail space-y-8 sm:space-y-10">
          <header className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[var(--twin-accent)]">
                {t("interactiveDemo.pageEyebrow")}
              </p>
              <DemoSampleBadge variant="hero" />
            </div>
            <h1 className="marketing-gradient-heading text-2xl font-semibold tracking-[-0.03em] sm:text-3xl md:text-4xl">
              {t("interactiveDemo.pageTitle")}
            </h1>
            <p className="max-w-3xl text-sm leading-relaxed text-[var(--twin-muted-strong)] sm:text-base">
              {t("interactiveDemo.pageLead")}
            </p>
            <p className="interactive-demo-simulation-pill" role="status">
              {t("interactiveDemo.simulationLabel")}
            </p>
          </header>

          <div className="interactive-demo-controls flex flex-wrap items-center justify-between gap-3">
            <div
              className="interactive-demo-progress flex items-center gap-2"
              role="progressbar"
              aria-valuemin={1}
              aria-valuemax={STEP_COUNT}
              aria-valuenow={step + 1}
              aria-label={t("interactiveDemo.progressAria")}
            >
              {Array.from({ length: STEP_COUNT }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setStep(i)}
                  className={`interactive-demo-progress-dot ${i === step ? "is-active" : ""} ${i < step ? "is-done" : ""}`}
                  aria-label={t(STEP_TITLE_KEYS[i])}
                  aria-current={i === step ? "step" : undefined}
                />
              ))}
              <span className="ml-1 font-mono text-xs text-[var(--twin-muted)]">
                {step + 1}/{STEP_COUNT}
              </span>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-[var(--twin-muted-strong)]">
              <input
                type="checkbox"
                checked={autoplay}
                onChange={(e) => setAutoplay(e.target.checked)}
                className="rounded border-[var(--twin-border)]"
              />
              {t("interactiveDemo.autoplay")}
            </label>
          </div>

          <article
            key={step}
            className={`interactive-demo-stage rounded-3xl border border-[var(--twin-border)]/70 bg-[var(--twin-surface-raised)]/40 px-5 py-8 sm:px-8 ${stepAnimClass}`}
          >
            <h2 className="twin-section-title text-xl sm:text-2xl">{t(STEP_TITLE_KEYS[step])}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--twin-muted-strong)]">
              {t(STEP_LEAD_KEYS[step])}
            </p>

            {step === 0 ? (
              <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-[var(--twin-border)] p-5 text-sm">
                  <dt className="font-semibold">{t("demo.cvSkills")}</dt>
                  <dd className="mt-1 text-[var(--twin-muted-strong)]">{DEMO_CV_SKILLS.join(", ")}</dd>
                  <dt className="mt-4 font-semibold">{t("demo.cvTitles")}</dt>
                  <dd className="mt-1 text-[var(--twin-muted-strong)]">{DEMO_CV_TITLES.join(", ")}</dd>
                </div>
                <div className="rounded-2xl border border-[var(--twin-accent)]/30 bg-[var(--twin-accent-muted)]/30 p-5 text-sm">
                  <p>{t("interactiveDemo.profileHint")}</p>
                  <p className="mt-2 text-xs text-[var(--twin-muted)]">
                    {DEMO_CV_META.experienceYears} {t("demo.cvYears")} · {DEMO_CV_META.location}
                  </p>
                </div>
              </dl>
            ) : null}

            {step === 1 ? (
              <div className="mt-6 space-y-4">
                <p className="text-2xl font-semibold tabular-nums">~{DEMO_MARKET_ACTIVE_COUNT}</p>
                <p className="text-sm text-[var(--twin-muted-strong)]">{t("demo.coverageActive")}</p>
                <ul className="flex flex-wrap gap-2">
                  {DEMO_MARKET_SOURCES.slice(0, 6).map((s) => (
                    <li key={s} className="interactive-demo-scan-chip rounded-full border px-3 py-1 text-xs">
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {step === 2 ? (
              <ul className="mt-6 space-y-3">
                {top20.slice(0, 4).map((job) => (
                  <li
                    key={job.id}
                    className="interactive-demo-match-row flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3"
                  >
                    <div>
                      <p className="font-semibold">{job.title}</p>
                      <p className="text-sm text-[var(--twin-muted-strong)]">
                        {job.company} · {job.location}
                      </p>
                    </div>
                    <DemoMatchGauge score={job.score} size="sm" />
                  </li>
                ))}
              </ul>
            ) : null}

            {step === 3 ? (
              <p className="mt-6 rounded-xl border bg-[var(--twin-card)]/80 px-4 py-3 text-sm text-[var(--twin-muted-strong)]">
                {t("interactiveDemo.transparencyBody")}
              </p>
            ) : null}

            {step === 4 ? (
              <div className="mt-6 space-y-4">
                <div className="rounded-xl border px-4 py-3">
                  <p className="font-semibold">{DEMO_INBOX_CANDIDATE.name}</p>
                  <p className="text-sm text-[var(--twin-muted-strong)]">
                    {DEMO_INBOX_CANDIDATE.title} · {DEMO_INBOX_CANDIDATE.company}
                  </p>
                  <DemoMatchGauge score={DEMO_INBOX_CANDIDATE.matchScore} size="sm" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {REVIEW_CARD_SECTIONS.slice(0, 4).map((section) => {
                    const items = reviewCardSectionItems(DEMO_REVIEW_CARD, section);
                    if (items.length === 0) return null;
                    return (
                      <div key={section} className="rounded-lg border p-3 text-sm">
                        <p className="text-xs font-bold uppercase tracking-wider text-[var(--twin-accent)]">
                          {t(REVIEW_LABEL_KEYS[section])}
                        </p>
                        <ul className="mt-1 list-disc pl-4 text-[var(--twin-muted-strong)]">
                          {items.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-[var(--twin-muted)]">
                  {t(`recruiterInbox.${reviewCardDataConfidenceKey(DEMO_REVIEW_CARD.data_confidence)}` as TranslationKey)}
                </p>
              </div>
            ) : null}

            {step === 5 ? (
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="section-cta-primary twin-touch-target px-5 text-sm"
                  onClick={() => onDemoDecision("accept")}
                  disabled={decision !== "pending"}
                >
                  {t("recruiterInbox.accept")}
                </button>
                <button
                  type="button"
                  className="section-cta-secondary twin-touch-target px-5 text-sm"
                  onClick={() => onDemoDecision("decline")}
                  disabled={decision !== "pending"}
                >
                  {t("recruiterInbox.decline")}
                </button>
                {decision === "accepted" ? (
                  <p className="w-full text-sm font-medium text-[var(--twin-accent)]">
                    {t("interactiveDemo.acceptedOutcome")}
                  </p>
                ) : null}
                {decision === "declined" ? (
                  <p className="w-full text-sm text-[var(--twin-muted-strong)]">
                    {t("interactiveDemo.declinedOutcome")}
                  </p>
                ) : null}
              </div>
            ) : null}

            {step === 6 ? (
              <div className="demo-glass-panel mt-6 max-w-lg p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--twin-accent)]">
                  {t("demo.calendarHoldTitle")}
                </p>
                <p className="mt-2 text-lg font-semibold">
                  {DEMO_CALENDAR_SLOT.when} · {DEMO_CALENDAR_SLOT.duration}
                </p>
                <p className="text-sm text-[var(--twin-muted-strong)]">{DEMO_CALENDAR_SLOT.title}</p>
                <p className="mt-3 text-xs text-[var(--twin-muted)]">{t("interactiveDemo.calendarSimulation")}</p>
              </div>
            ) : null}

            {step === 7 ? (
              <div className="mt-6 flex flex-wrap gap-3">
                {isLoggedIn ? (
                  <Link href="/dashboard" className="section-cta-primary twin-touch-target px-6 text-sm">
                    {t("demo.ctaDashboard")}
                  </Link>
                ) : (
                  <>
                    <Link href="/register" className="section-cta-primary twin-touch-target px-6 text-sm">
                      {t("demo.ctaRegister")}
                    </Link>
                    <Link href="/waitlist" className="section-cta-secondary twin-touch-target px-5 text-sm">
                      {t("demo.ctaWishlist")}
                    </Link>
                  </>
                )}
                <Link href="/for-candidates" className="section-cta-secondary twin-touch-target px-5 text-sm">
                  {t("nav.forCandidates")}
                </Link>
              </div>
            ) : null}
          </article>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              className="section-cta-secondary twin-touch-target px-5 text-sm"
              onClick={goBack}
              disabled={step === 0}
            >
              {t("interactiveDemo.back")}
            </button>
            <button
              type="button"
              className="section-cta-primary twin-touch-target px-5 text-sm"
              onClick={goNext}
              disabled={step >= STEP_COUNT - 1}
            >
              {t("interactiveDemo.next")}
            </button>
          </div>

          <p className="max-w-3xl text-xs leading-relaxed text-[var(--twin-muted)]">{t("demo.footerNote")}</p>
        </div>
      </MarketingPageSurface>
    </Shell>
  );
}
