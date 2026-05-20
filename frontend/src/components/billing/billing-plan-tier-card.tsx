"use client";

import { Button } from "@/components/ui";
import type { TranslationKey } from "@/lib/i18n";

export type BillingPlanRow = {
  id: string;
  name: string;
  description: string;
  max_tracked_applications: number | null;
  stripe_price_configured: boolean;
  monthly_list_price_usd: number;
};

function formatUsdListMonthly(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n);
}

type BillingPlanTierCardProps = {
  plan: BillingPlanRow;
  displayName: string;
  busy: string | null;
  footerLabel: string;
  statusNote?: string;
  buttonHint?: string;
  t: (key: TranslationKey) => string;
  onPrimary: () => void;
  disabled: boolean;
  isCurrent: boolean;
};

export function BillingPlanTierCard({
  plan: p,
  displayName,
  busy,
  footerLabel,
  statusNote,
  buttonHint,
  t,
  onPrimary,
  disabled,
  isCurrent,
}: BillingPlanTierCardProps) {
  const busyHere =
    (busy === "checkout-premium" && p.id === "premium") || (busy === "checkout-pro" && p.id === "pro");

  return (
    <article
      className={`twin-billing-plan-card${isCurrent ? " twin-billing-plan-card--current" : ""}${
        disabled && !isCurrent ? " twin-billing-plan-card--muted" : ""
      }`}
    >
      <header className="twin-billing-plan-card__head">
        <h3 className="twin-billing-plan-card__title">{displayName}</h3>
        {isCurrent ? (
          <span className="twin-billing-plan-card__badge">{t("dashboard.billingPlanCurrent")}</span>
        ) : null}
      </header>

      <div className="twin-billing-plan-card__price">
        <span className="twin-billing-plan-card__amount">{formatUsdListMonthly(p.monthly_list_price_usd)}</span>
        <span className="twin-billing-plan-card__period">{t("dashboard.billingPerMonth")}</span>
      </div>

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
