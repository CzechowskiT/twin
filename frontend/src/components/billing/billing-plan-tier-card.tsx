"use client";

import { Button } from "@/components/ui";
import type { Locale, TranslationKey } from "@/lib/i18n";
import { formatAnnualPrepayFromMonthlyUsd, formatCandidateListPriceUsd } from "@/lib/pricing-locale";

export type BillingPlanRow = {
  id: string;
  name: string;
  description: string;
  max_tracked_applications: number | null;
  stripe_price_configured: boolean;
  monthly_list_price_usd: number;
  annual_list_price_usd?: number;
};

type BillingPlanTierCardProps = {
  plan: BillingPlanRow;
  locale: Locale;
  displayName: string;
  busy: string | null;
  footerLabel: string;
  statusNote?: string;
  buttonHint?: string;
  t: (key: TranslationKey) => string;
  onPrimary: () => void;
  disabled: boolean;
  isCurrent: boolean;
  featured?: boolean;
};

export function BillingPlanTierCard({
  plan: p,
  locale,
  displayName,
  busy,
  footerLabel,
  statusNote,
  buttonHint,
  t,
  onPrimary,
  disabled,
  isCurrent,
  featured = false,
}: BillingPlanTierCardProps) {
  const busyHere = busy === `checkout-${p.id}`;

  return (
    <article
      className={`twin-billing-plan-card${isCurrent ? " twin-billing-plan-card--current" : ""}${
        featured && !isCurrent ? " twin-billing-plan-card--featured" : ""
      }${disabled && !isCurrent ? " twin-billing-plan-card--muted" : ""}`}
    >
      <header className="twin-billing-plan-card__head">
        <h3 className="twin-billing-plan-card__title">{displayName}</h3>
        <span className="twin-billing-plan-card__badges">
          {featured && !isCurrent ? (
            <span className="twin-billing-plan-card__badge twin-billing-plan-card__badge--featured">
              {t("dashboard.billingEngagementRecommended")}
            </span>
          ) : null}
          {isCurrent ? (
            <span className="twin-billing-plan-card__badge">{t("dashboard.billingPlanCurrent")}</span>
          ) : null}
        </span>
      </header>

      <div className="twin-billing-plan-card__price">
        <span className="twin-billing-plan-card__amount">
          {formatCandidateListPriceUsd(p.monthly_list_price_usd, locale)}
        </span>
        <span className="twin-billing-plan-card__period">{t("dashboard.billingPerMonth")}</span>
      </div>
      {p.monthly_list_price_usd > 0 ? (
        <p className="twin-billing-plan-card__annual text-xs text-[var(--twin-muted-strong)]">
          <span className="font-medium text-[var(--foreground)]">
            {formatAnnualPrepayFromMonthlyUsd(p.monthly_list_price_usd, locale)}
          </span>
          {t("dashboard.billingPerYear")} · {t("dashboard.billingThreeMonthsFree")}
        </p>
      ) : null}

      <p className="twin-billing-plan-card__desc">{p.description}</p>
      <p className="twin-billing-plan-card__meta">
        {p.max_tracked_applications != null
          ? t("dashboard.billingTrackedCap").replace("{n}", String(p.max_tracked_applications))
          : t("dashboard.billingTrackedUnlimited")}
      </p>

      {statusNote ? <p className="twin-billing-plan-card__note">{statusNote}</p> : null}

      <div className="twin-billing-plan-card__cta">
        <Button
          type="button"
          title={buttonHint ?? statusNote}
          aria-label={buttonHint ?? statusNote ?? footerLabel}
          className="twin-billing-plan-card__btn"
          disabled={disabled}
          onClick={() => {
            if (disabled) return;
            onPrimary();
          }}
        >
          {busyHere ? "…" : footerLabel}
        </Button>
      </div>
    </article>
  );
}
