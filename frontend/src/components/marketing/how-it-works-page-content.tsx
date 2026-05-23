"use client";

import { useTranslation } from "@/components/language-provider";
import { MarketingSectionCtas } from "@/components/marketing/marketing-section-ctas";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";
import type { TranslationKey } from "@/lib/i18n";
import type { ReactNode } from "react";

function StepIcon({ kind }: { kind: "profile" | "match" | "apply" | "calendar" }) {
  const paths: Record<typeof kind, ReactNode> = {
    profile: (
      <path
        d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM6 20v-1a6 6 0 0 1 12 0v1"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
    ),
    match: (
      <path
        d="M12 3l2.4 4.9 5.4.8-3.9 3.8.9 5.3L12 15.8 7.2 17.8l.9-5.3-3.9-3.8 5.4-.8L12 3z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinejoin="round"
      />
    ),
    apply: (
      <path
        d="M8 6h8l-1 10H9L8 6zm2 12a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm6 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinejoin="round"
      />
    ),
    calendar: (
      <>
        <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M4 9h16M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </>
    ),
  };
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--twin-border)] bg-[var(--twin-accent-muted)]/40 text-[var(--twin-accent)]">
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        {paths[kind]}
      </svg>
    </span>
  );
}

const STEPS = [
  { icon: "profile" as const, n: 1 },
  { icon: "match" as const, n: 2 },
  { icon: "apply" as const, n: 3 },
  { icon: "calendar" as const, n: 4 },
];

const WITHOUT_KEYS = ["contrastWithout1", "contrastWithout2", "contrastWithout3", "contrastWithout4"] as const;
const WITH_KEYS = ["contrastWith1", "contrastWith2", "contrastWith3", "contrastWith4"] as const;

function TimelineBeat({ when, title, body, isLast }: { when: string; title: string; body: string; isLast: boolean }) {
  return (
    <div className={`flex gap-5 sm:gap-8 ${isLast ? "" : "pb-10 sm:pb-12"}`}>
      <div className="flex w-6 shrink-0 flex-col items-center pt-1 sm:w-8">
        <span className="h-3 w-3 rounded-full border-2 border-[var(--twin-accent)] bg-[var(--background)] shadow-sm ring-2 ring-[var(--twin-accent-muted)]/60" />
        {!isLast ? <span className="mt-3 min-h-[2.5rem] w-px flex-1 bg-[var(--twin-border)]" aria-hidden /> : null}
      </div>
      <div className="min-w-0 pb-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--twin-accent)]">{when}</p>
        <h3 className="mt-2 text-lg font-semibold tracking-[-0.02em] text-[var(--foreground)] sm:text-xl">{title}</h3>
        <p className="mt-2 text-sm font-medium leading-relaxed text-[var(--twin-muted-strong)] sm:text-base">{body}</p>
      </div>
    </div>
  );
}

