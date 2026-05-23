"use client";

/**
 * Demo UX patterns informed by common “AI apply” category framing (not copy):
 * — Staged timeline / checklist to completion (guided flows; e.g. LazyApply — https://www.lazyapply.com/ ).
 * — One primary action + replay (Simplify-style “autofill / copilot” simplicity — https://simplify.jobs/autofill ).
 * — Honest “simulation” when no live credentials (trust; contrasts with volume-only claims on comparison sites — e.g. https://useautoapply.com/compare/useautoapply-vs-lazyapply/ ).
 * — Before/after cognitive load: CV + one high-match role + single pipeline story.
 * — Score + status receipts as concrete proof points (ATS/autofill tools often surface counts or states similarly).
 */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

import { useTranslation } from "@/components/language-provider";
import { DemoAutoApplyTheater } from "@/components/marketing/demo-auto-apply-theater";
import { DemoLiveSnapshot } from "@/components/marketing/demo-live-snapshot";
import { DemoMatchGauge } from "@/components/marketing/demo-match-gauge";
import { LandingAmbient } from "@/components/marketing/landing-ambient";
import { MarketingPageSurface } from "@/components/marketing/marketing-page-surface";
import { Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import {
  DEMO_JOB_CARD,
  DEMO_MATCH_CANDIDATE,
  DEMO_MATCH_JOB,
  DEMO_MATCH_SCORE,
} from "@/lib/demo-auto-apply-data";
import { playDemoStepChime, playDemoSuccessChime } from "@/lib/demo-auto-apply-sound";
import {
  activeDemoStepIndex,
  advanceDemoStepStates,
  createInitialDemoStepStates,
  DEMO_MATCH_SCORE_START,
  DEMO_SEQUENCE_STEPS,
  DEMO_STEP_MS,
  jumpToDemoStepStates,
  type DemoPlayPhase,
  type DemoStepState,
} from "@/lib/demo-auto-apply-sequence";

type DemoApplyTarget = {
  job_id: number;
  title: string;
  company: string;
  job_board: string;
  external_id: string;
  url?: string | null;
};

type AutoApplyResult = {
  success: boolean;
  message: string;
  package_pdf_url?: string | null;
};

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

export function DemoAutoApplyPage() {
  const { t } = useTranslation();
  const [cvText, setCvText] = useState<string>("");
  const [cvError, setCvError] = useState(false);
  const [playPhase, setPlayPhase] = useState<DemoPlayPhase>("idle");
  const [stepStates, setStepStates] = useState<DemoStepState[]>(createInitialDemoStepStates);
  const [animatedScore, setAnimatedScore] = useState(DEMO_MATCH_SCORE_START);
  const [showConfetti, setShowConfetti] = useState(false);
  const [realApplying, setRealApplying] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [applyTarget, setApplyTarget] = useState<DemoApplyTarget | null>(null);
  const [applyTargetError, setApplyTargetError] = useState(false);
  const timersRef = useRef<number[]>([]);
  const scoreRafRef = useRef<number | null>(null);
  const theaterRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/demo/sample-cv.txt")
      .then((r) => (r.ok ? r.text() : Promise.reject()))
      .then((text) => {
        if (!cancelled) setCvText(text);
      })
      .catch(() => {
        if (!cancelled) {
          setCvError(true);
          setCvText(DEMO_MATCH_CANDIDATE.cv_text);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
    if (scoreRafRef.current !== null) {
      cancelAnimationFrame(scoreRafRef.current);
      scoreRafRef.current = null;
    }
  }, []);

  const animateMatchScore = useCallback(() => {
    if (scoreRafRef.current !== null) cancelAnimationFrame(scoreRafRef.current);
    const reduced =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setAnimatedScore(DEMO_MATCH_SCORE);
      return;
    }
    const start = performance.now();
    const from = DEMO_MATCH_SCORE_START;
    const to = DEMO_MATCH_SCORE;
    const duration = 1400;

    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setAnimatedScore(Math.round(from + (to - from) * easeOutCubic(p)));
      if (p < 1) {
        scoreRafRef.current = requestAnimationFrame(tick);
      } else {
        scoreRafRef.current = null;
        playDemoStepChime();
      }
    };
    scoreRafRef.current = requestAnimationFrame(tick);
  }, []);

  const runSequence = useCallback(() => {
    clearTimers();
    setPlayPhase("playing");
    setShowConfetti(false);
    setAnimatedScore(DEMO_MATCH_SCORE_START);
    const initial = createInitialDemoStepStates();
    initial[0] = "active";
    setStepStates(initial);
    playDemoStepChime();

    let tAccum = 0;
    DEMO_SEQUENCE_STEPS.forEach((_, idx) => {
      tAccum += DEMO_STEP_MS[idx] ?? 1500;
      const stepIdx = idx;
      const id = window.setTimeout(() => {
        setStepStates(() => {
          const next = createInitialDemoStepStates();
          for (let j = 0; j <= stepIdx; j += 1) next[j] = "done";
          if (stepIdx + 1 < next.length) next[stepIdx + 1] = "active";
          return next;
        });
        const nextActive = stepIdx + 1;
        if (nextActive === 1) animateMatchScore();
        else if (nextActive < DEMO_SEQUENCE_STEPS.length) playDemoStepChime();
      }, tAccum);
      timersRef.current.push(id);
    });

    const idDone = window.setTimeout(() => {
      setPlayPhase("done");
      setShowConfetti(true);
      playDemoSuccessChime();
      clearTimers();
    }, tAccum + 350);
    timersRef.current.push(idDone);
  }, [animateMatchScore, clearTimers]);

  const jumpToStep = useCallback(
    (idx: number) => {
      clearTimers();
      setShowConfetti(false);
      setStepStates(jumpToDemoStepStates(idx));
      setAnimatedScore(idx >= 1 ? DEMO_MATCH_SCORE : DEMO_MATCH_SCORE_START);
      setPlayPhase("idle");
    },
    [clearTimers],
  );

  const advanceManualStep = useCallback(() => {
    clearTimers();
    setShowConfetti(false);
    if (playPhase === "playing") setPlayPhase("idle");

    setStepStates((prev) => {
      const { states, completed } = advanceDemoStepStates(prev);
      const active = activeDemoStepIndex(states);
      if (active === 1) animateMatchScore();
      else if (active > 0) playDemoStepChime();
      if (completed) {
        setPlayPhase("done");
        setShowConfetti(true);
        playDemoSuccessChime();
      }
      return states;
    });
  }, [animateMatchScore, clearTimers, playPhase]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  useEffect(() => {
    const active = activeDemoStepIndex(stepStates);
    if (active < 0) return;
    const reduced =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    theaterRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "nearest" });
  }, [stepStates]);

  useEffect(() => {
    const token = getToken();
    setIsLoggedIn(Boolean(token));
    if (!token) {
      setApplyTarget(null);
      setApplyTargetError(false);
      return;
    }
    let cancelled = false;
    void apiFetch<DemoApplyTarget>("/api/v1/demo/apply-target", {}, token)
      .then((target) => {
        if (!cancelled) {
          setApplyTarget(target);
          setApplyTargetError(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setApplyTarget(null);
          setApplyTargetError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const runRealAutoApply = useCallback(async () => {
    const token = getToken();
    if (!token || !applyTarget) return;
    setRealApplying(true);
    try {
      const result = await apiFetch<AutoApplyResult>(
        "/api/v1/applications/auto-apply",
        {
          method: "POST",
          body: JSON.stringify({ job_id: applyTarget.job_id, human_acknowledged: true }),
        },
        token,
      );
      if (result.success) {
        toast.success(result.message);
        if (result.package_pdf_url) {
          window.open(result.package_pdf_url, "_blank", "noopener,noreferrer");
        }
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Auto-apply failed");
    } finally {
      setRealApplying(false);
    }
  }, [applyTarget]);

  const canRunLiveApply = isLoggedIn && applyTarget !== null;
  const playLabel =
    playPhase === "playing" ? t("demo.runningCta") : playPhase === "done" ? t("demo.replayCta") : t("demo.runCta");

  const skillsLine = DEMO_MATCH_CANDIDATE.skills.join(", ");
  const titlesLine = DEMO_MATCH_CANDIDATE.preferred_job_titles.join(", ");

  return (
    <Shell wide rail>
      <MarketingPageSurface wide withCard={false}>
        <div className="marketing-copy-rail space-y-10 sm:space-y-12">
          <header className="demo-hero relative overflow-hidden rounded-3xl border border-[var(--twin-border)]/60 px-5 py-8 sm:px-8 sm:py-10">
            <LandingAmbient />
            <motion.div className="demo-hero__grid pointer-events-none absolute inset-0" aria-hidden />
            <div className="relative space-y-4">
              <p className="demo-hero__eyebrow text-[10px] font-semibold uppercase tracking-[0.32em] text-[var(--twin-accent)]">
                {t("demo.pageEyebrow")}
              </p>
              <h1 className="marketing-gradient-heading max-w-4xl text-2xl font-semibold leading-tight tracking-[-0.03em] sm:text-3xl md:text-4xl lg:text-[2.65rem]">
                {t("demo.pageTitle")}
              </h1>
              <p className="max-w-3xl text-base leading-relaxed text-[var(--twin-muted-strong)] sm:text-lg">{t("demo.pageLead")}</p>
            </div>
          </header>

          <DemoLiveSnapshot />

          <aside className="demo-mode-pill flex flex-wrap items-start gap-3 px-4 py-3 sm:px-5" role="status">
            <span className="demo-mode-pill__dot mt-1.5 shrink-0" aria-hidden />
            <div className="min-w-0 flex-1 text-sm leading-relaxed">
              <p className="font-semibold text-[var(--foreground)]">{t("demo.simulationTitle")}</p>
              <p className="mt-1 text-[var(--twin-muted-strong)]">{t("demo.simulationBody")}</p>
            </div>
          </aside>

          {isLoggedIn ? (
            <aside
              className="rounded-2xl border border-[var(--twin-accent)]/35 bg-[var(--twin-accent-muted)]/40 px-4 py-3 text-sm leading-relaxed text-[var(--twin-muted-strong)]"
              role="status"
            >
              <p className="font-semibold text-[var(--foreground)]">{t("demo.liveApplyTitle")}</p>
              <p className="mt-1">{t("demo.liveApplyBody")}</p>
            </aside>
          ) : null}

          <div className="marketing-section-demo-actions flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={playPhase === "playing"}
              onClick={runSequence}
              className="section-cta-primary marketing-btn-primary-shadow twin-touch-target !w-auto min-w-[12rem] px-6 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            >
              {playLabel}
            </button>
            <button
              type="button"
              onClick={advanceManualStep}
              className="section-cta-secondary twin-touch-target min-w-[10rem] px-5 text-sm"
              aria-label={t("demo.nextStep")}
            >
              {t("demo.nextStep")}
            </button>
            {playPhase === "idle" ? (
              <Link href="/register" className="section-cta-secondary twin-touch-target px-5 text-sm">
                {t("demo.registerCta")}
              </Link>
            ) : null}
          </div>
          <p className="max-w-3xl text-xs leading-relaxed text-[var(--twin-muted)]">{t("demo.manualFlowHint")}</p>

          <div className="grid gap-6 lg:grid-cols-2">
            <section
              aria-labelledby="demo-cv-heading"
              className={`flex flex-col rounded-2xl border bg-[var(--twin-surface-raised)]/90 p-5 shadow-sm transition-all duration-500 sm:p-6 ${
                stepStates[2] === "active" ? "demo-theater-glow border-[var(--twin-accent)]/45" : "border-[var(--twin-border)]"
              }`}
            >
              <h2 id="demo-cv-heading" className="twin-section-title text-lg">
                {t("demo.cvPanelTitle")}
              </h2>
              <dl className="mt-4 space-y-2 text-sm text-[var(--twin-muted-strong)]">
                <div className="flex flex-wrap gap-2">
                  <dt className="font-semibold text-[var(--foreground)]">{t("demo.cvSkills")}</dt>
                  <dd>{skillsLine}</dd>
                </div>
                <div className="flex flex-wrap gap-2">
                  <dt className="font-semibold text-[var(--foreground)]">{t("demo.cvTitles")}</dt>
                  <dd>{titlesLine}</dd>
                </div>
                <div className="flex flex-wrap gap-2">
                  <dt className="font-semibold text-[var(--foreground)]">{t("demo.cvExperience")}</dt>
                  <dd>
                    {DEMO_MATCH_CANDIDATE.experience_years} {t("demo.cvYears")}
                  </dd>
                </div>
                <div className="flex flex-wrap gap-2">
                  <dt className="font-semibold text-[var(--foreground)]">{t("demo.cvSalary")}</dt>
                  <dd>{DEMO_MATCH_CANDIDATE.desired_salary} PLN</dd>
                </div>
                <div className="flex flex-wrap gap-2">
                  <dt className="font-semibold text-[var(--foreground)]">{t("demo.cvLocation")}</dt>
                  <dd className="capitalize">{DEMO_MATCH_CANDIDATE.location}</dd>
                </div>
              </dl>
              <h3 className="mt-6 text-xs font-bold uppercase tracking-wider text-[var(--twin-muted)]">{t("demo.cvDocument")}</h3>
              <div className="relative mt-2 max-h-[min(22rem,55vh)] overflow-y-auto rounded-xl border border-[var(--twin-border)] bg-[var(--twin-card)] p-4 font-mono text-xs leading-relaxed text-[var(--twin-muted-strong)]">
                {cvError ? (
                  <p className="text-amber-800 dark:text-amber-200">{t("demo.cvFallback")}</p>
                ) : cvText ? (
                  <pre className="whitespace-pre-wrap break-words">{cvText}</pre>
                ) : (
                  <p className="animate-pulse text-[var(--twin-muted)]">{t("demo.cvLoading")}</p>
                )}
              </div>
            </section>

            <section
              aria-labelledby="demo-job-heading"
              className={`flex flex-col rounded-2xl border bg-[var(--twin-card)]/80 p-5 shadow-sm transition-all duration-500 sm:p-6 ${
                stepStates[1] === "active" || stepStates[1] === "done"
                  ? "demo-theater-glow border-[var(--twin-accent)]/45"
                  : "border-[var(--twin-border)]"
              }`}
            >
              <h2 id="demo-job-heading" className="twin-section-title text-lg">
                {t("demo.jobPanelTitle")}
              </h2>
              <div className="mt-4 space-y-3 text-sm">
                <p className="text-base font-semibold text-[var(--foreground)]">{DEMO_MATCH_JOB.title}</p>
                <p className="text-[var(--twin-muted-strong)]">
                  {DEMO_JOB_CARD.company} · {DEMO_JOB_CARD.board}
                </p>
                <p className="text-[var(--twin-muted-strong)]">
                  {DEMO_MATCH_JOB.location} · {DEMO_JOB_CARD.salaryLabel}
                </p>
                <p className="leading-relaxed text-[var(--twin-muted-strong)]">{DEMO_MATCH_JOB.description}</p>
                <p className="text-xs leading-relaxed text-[var(--twin-muted)]">{DEMO_MATCH_JOB.requirements}</p>
              </div>
              <div className="mt-6 flex flex-wrap items-baseline gap-2 rounded-xl border border-[var(--twin-accent)]/35 bg-[var(--twin-accent-muted)]/40 px-4 py-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--twin-accent)]">{t("demo.matchBadge")}</span>
                <span className="text-3xl font-semibold tabular-nums text-[var(--foreground)]">{animatedScore}%</span>
                <span className="text-sm text-[var(--twin-muted-strong)]">{t("demo.matchHint")}</span>
              </div>
            </section>
          </div>

          <DemoAutoApplyTheater
            ref={theaterRef}
            playPhase={playPhase}
            stepStates={stepStates}
            animatedScore={animatedScore}
            showConfetti={showConfetti}
            onConfettiDone={() => setShowConfetti(false)}
            onJumpToStep={jumpToStep}
            isLoggedIn={isLoggedIn}
            canRunLiveApply={canRunLiveApply}
            realApplying={realApplying}
            applyTargetError={applyTargetError}
            onRunRealApply={() => void runRealAutoApply()}
          />

          <p className="max-w-3xl text-xs leading-relaxed text-[var(--twin-muted)]">{t("demo.footerNote")}</p>
        </div>
      </MarketingPageSurface>
    </Shell>
  );
}
