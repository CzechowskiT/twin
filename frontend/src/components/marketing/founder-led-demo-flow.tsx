"use client";

import Link from "next/link";
import { useCallback } from "react";

import { useTranslation } from "@/components/language-provider";
import { MarketingCrosslinksBand } from "@/components/marketing/marketing-crosslinks-band";
import { MarketingPageSurface } from "@/components/marketing/marketing-page-surface";
import { Shell } from "@/components/ui";
import {
  FOUNDER_LED_BOUNDARY_KEYS,
  FOUNDER_LED_DEMO_JOURNEY_STEPS,
  FOUNDER_LED_DEMO_ROLE_ENTRIES,
  resolveFounderLedDemoHref,
} from "@/lib/founder-led-demo-routes";

function scrollToInteractivePlayer(): void {
  const section = document.getElementById("interactive-story");
  if (!section) return;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  section.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  section.focus({ preventScroll: true });
  const playBtn = section.querySelector<HTMLButtonElement>("[data-demo-controls] button");
  playBtn?.focus({ preventScroll: true });
}

function DemoLinkCard({
  href,
  title,
  description,
  dataTestId,
}: {
  href: string;
  title: string;
  description: string;
  dataTestId: string;
}) {
  return (
    <Link
      href={href}
      data-founder-led-demo-link={dataTestId}
      className="group block rounded-xl border border-[var(--twin-border)] bg-[var(--twin-surface-elevated)] p-5 transition-colors hover:border-[var(--twin-accent)]/40 hover:bg-[var(--twin-surface-soft)]"
    >
      <h3 className="text-base font-semibold text-[var(--twin-fg)] group-hover:text-[var(--twin-accent)]">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-[var(--twin-muted-strong)]">{description}</p>
    </Link>
  );
}

/** Compact hero — interactive player sits directly below on first screen. */
export function FounderLedDemoHero() {
  const { t } = useTranslation();
  const onLaunchDemo = useCallback(() => scrollToInteractivePlayer(), []);

  return (
    <Shell wide rail>
      <MarketingPageSurface wide withCard={false}>
        <header className="marketing-copy-rail min-w-0 space-y-4 pb-2 sm:space-y-5" data-founder-led-demo="hero">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
            {t("founderLedDemo.pageEyebrow")}
          </p>
          <h1 className="twin-section-title text-2xl sm:text-3xl md:text-4xl">{t("founderLedDemo.pageTitle")}</h1>
          <p className="max-w-3xl text-base leading-relaxed text-[var(--twin-muted-strong)] sm:text-lg">
            {t("founderLedDemo.pageLead")}
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <button
              type="button"
              data-founder-led-demo-cta="launch"
              className="twin-btn-primary twin-touch-target"
              onClick={onLaunchDemo}
            >
              {t("founderLedDemo.heroCtaLaunch")}
            </button>
          </div>
          <MarketingCrosslinksBand page="demo" className="pt-2" />
        </header>
      </MarketingPageSurface>
    </Shell>
  );
}

/** Journey, role entries, and boundaries — below interactive player. */
export function FounderLedDemoBelowFold() {
  const { t } = useTranslation();

  return (
    <Shell wide rail>
      <MarketingPageSurface wide withCard={false}>
        <div className="marketing-copy-rail min-w-0 space-y-10 sm:space-y-14" data-founder-led-demo="root">
          <section className="space-y-5" data-founder-led-demo="journey">
            <h2 className="text-xl font-semibold text-[var(--twin-fg)] sm:text-2xl">
              {t("founderLedDemo.journeyHeading")}
            </h2>
            <p className="text-sm leading-relaxed text-[var(--twin-muted-strong)] sm:text-base">
              {t("founderLedDemo.journeyLead")}
            </p>
            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {FOUNDER_LED_DEMO_JOURNEY_STEPS.map((step, index) => (
                <DemoLinkCard
                  key={step.id}
                  dataTestId={step.id}
                  href={resolveFounderLedDemoHref(step)}
                  title={`${index + 1}. ${t(step.titleKey)}`}
                  description={t(step.descKey)}
                />
              ))}
            </div>
          </section>

          <section className="space-y-5" data-founder-led-demo="roles">
            <h2 className="text-xl font-semibold text-[var(--twin-fg)] sm:text-2xl">
              {t("founderLedDemo.rolesHeading")}
            </h2>
            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
              {FOUNDER_LED_DEMO_ROLE_ENTRIES.map((role) => (
                <DemoLinkCard
                  key={role.id}
                  dataTestId={role.id}
                  href={resolveFounderLedDemoHref(role)}
                  title={t(role.titleKey)}
                  description={t(role.descKey)}
                />
              ))}
            </div>
          </section>

          <section
            id="founder-led-boundaries"
            className="rounded-xl border border-[var(--twin-border)] bg-[var(--twin-surface-soft)] p-6 sm:p-8"
            data-founder-led-demo="boundaries"
          >
            <h2 className="text-xl font-semibold text-[var(--twin-fg)]">{t("founderLedDemo.boundariesHeading")}</h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--twin-muted-strong)] sm:text-base">
              {t("founderLedDemo.boundariesLead")}
            </p>
            <ul className="mt-5 space-y-3">
              {FOUNDER_LED_BOUNDARY_KEYS.map((key) => (
                <li key={key} className="flex gap-3 text-sm leading-relaxed text-[var(--twin-fg)] sm:text-base">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--twin-accent)]" aria-hidden />
                  {t(key)}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-base font-medium text-[var(--twin-fg)]">{t("founderLedDemo.closingStatement")}</p>
          </section>
        </div>
      </MarketingPageSurface>
    </Shell>
  );
}

/** @deprecated Use FounderLedDemoHero + FounderLedDemoBelowFold on /demo. */
export function FounderLedDemoFlow() {
  return (
    <>
      <FounderLedDemoHero />
      <FounderLedDemoBelowFold />
    </>
  );
}
