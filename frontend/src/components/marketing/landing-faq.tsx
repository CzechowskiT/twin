"use client";

import Link from "next/link";
import { useTranslation } from "@/components/language-provider";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";

/** Fluently-style numbered Q&A: calm disclosure rows, no extra dependencies. */
export function LandingFaq() {
  const { t } = useTranslation();
  const items = [
    { id: "01", q: t("home.faq01Q"), a: t("home.faq01A") },
    { id: "02", q: t("home.faq02Q"), a: t("home.faq02A") },
    { id: "03", q: t("home.faq03Q"), a: t("home.faq03A") },
    { id: "04", q: t("home.faq04Q"), a: t("home.faq04A") },
  ];

  return (
    <section className="border-t border-[var(--twin-border)] py-20 sm:py-24 md:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <ScrollReveal delayMs={40}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-muted)]">{t("home.faqEyebrow")}</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)] sm:text-3xl">{t("home.faqTitle")}</h2>
          <div className="mt-10 divide-y divide-[var(--twin-border)] overflow-hidden rounded-2xl border border-[var(--twin-border)] bg-[var(--twin-card)] shadow-[var(--twin-shadow)]">
            {items.map((item) => (
              <details key={item.id} className="group border-0 border-[var(--twin-border)] bg-transparent">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-5 py-4 text-left transition hover:bg-teal-50/40 sm:px-6 sm:py-5 [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0">
                    <span className="font-mono text-xs font-semibold text-[var(--twin-accent)]">{item.id}</span>
                    <span className="mt-1 block text-base font-semibold text-[var(--foreground)] sm:text-lg">{item.q}</span>
                  </span>
                  <span
                    className="mt-1 shrink-0 text-lg leading-none text-[var(--twin-muted)] transition group-open:rotate-45"
                    aria-hidden
                  >
                    +
                  </span>
                </summary>
                <div className="border-t border-[var(--twin-border)]/80 px-5 pb-5 pt-3 text-sm leading-relaxed text-[var(--twin-muted)] sm:px-6 sm:text-[15px]">
                  <p>{item.a}</p>
                  {item.id === "04" ? (
                    <p className="mt-3">
                      <Link href="/privacy" className="twin-link font-medium">
                        {t("home.faqPrivacyLink")}
                      </Link>
                    </p>
                  ) : null}
                </div>
              </details>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
