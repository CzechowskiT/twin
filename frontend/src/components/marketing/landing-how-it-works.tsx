"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { useTranslation } from "@/components/language-provider";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";
import type { TranslationKey } from "@/lib/i18n";

function StepIcon({ kind }: { kind: "connect" | "match" | "track" | "auto" }) {
  const paths: Record<typeof kind, ReactNode> = {
    connect: (
      <path
        d="M8 12h8M12 8v8M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
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
    track: (
      <>
        <path d="M5 17V9M12 17V5M19 17v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M4 17h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </>
    ),
    auto: (
      <path
        d="M8 6h8l-1 10H9L8 6zm2 12a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm6 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinejoin="round"
      />
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
  { icon: "connect" as const, n: 1 },
  { icon: "match" as const, n: 2 },
  { icon: "track" as const, n: 3 },
  { icon: "auto" as const, n: 4 },
];

export function LandingHowItWorks() {
  const { t } = useTranslation();

  return (
    <section className="border-t border-[var(--twin-border)]/60 py-16 sm:py-20 md:py-24" aria-labelledby="landing-how-heading">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <ScrollReveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-muted)]">
                {t("home.howEyebrow")}
              </p>
              <h2 id="landing-how-heading" className="mt-2 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
                {t("home.howTitle")}
              </h2>
            </div>
            <Link href="/how-it-works" className="text-sm font-semibold text-[var(--twin-accent)] hover:underline">
              {t("home.howDetailLink")} →
            </Link>
          </div>
        </ScrollReveal>

        <ol className="landing-how-timeline mt-10 flex list-none gap-4 overflow-x-auto p-0 pb-2 [-webkit-overflow-scrolling:touch] sm:mt-12 sm:grid sm:grid-cols-4 sm:overflow-visible sm:pb-0">
          {STEPS.map(({ icon, n }, i) => (
            <li key={n} className="min-w-[11.5rem] flex-1 sm:min-w-0">
              <ScrollReveal delayMs={60 + i * 50} className="h-full">
                <div className="landing-how-step relative flex h-full flex-col rounded-2xl border border-[var(--twin-border)]/80 bg-[var(--twin-surface-raised)]/50 p-5 backdrop-blur-sm">
                  {i < STEPS.length - 1 ? (
                    <span
                      className="landing-how-connector absolute end-0 top-9 hidden h-px w-[calc(50%+1rem)] translate-x-1/2 bg-gradient-to-r from-[var(--twin-accent)]/50 to-transparent sm:block"
                      aria-hidden
                    />
                  ) : null}
                  <div className="flex items-center gap-3">
                    <StepIcon kind={icon} />
                    <span className="font-mono text-[11px] font-medium text-[var(--twin-muted)]">0{n}</span>
                  </div>
                  <h3 className="mt-4 text-base font-semibold tracking-[-0.02em]">
                    {t(`home.howStep${n}Title` as TranslationKey)}
                  </h3>
                  <p className="mt-2 text-sm leading-snug text-[var(--twin-muted-strong)]">
                    {t(`home.howStep${n}Line` as TranslationKey)}
                  </p>
                </div>
              </ScrollReveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
