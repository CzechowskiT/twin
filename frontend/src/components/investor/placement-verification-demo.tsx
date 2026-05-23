"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import type { TranslationKey } from "@/lib/i18n";

const DEMO_EVENTS = [
  {
    type: "placement.declared",
    labelKey: "placementDemo.eventDeclaredLabel",
    descKey: "placementDemo.eventDeclaredDesc",
    atKey: "placementDemo.eventDeclaredAt",
    actorKey: "placementDemo.actorCandidate",
    Icon: IconDeclare,
  },
  {
    type: "placement.verify_email_sent",
    labelKey: "placementDemo.eventVerifyEmailLabel",
    descKey: "placementDemo.eventVerifyEmailDesc",
    atKey: "placementDemo.eventVerifyEmailAt",
    actorKey: "placementDemo.actorSystem",
    Icon: IconMail,
  },
  {
    type: "placement.verified",
    labelKey: "placementDemo.eventVerifiedLabel",
    descKey: "placementDemo.eventVerifiedDesc",
    atKey: "placementDemo.eventVerifiedAt",
    actorKey: "placementDemo.actorSystem",
    Icon: IconVerified,
  },
] as const;

function IconDeclare({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6M22 11h-6" />
    </svg>
  );
}

function IconMail({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function IconVerified({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

/** Investor-facing illustration of append-only placement verification (matches seeded demo). */
export function PlacementVerificationDemo() {
  const { t } = useTranslation();

  return (
    <div className="space-y-8">
      <p className="twin-muted max-w-2xl text-sm leading-relaxed sm:text-base">{t("placementDemo.lead")}</p>

      <section
        aria-labelledby="placement-verification-timeline-heading"
        className="placement-verification-timeline relative overflow-hidden rounded-2xl border border-[var(--twin-border)]/60 bg-gradient-to-b from-[var(--twin-accent-muted)]/12 to-[var(--twin-surface-raised)]/80 p-5 shadow-[inset_0_1px_0_rgb(255_255_255_/0.04)] sm:p-7"
      >
        <h2 id="placement-verification-timeline-heading" className="sr-only">
          {t("placementDemo.timelineAriaLabel")}
        </h2>

        <ol className="relative space-y-0" aria-label={t("placementDemo.timelineAriaLabel")}>
          {DEMO_EVENTS.map((ev, idx) => {
            const isLast = idx === DEMO_EVENTS.length - 1;
            const label = t(ev.labelKey as TranslationKey);
            const desc = t(ev.descKey as TranslationKey);
            const at = t(ev.atKey as TranslationKey);
            const actor = t(ev.actorKey as TranslationKey);

            return (
              <li
                key={ev.type}
                className={`placement-verification-step relative flex gap-4 sm:gap-5 ${isLast ? "" : "pb-8 sm:pb-10"}`}
                style={{ animationDelay: `${idx * 90}ms` }}
                aria-label={`${label}. ${desc}`}
              >
                <div className="relative flex w-10 shrink-0 flex-col items-center sm:w-11">
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[var(--twin-accent)] bg-[var(--twin-accent-muted)]/70 text-[var(--twin-accent)] shadow-sm ring-2 ring-[var(--twin-accent)]/15 sm:h-11 sm:w-11"
                    aria-hidden
                  >
                    <ev.Icon className="h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem]" />
                  </span>
                  {!isLast ? (
                    <span
                      className="placement-verification-rail mt-3 w-0.5 flex-1 min-h-[2rem] rounded-full bg-gradient-to-b from-[var(--twin-accent)]/70 to-[var(--twin-border)]/80"
                      aria-hidden
                    />
                  ) : null}
                </div>

                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--twin-accent)]">{at}</p>
                    <span className="inline-flex items-center rounded-full border border-[var(--twin-accent)]/25 bg-[var(--twin-accent-muted)]/35 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--twin-accent-hover)]">
                      {t("placementDemo.statusDone")}
                    </span>
                  </div>

                  <h3 className="mt-2 text-base font-semibold tracking-[-0.02em] text-[var(--foreground)] sm:text-lg">
                    {label}
                  </h3>

                  <p className="mt-1.5 text-sm leading-relaxed text-[var(--twin-muted-strong)]">{desc}</p>

                  <div className="mt-3 rounded-xl border border-[var(--twin-border)]/55 bg-[var(--twin-card)]/60 px-3 py-2.5 sm:px-4">
                    <p className="font-mono text-[11px] font-medium text-[var(--twin-accent)]">{ev.type}</p>
                    <p className="mt-1 text-xs text-[var(--twin-muted)]">
                      {t("placementDemo.actor")}: {actor}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="twin-muted max-w-xl text-xs leading-relaxed sm:text-sm">{t("placementDemo.ctaHint")}</p>
        <Link
          href="/login"
          className="inline-flex shrink-0 items-center justify-center rounded-xl border border-[var(--twin-accent)]/40 bg-[var(--twin-accent-muted)]/45 px-4 py-2.5 text-sm font-semibold text-[var(--twin-accent-hover)] transition hover:border-[var(--twin-accent)]/70 hover:bg-[var(--twin-accent-muted)]/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--twin-accent)]"
        >
          {t("placementDemo.loginDemo")} →
        </Link>
      </div>
    </div>
  );
}
