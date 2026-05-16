"use client";

import Link from "next/link";
import { useTranslation } from "@/components/language-provider";
import { FaqPanel } from "@/components/marketing/faq-panel";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";

/** Fluently-style numbered Q&A: calm disclosure rows, no extra dependencies. */
export function LandingFaq() {
  const { t } = useTranslation();

  return (
    <section className="border-t border-[var(--twin-border)] py-20 sm:py-24 md:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <ScrollReveal delayMs={40}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-muted)]">{t("home.faqEyebrow")}</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)] sm:text-3xl">{t("home.faqTitle")}</h2>
          <div className="mt-10">
            <FaqPanel />
          </div>
          <p className="mt-6 text-center text-sm text-[var(--twin-muted)]">
            <Link href="/faq" className="twin-link font-medium">
              {t("nav.faq")}
            </Link>
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
