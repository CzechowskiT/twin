"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import { MarketingPageHeader } from "@/components/marketing/marketing-page-header";
import { MarketingPageSurface } from "@/components/marketing/marketing-page-surface";
import { MarketingSectionCtas } from "@/components/marketing/marketing-section-ctas";
import { Shell } from "@/components/ui";

export type ComparisonPageProps = {
  title: string;
  competitorLabel: string;
  lead: string;
  competitorBullets: string[];
  twinBullets: string[];
};

export function ComparisonTwinPage({ title, competitorLabel, lead, competitorBullets, twinBullets }: ComparisonPageProps) {
  const { t } = useTranslation();
  return (
    <Shell wide>
      <MarketingPageSurface wide>
        <MarketingPageHeader title={title} lead={lead}>
          <MarketingSectionCtas
            primaryHref="/waitlist"
            primaryLabel={t("home.joinWishlist")}
            secondaryHref="/for-candidates"
            secondaryLabel={t("nav.forCandidates")}
          />
        </MarketingPageHeader>
        <article className="twin-prose twin-prose--solid mt-8 max-w-none">
          <div className="not-prose grid gap-6 md:grid-cols-2">
            <section className="rounded-xl border border-[var(--twin-border)] bg-[var(--twin-surface-raised)]/90 p-5 sm:p-6">
              <h2 className="text-base font-semibold text-[var(--foreground)]">{competitorLabel}</h2>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[var(--twin-muted-strong)]">
                {competitorBullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </section>
            <section className="rounded-xl border border-[var(--twin-accent)]/40 bg-[var(--twin-accent-muted)]/40 p-5 sm:p-6">
              <h2 className="text-base font-semibold text-[var(--foreground)]">TWIN</h2>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[var(--twin-muted-strong)]">
                {twinBullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </section>
          </div>
          <p className="mt-10 text-center text-sm text-[var(--twin-muted-strong)]">
            <Link href="/companies/signup" className="twin-link font-medium">
              Company signup
            </Link>
            {" · "}
            <Link href="/for-candidates" className="twin-link font-medium">
              For candidates
            </Link>
            {" · "}
            <Link href="/testimonials" className="twin-link font-medium">
              Testimonials
            </Link>
          </p>
        </article>
      </MarketingPageSurface>
    </Shell>
  );
}
