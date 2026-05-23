"use client";

import Link from "next/link";
import { useTranslation } from "@/components/language-provider";
import { FaqPanel } from "@/components/marketing/faq-panel";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";
import { FAQ_INVESTOR_HREF } from "@/lib/faq-anchor";
import {
  FAQ_SECTIONS,
  FAQ_TOTAL_QUESTIONS,
  faqSectionLabelKey,
  type FaqSectionId,
} from "@/lib/faq-messages";

const PERSONA_SECTIONS: FaqSectionId[] = ["candidates", "recruiters", "companies", "investors"];

function faqCountCopy(template: string): string {
  return template.replace("{count}", String(FAQ_TOTAL_QUESTIONS));
}

/** Home FAQ: general teaser, one Q per persona, CTA to full /faq. */
export function LandingFaq() {
  const { t } = useTranslation();

  return (
    <section className="border-t border-[var(--twin-border)] py-20 sm:py-24 md:py-28">
      <div className="marketing-home-rail">
        <ScrollReveal delayMs={40}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-muted)]">{t("home.faqEyebrow")}</p>
          <h2 className="marketing-home-headline mt-3 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)] sm:text-3xl">{t("home.faqTitle")}</h2>
          <p className="marketing-home-lede mt-3 text-sm leading-relaxed text-[var(--twin-muted-strong)]">
            {faqCountCopy(t("faq.homeTeaserLead"))}
          </p>

          <div className="mt-6 flex flex-wrap gap-2" aria-label={t("home.faqTitle")}>
            {FAQ_SECTIONS.map((sec) => (
              <Link
                key={sec.id}
                href={sec.id === "investors" ? FAQ_INVESTOR_HREF : `/faq?section=${sec.id}`}
                className="rounded-full border border-[var(--twin-border)] bg-[var(--twin-card)] px-3 py-1.5 text-xs font-medium text-[var(--twin-muted-strong)] transition hover:border-[var(--twin-accent)]/40 hover:text-[var(--foreground)] sm:text-sm"
              >
                {t(`faq.${faqSectionLabelKey(sec.id)}`)}
              </Link>
            ))}
          </div>

          <div className="mt-8">
            <FaqPanel section="general" limit={3} layout="row" />
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {PERSONA_SECTIONS.map((section) => (
              <div key={section}>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--twin-muted)]">
                  {t(`faq.${faqSectionLabelKey(section)}`)}
                </p>
                <FaqPanel section={section} limit={1} layout="stack" />
              </div>
            ))}
          </div>

          <p className="mt-8 text-center">
            <Link href="/faq" className="twin-link text-base font-semibold">
              {faqCountCopy(t("faq.homeCta"))}
            </Link>
            <span className="mt-1 block text-sm text-[var(--twin-muted)]">{t("faq.homeCtaHint")}</span>
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
