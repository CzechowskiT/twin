"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { AnimatedCounter } from "@/components/waitlist/animated-counter";
import type { TranslationKey } from "@/lib/i18n";

type MvpStats = {
  validated_jobs: number;
  registered_users: number;
  total_applications: number;
  stripe_checkout_ready: boolean;
};

type BillingUpgradeExperienceProps = {
  checkoutConfigured: boolean;
  currentTier: string;
};

const PILLAR_KEYS: { icon: string; title: TranslationKey; body: TranslationKey }[] = [
  {
    icon: "◎",
    title: "dashboard.billingEngagementPillar1Title",
    body: "dashboard.billingEngagementPillar1Body",
  },
  {
    icon: "◷",
    title: "dashboard.billingEngagementPillar2Title",
    body: "dashboard.billingEngagementPillar2Body",
  },
  {
    icon: "↗",
    title: "dashboard.billingEngagementPillar3Title",
    body: "dashboard.billingEngagementPillar3Body",
  },
];

const COMPARE_BAD: TranslationKey[] = [
  "dashboard.billingEngagementCompareBad1",
  "dashboard.billingEngagementCompareBad2",
  "dashboard.billingEngagementCompareBad3",
  "dashboard.billingEngagementCompareBad4",
];

const COMPARE_GOOD: TranslationKey[] = [
  "dashboard.billingEngagementCompareGood1",
  "dashboard.billingEngagementCompareGood2",
  "dashboard.billingEngagementCompareGood3",
  "dashboard.billingEngagementCompareGood4",
];

export function BillingUpgradeExperience({ checkoutConfigured, currentTier }: BillingUpgradeExperienceProps) {
  const { t } = useTranslation();
  const [stats, setStats] = useState<MvpStats | null>(null);
  const tier = currentTier.toLowerCase();
  const showWishlistBand = !checkoutConfigured && tier === "free";

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/v1/public/mvp-stats", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as MvpStats;
        if (!cancelled) setStats(json);
      } catch {
        /* optional social proof */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const metrics = stats
    ? [
        { label: t("dashboard.billingEngagementStatsJobs"), value: stats.validated_jobs },
        { label: t("dashboard.billingEngagementStatsUsers"), value: stats.registered_users },
        { label: t("dashboard.billingEngagementStatsApps"), value: stats.total_applications },
      ]
    : null;

  return (
    <section className="twin-billing-engage" aria-labelledby="billing-engage-title">
      <div className="twin-billing-engage__inner">
        <p className="twin-billing-engage__eyebrow">{t("dashboard.billingEngagementEyebrow")}</p>
        <h2 id="billing-engage-title" className="twin-billing-engage__title">
          {t("dashboard.billingEngagementTitle")}
        </h2>
        <p className="twin-billing-engage__lead">{t("dashboard.billingEngagementLead")}</p>

        {metrics ? (
          <ul className="twin-billing-engage__metrics" aria-label={t("dashboard.billingEngagementStatsAria")}>
            {metrics.map((m) => (
              <li key={m.label} className="twin-billing-engage__metric">
                <span className="twin-billing-engage__metric-value">
                  <AnimatedCounter value={m.value} />
                </span>
                <span className="twin-billing-engage__metric-label">{m.label}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <ul className="twin-billing-engage__pillars">
          {PILLAR_KEYS.map((p) => (
            <li key={p.title} className="twin-billing-engage__pillar">
              <span className="twin-billing-engage__pillar-icon" aria-hidden>
                {p.icon}
              </span>
              <h3 className="twin-billing-engage__pillar-title">{t(p.title)}</h3>
              <p className="twin-billing-engage__pillar-body">{t(p.body)}</p>
            </li>
          ))}
        </ul>

        <div className="twin-billing-engage__compare">
          <article className="twin-billing-engage__compare-card twin-billing-engage__compare-card--before">
            <h3 className="twin-billing-engage__compare-heading">{t("dashboard.billingEngagementCompareBadTitle")}</h3>
            <ul>
              {COMPARE_BAD.map((key) => (
                <li key={key}>{t(key)}</li>
              ))}
            </ul>
          </article>
          <article className="twin-billing-engage__compare-card twin-billing-engage__compare-card--after">
            <h3 className="twin-billing-engage__compare-heading">{t("dashboard.billingEngagementCompareGoodTitle")}</h3>
            <ul>
              {COMPARE_GOOD.map((key) => (
                <li key={key}>{t(key)}</li>
              ))}
            </ul>
          </article>
        </div>

        <ul className="twin-billing-engage__trust">
          <li>{t("dashboard.billingEngagementTrustCancel")}</li>
          <li>{t("dashboard.billingEngagementTrustGdpr")}</li>
          <li>{t("dashboard.billingEngagementTrustSecure")}</li>
        </ul>

        {showWishlistBand ? (
          <aside className="twin-billing-engage__wishlist text-start">
            <p className="twin-billing-engage__wishlist-eyebrow">{t("dashboard.billingStripeNotReadyTitle")}</p>
            <h3 className="twin-billing-engage__wishlist-title">{t("dashboard.billingEngagementWishlistTitle")}</h3>
            <p className="twin-billing-engage__wishlist-lead">{t("dashboard.billingStripeNotReadyLead")}</p>
            <div className="marketing-hero-rail mt-4 flex flex-wrap gap-3">
              <Link href="/waitlist" className="twin-billing-engage__wishlist-cta twin-touch-target">
                {t("dashboard.billingStripeNotReadyPricing")}
              </Link>
              <a
                href="https://github.com/CzechowskiT/twin/blob/main/docs/STRIPE_E2E.md"
                className="twin-link twin-touch-target inline-flex items-center text-sm font-semibold"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("dashboard.billingStripeNotReadyDocs")} ↗
              </a>
            </div>
          </aside>
        ) : null}
      </div>
    </section>
  );
}
