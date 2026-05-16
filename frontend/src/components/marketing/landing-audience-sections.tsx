"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import { Card } from "@/components/ui";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";

/** Three product lanes on the home page: deep links to dedicated marketing + pricing surfaces. */
export function LandingAudienceSections() {
  const { t } = useTranslation();

  const columns = [
    {
      id: "for-candidates" as const,
      title: t("home.audienceCandidateTitle"),
      body: t("home.audienceCandidateBody"),
      cta: t("home.audienceCandidateCta"),
      href: "/for-candidates#growth-post-offer" as const,
      variant: "default" as const,
    },
    {
      id: "for-recruiters" as const,
      title: t("home.audienceRecruiterTitle"),
      body: t("home.audienceRecruiterBody"),
      cta: t("home.audienceRecruiterCta"),
      href: "/for-recruiters" as const,
      variant: "default" as const,
    },
    {
      id: "for-b2b" as const,
      title: t("home.audienceB2bTitle"),
      body: t("home.audienceB2bBody"),
      cta: t("home.audienceB2bCta"),
      href: "/for-companies" as const,
      variant: "accent" as const,
    },
  ];

  return (
    <section
      id="audiences"
      className="scroll-mt-24 border-t border-[var(--twin-border)] bg-gradient-to-b from-[var(--twin-accent-muted)]/35 via-[var(--background)] to-[var(--background)] py-20 sm:py-24 md:py-28"
      aria-labelledby="audiences-title"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <ScrollReveal delayMs={0}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-muted-strong)]">
            {t("home.audienceEyebrow")}
          </p>
          <h2
            id="audiences-title"
            className="mt-3 max-w-3xl text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)] sm:text-3xl md:text-4xl"
          >
            {t("home.audienceTitle")}
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-[var(--twin-muted-strong)] sm:text-lg">
            {t("home.audienceLead")}
          </p>
        </ScrollReveal>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {columns.map((col, i) => (
            <ScrollReveal key={col.id} delayMs={40 + i * 40}>
              <Card id={col.id} variant={col.variant === "accent" ? "accent" : "default"} className="mb-0 flex h-full flex-col !p-5 sm:mb-0 sm:!p-6">
                <h3 className="text-lg font-semibold tracking-tight text-[var(--foreground)] sm:text-xl">{col.title}</h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-[var(--foreground)] sm:text-[15px]">{col.body}</p>
                <Link
                  href={col.href}
                  className={
                    col.variant === "accent"
                      ? "marketing-btn-primary-shadow twin-touch-target mt-6 inline-flex min-h-[2.75rem] w-full items-center justify-center rounded-full bg-[var(--twin-cta)] px-4 text-center text-sm font-semibold text-white transition hover:bg-[var(--twin-cta-hover)] active:scale-[0.98]"
                      : "twin-touch-target mt-6 inline-flex min-h-[2.75rem] w-full items-center justify-center rounded-full border border-[var(--twin-border)] bg-[var(--twin-card)] px-4 text-center text-sm font-semibold text-[var(--twin-muted-strong)] shadow-sm transition hover:border-[var(--twin-border-hover)] hover:bg-[var(--twin-accent-muted)] active:scale-[0.98]"
                  }
                >
                  {col.cta}
                </Link>
              </Card>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