/** Rich walkthrough: contrast, steps, mini timeline, closing CTAs. */
export function HowItWorksPageContent() {
  const { t } = useTranslation();

  return (
    <div className="marketing-copy-rail space-y-16 sm:space-y-20">
      <ScrollReveal>
        <section aria-labelledby="hiw-contrast-title" className="text-start">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
            {t("marketingHowItWorks.contrastEyebrow")}
          </p>
          <h2 id="hiw-contrast-title" className="twin-section-title mt-3 max-w-3xl text-xl sm:text-2xl">
            {t("marketingHowItWorks.contrastTitle")}
          </h2>
          <div className="not-prose mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-[var(--twin-border)] bg-[var(--twin-surface-raised)]/90 p-5 sm:p-6">
              <h3 className="text-base font-semibold text-[var(--twin-muted-strong)]">{t("marketingHowItWorks.withoutTitle")}</h3>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-[var(--twin-muted-strong)]">
                {WITHOUT_KEYS.map((key) => (
                  <li key={key} className="flex gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--twin-muted)]" aria-hidden />
                    {t(`marketingHowItWorks.${key}` as TranslationKey)}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-[var(--twin-accent)]/40 bg-[var(--twin-accent-muted)]/35 p-5 sm:p-6 shadow-[inset_0_1px_0_rgb(255_255_255_/0.25)]">
              <h3 className="text-base font-semibold text-[var(--foreground)]">{t("marketingHowItWorks.withTitle")}</h3>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-[var(--twin-muted-strong)]">
                {WITH_KEYS.map((key) => (
                  <li key={key} className="flex gap-3">
                    <span className="mt-0.5 shrink-0 text-[var(--twin-accent)]" aria-hidden>
                      ✓
                    </span>
                    {t(`marketingHowItWorks.${key}` as TranslationKey)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </ScrollReveal>

      <section aria-labelledby="hiw-steps-title" className="text-start">
        <ScrollReveal>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
            {t("marketingHowItWorks.stepsEyebrow")}
          </p>
          <h2 id="hiw-steps-title" className="twin-section-title mt-3 max-w-3xl text-xl sm:text-2xl">
            {t("marketingHowItWorks.stepsTitle")}
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[var(--twin-muted-strong)] sm:text-base">
            {t("marketingHowItWorks.stepsLead")}
          </p>
        </ScrollReveal>

        <ol className="landing-how-timeline mt-10 flex list-none gap-4 overflow-x-auto p-0 pb-2 [-webkit-overflow-scrolling:touch] sm:mt-12 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 lg:grid-cols-4">
          {STEPS.map(({ icon, n }, i) => (
            <li key={n} className="min-w-[15rem] flex-1 sm:min-w-0">
              <ScrollReveal delayMs={60 + i * 50} className="h-full">
                <div className="landing-how-step relative flex h-full flex-col rounded-2xl border border-[var(--twin-border)]/80 bg-[var(--twin-surface-raised)]/50 p-5 backdrop-blur-sm">
                  {i < STEPS.length - 1 ? (
                    <span
                      className="landing-how-connector absolute end-0 top-9 hidden h-px w-[calc(50%+1rem)] translate-x-1/2 bg-gradient-to-r from-[var(--twin-accent)]/50 to-transparent lg:block"
                      aria-hidden
                    />
                  ) : null}
                  <div className="flex items-center gap-3">
                    <StepIcon kind={icon} />
                    <span className="font-mono text-[11px] font-medium text-[var(--twin-muted)]">0{n}</span>
                  </div>
                  <h3 className="mt-4 text-base font-semibold tracking-[-0.02em]">
                    {t(`marketingHowItWorks.step${n}Title` as TranslationKey)}
                  </h3>
                  <p className="mt-2 text-sm leading-snug text-[var(--twin-muted-strong)]">
                    {t(`marketingHowItWorks.step${n}Line` as TranslationKey)}
                  </p>
                  <p className="mt-auto border-t border-[var(--twin-border)]/60 pt-3 text-xs font-medium leading-snug text-[var(--twin-accent)]">
                    {t(`marketingHowItWorks.step${n}Outcome` as TranslationKey)}
                  </p>
                </div>
              </ScrollReveal>
            </li>
          ))}
        </ol>
      </section>

      <ScrollReveal>
        <section aria-labelledby="hiw-timeline-title" className="text-start">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
            {t("marketingHowItWorks.timelineEyebrow")}
          </p>
          <h2 id="hiw-timeline-title" className="twin-section-title mt-3 max-w-3xl text-xl sm:text-2xl">
            {t("marketingHowItWorks.timelineTitle")}
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[var(--twin-muted-strong)] sm:text-base">
            {t("marketingHowItWorks.timelineLead")}
          </p>

          <div className="relative mt-8 rounded-2xl border border-[var(--twin-border)]/55 bg-gradient-to-b from-[var(--twin-accent-muted)]/18 to-transparent px-5 py-8 shadow-[inset_0_1px_0_rgb(255_255_255_/0.35)] sm:mt-10 sm:px-8 sm:py-10">
            <TimelineBeat
              when={t("marketingHowItWorks.timeline1When")}
              title={t("marketingHowItWorks.timeline1Title")}
              body={t("marketingHowItWorks.timeline1Body")}
              isLast={false}
            />
            <TimelineBeat
              when={t("marketingHowItWorks.timeline2When")}
              title={t("marketingHowItWorks.timeline2Title")}
              body={t("marketingHowItWorks.timeline2Body")}
              isLast={false}
            />
            <TimelineBeat
              when={t("marketingHowItWorks.timeline3When")}
              title={t("marketingHowItWorks.timeline3Title")}
              body={t("marketingHowItWorks.timeline3Body")}
              isLast
            />
          </div>
        </section>
      </ScrollReveal>

      <ScrollReveal>
        <section
          aria-labelledby="hiw-cta-title"
          className="rounded-2xl border border-[var(--twin-accent)]/35 bg-[var(--twin-accent-muted)]/30 px-5 py-8 text-center sm:px-8 sm:py-10"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
            {t("marketingHowItWorks.ctaBandEyebrow")}
          </p>
          <h2 id="hiw-cta-title" className="mx-auto mt-3 max-w-2xl text-xl font-semibold tracking-[-0.02em] sm:text-2xl">
            {t("marketingHowItWorks.ctaBandTitle")}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-[var(--twin-muted-strong)]">{t("marketingHowItWorks.ctaBandMicro")}</p>
          <MarketingSectionCtas
            className="justify-center pt-4"
            primaryHref="/register/candidate"
            primaryLabel={t("marketingHowItWorks.ctaBandSignup")}
            secondaryHref="/demo"
            secondaryLabel={t("marketingHowItWorks.ctaBandDemo")}
          />
        </section>
      </ScrollReveal>
    </div>
  );
}
