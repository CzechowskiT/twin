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

import { useTranslation } from "@/components/language-provider";
import { MarketingPageSurface } from "@/components/marketing/marketing-page-surface";
import { ButtonCta, Shell } from "@/components/ui";
import {
  DEMO_JOB_CARD,
  DEMO_MATCH_CANDIDATE,
  DEMO_MATCH_JOB,
  DEMO_MATCH_SCORE,
} from "@/lib/demo-auto-apply-data";
import type { TranslationKey } from "@/lib/i18n";

const STEP_KEYS = [
  "demo.stepScan",
  "demo.stepMatch",
  "demo.stepAnswers",
  "demo.stepSubmit",
  "demo.stepConfirm",
] as const satisfies readonly TranslationKey[];

const STEP_MS = [900, 1100, 1000, 1200, 900];

type StepState = "pending" | "active" | "done";

export function DemoAutoApplyPage() {
  const { t } = useTranslation();
  const [cvText, setCvText] = useState<string>("");
  const [cvError, setCvError] = useState(false);
  const [running, setRunning] = useState(false);
  const [stepStates, setStepStates] = useState<StepState[]>(() => STEP_KEYS.map(() => "pending"));
  const timersRef = useRef<number[]>([]);

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
  }, []);

  const runSequence = useCallback(() => {
    clearTimers();
    setRunning(true);
    setStepStates(STEP_KEYS.map(() => "pending"));

    let tAccum = 0;
    STEP_KEYS.forEach((_, idx) => {
      const startDelay = tAccum;
      const id1 = window.setTimeout(() => {
        setStepStates((prev) => {
          const next = [...prev];
          for (let j = 0; j < idx; j += 1) next[j] = "done";
          next[idx] = "active";
          for (let j = idx + 1; j < next.length; j += 1) next[j] = "pending";
          return next;
        });
      }, startDelay);
      timersRef.current.push(id1);

      tAccum += STEP_MS[idx] ?? 900;
      const id2 = window.setTimeout(() => {
        setStepStates((prev) => {
          const next = [...prev];
          next[idx] = "done";
          return next;
        });
      }, tAccum);
      timersRef.current.push(id2);
    });

    const idDone = window.setTimeout(() => {
      setRunning(false);
      clearTimers();
    }, tAccum + 400);
    timersRef.current.push(idDone);
  }, [clearTimers]);

  const jumpToStep = useCallback(
    (idx: number) => {
      clearTimers();
      setRunning(false);
      setStepStates(STEP_KEYS.map((_, i) => (i < idx ? "done" : i === idx ? "active" : "pending")));
    },
    [clearTimers],
  );

  const advanceManualStep = useCallback(() => {
    clearTimers();
    setRunning(false);
    setStepStates((prev) => {
      const next = [...prev];
      const active = next.indexOf("active");
      if (active >= 0) {
        next[active] = "done";
        if (active + 1 < next.length) {
          next[active + 1] = "active";
        }
        return next;
      }
      const firstP = next.indexOf("pending");
      if (firstP >= 0) {
        for (let j = 0; j < firstP; j += 1) next[j] = "done";
        next[firstP] = "active";
        return next;
      }
      return next;
    });
  }, [clearTimers]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const skillsLine = DEMO_MATCH_CANDIDATE.skills.join(", ");
  const titlesLine = DEMO_MATCH_CANDIDATE.preferred_job_titles.join(", ");

  return (
    <Shell wide rail>
      <MarketingPageSurface wide withCard={false}>
        <div className="marketing-copy-rail space-y-10 sm:space-y-12">
          <header className="space-y-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
              {t("demo.pageEyebrow")}
            </p>
            <h1 className="twin-page-intro twin-section-title max-w-4xl text-2xl sm:text-3xl md:text-4xl">{t("demo.pageTitle")}</h1>
            <p className="max-w-3xl text-base leading-relaxed text-[var(--twin-muted-strong)] sm:text-lg">{t("demo.pageLead")}</p>
          </header>

          <aside
            className="rounded-2xl border border-amber-200/90 bg-amber-50/95 px-4 py-3 text-sm leading-relaxed text-amber-950 shadow-sm"
            role="status"
          >
            <p className="font-semibold text-amber-950">{t("demo.simulationTitle")}</p>
            <p className="mt-1 text-amber-900/95">{t("demo.simulationBody")}</p>
          </aside>

          <div className="flex flex-wrap items-center gap-3">
            <ButtonCta type="button" disabled={running} onClick={runSequence} className="!w-auto min-w-[12rem] px-6">
              {running ? t("demo.runningCta") : t("demo.runCta")}
            </ButtonCta>
            <button
              type="button"
              onClick={advanceManualStep}
              className="twin-touch-target inline-flex min-h-[2.75rem] min-w-[10rem] items-center justify-center rounded-full border border-[var(--twin-border)] bg-[var(--twin-card)] px-5 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--twin-border-hover)] hover:bg-[var(--twin-accent-muted)] active:scale-[0.98]"
            >
              {t("demo.nextStep")}
            </button>
            <Link
              href="/register"
              className="twin-touch-target inline-flex min-h-[2.75rem] items-center justify-center rounded-full border border-[var(--twin-border)] bg-[var(--twin-card)] px-5 text-sm font-semibold text-[var(--twin-muted-strong)] transition hover:border-[var(--twin-border-hover)] hover:bg-[var(--twin-accent-muted)] active:scale-[0.98]"
            >
              {t("demo.registerCta")}
            </Link>
          </div>
          <p className="max-w-3xl text-xs leading-relaxed text-[var(--twin-muted)]">{t("demo.manualFlowHint")}</p>

          <div className="grid gap-6 lg:grid-cols-2">
            <section
              aria-labelledby="demo-cv-heading"
              className="flex flex-col rounded-2xl border border-[var(--twin-border)] bg-[var(--twin-surface-raised)]/90 p-5 shadow-sm transition-shadow duration-300 hover:shadow-md sm:p-6"
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
              className="flex flex-col rounded-2xl border border-[var(--twin-border)] bg-[var(--twin-card)]/80 p-5 shadow-sm transition-shadow duration-300 hover:shadow-md sm:p-6"
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
                <span className="text-3xl font-semibold tabular-nums text-[var(--foreground)]">{DEMO_MATCH_SCORE}%</span>
                <span className="text-sm text-[var(--twin-muted-strong)]">{t("demo.matchHint")}</span>
              </div>
            </section>
          </div>

          <section aria-labelledby="demo-flow-heading" className="space-y-4">
            <h2 id="demo-flow-heading" className="twin-section-title text-lg sm:text-xl">
              {t("demo.flowTitle")}
            </h2>
            <ol className="space-y-0">
              {STEP_KEYS.map((key, idx) => {
                const state = stepStates[idx] ?? "pending";
                return (
                  <li key={key} className={idx === STEP_KEYS.length - 1 ? "" : "pb-5"}>
                    <button
                      type="button"
                      onClick={() => jumpToStep(idx)}
                      className={`flex w-full gap-3 rounded-xl border border-transparent p-2 text-left transition-all duration-500 ease-out sm:gap-4 ${
                        state === "pending" ? "opacity-55 hover:border-[var(--twin-border)]/60 hover:bg-[var(--twin-surface-raised)]/50" : "opacity-100"
                      }`}
                    >
                      <span
                        className={`mt-1.5 h-3 w-3 shrink-0 rounded-full border-2 transition-transform duration-300 ${
                          state === "done"
                            ? "scale-100 border-[var(--twin-accent)] bg-[var(--twin-accent)]"
                            : state === "active"
                              ? "scale-110 border-[var(--twin-cta)] bg-[var(--twin-cta)] shadow-[0_0_0_4px_rgb(217_119_6_/0.25)]"
                              : "border-[var(--twin-border)] bg-[var(--twin-card)]"
                        }`}
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[var(--foreground)]">{t(key)}</p>
                        <p className="mt-1 text-xs text-[var(--twin-muted)]">
                          {state === "done"
                            ? t("demo.stepDone")
                            : state === "active"
                              ? t("demo.stepActive")
                              : t("demo.stepPending")}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>

          <p className="max-w-3xl text-xs leading-relaxed text-[var(--twin-muted)]">{t("demo.footerNote")}</p>
        </div>
      </MarketingPageSurface>
    </Shell>
  );
}
