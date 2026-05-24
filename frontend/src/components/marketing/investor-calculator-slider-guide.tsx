"use client";

import { useMemo } from "react";

import { useTranslation } from "@/components/language-provider";
import { INVESTOR_CALCULATOR_DEFAULTS } from "@/lib/investor-calculator-model";
import type { TranslationKey } from "@/lib/i18n";

type SliderRefRowKey =
  | "totalUsers"
  | "percentPaying"
  | "subPrice"
  | "annualPrepayShare"
  | "placementRate"
  | "avgSalary"
  | "employerPlacementFee"
  | "referralRate"
  | "viralGrowth"
  | "foundingCohort"
  | "foundingFreeMonths"
  | "linkedIn"
  | "team"
  | "infraPerUser"
  | "legalOffice";

type SliderRefRow = {
  id: SliderRefRowKey;
  labelKey: TranslationKey;
  descKey: TranslationKey;
};

const SLIDER_REF_ROWS: SliderRefRow[] = [
  { id: "totalUsers", labelKey: "investorCalc.totalUsers", descKey: "investorCalc.sliderDesc_totalUsers" },
  { id: "percentPaying", labelKey: "investorCalc.percentPaying", descKey: "investorCalc.sliderDesc_percentPaying" },
  { id: "subPrice", labelKey: "investorCalc.subPrice", descKey: "investorCalc.sliderDesc_subPrice" },
  {
    id: "annualPrepayShare",
    labelKey: "investorCalc.annualPrepayShare",
    descKey: "investorCalc.sliderDesc_annualPrepayShare",
  },
  { id: "placementRate", labelKey: "investorCalc.placementRate", descKey: "investorCalc.sliderDesc_placementRate" },
  { id: "avgSalary", labelKey: "investorCalc.avgSalary", descKey: "investorCalc.sliderDesc_avgSalary" },
  {
    id: "employerPlacementFee",
    labelKey: "investorCalc.employerPlacementFee",
    descKey: "investorCalc.sliderDesc_employerPlacementFee",
  },
  { id: "referralRate", labelKey: "investorCalc.referralRate", descKey: "investorCalc.sliderDesc_referralRate" },
  { id: "viralGrowth", labelKey: "investorCalc.viralGrowth", descKey: "investorCalc.sliderDesc_viralGrowth" },
  {
    id: "foundingCohort",
    labelKey: "investorCalc.foundingCohortSize",
    descKey: "investorCalc.sliderDesc_foundingCohort",
  },
  {
    id: "foundingFreeMonths",
    labelKey: "investorCalc.foundingFreeMonths",
    descKey: "investorCalc.sliderDesc_foundingFreeMonths",
  },
  { id: "linkedIn", labelKey: "investorCalc.sliderRef_linkedIn", descKey: "investorCalc.sliderDesc_linkedIn" },
  { id: "team", labelKey: "investorCalc.sliderRef_team", descKey: "investorCalc.sliderDesc_team" },
  {
    id: "infraPerUser",
    labelKey: "investorCalc.sliderRef_infraPerUser",
    descKey: "investorCalc.sliderDesc_infraPerUser",
  },
  {
    id: "legalOffice",
    labelKey: "investorCalc.sliderRef_legalOffice",
    descKey: "investorCalc.sliderDesc_legalOffice",
  },
];

function teamHeadcount() {
  const d = INVESTOR_CALCULATOR_DEFAULTS;
  return d.seniorEngineers + d.otherEngineers + d.productManager + d.otherRoles + 1;
}

function teamAnnualUsd() {
  const d = INVESTOR_CALCULATOR_DEFAULTS;
  return (
    d.seniorEngineers * d.seniorEngineerSalary +
    d.otherEngineers * d.otherEngineerSalary +
    d.productManager * d.productManagerSalary +
    d.otherRoles * d.otherRolesSalary +
    d.founderSalary
  );
}

function infraPerUserUsd() {
  const d = INVESTOR_CALCULATOR_DEFAULTS;
  return d.hostingCostPerUser + d.apiCostPerUser + d.servicesCostPerUser;
}

function formatSliderDefaults(locale: string, perYearSuffix: string): Record<SliderRefRowKey, string> {
  const d = INVESTOR_CALCULATOR_DEFAULTS;
  const n = (v: number) => v.toLocaleString(locale);
  const money = (v: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: v % 1 === 0 ? 0 : 2,
    }).format(v);

  return {
    totalUsers: n(d.totalUsers),
    percentPaying: `${d.percentPaying}%`,
    subPrice: money(d.subscriptionPrice),
    annualPrepayShare: `${Math.round(d.annualPrepayShare * 100)}%`,
    placementRate: `${d.placementRate}%`,
    avgSalary: money(d.averageSalary),
    employerPlacementFee: `${d.successFeePercent}%`,
    referralRate: `${d.referralRate}%`,
    viralGrowth: `${d.viralGrowthRate}%`,
    foundingCohort: n(d.foundingCohortSize),
    foundingFreeMonths: String(d.foundingFreePremiumMonths),
    linkedIn: `${d.linkedInAdoptionRate}% · ${d.linkedInIncentivePercent}%`,
    team: `${teamHeadcount()} · ${money(teamAnnualUsd())}${perYearSuffix}`,
    infraPerUser: money(infraPerUserUsd()),
    legalOffice: `${money(d.legalAccounting)} + ${money(d.officeMisc)}`,
  };
}

/** Collapsible slider glossary — defaults always read from INVESTOR_CALCULATOR_DEFAULTS (Organic scenario). */
export function InvestorCalculatorSliderGuide() {
  const { t, locale } = useTranslation();
  const defaults = useMemo(
    () => formatSliderDefaults(locale, t("investorCalc.perYear")),
    [locale, t],
  );

  return (
    <details className="twin-card-panel mb-6 group open:shadow-sm">
      <summary className="cursor-pointer list-none px-5 py-4 sm:px-6 [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-start justify-between gap-3">
          <span>
            <span className="twin-section-title block text-base font-semibold sm:text-lg">
              {t("investorCalc.sliderGuideTitle")}
            </span>
            <span className="mt-1 block text-sm leading-relaxed text-[var(--twin-muted-strong)]">
              {t("investorCalc.sliderGuideLead")}
            </span>
          </span>
          <span className="mt-1 shrink-0 text-[var(--twin-muted)] transition group-open:rotate-180" aria-hidden>
            ▾
          </span>
        </span>
      </summary>
      <div className="border-t border-[var(--twin-border)] px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-[var(--twin-border)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--twin-muted-strong)]">
                <th className="p-2 pr-4">{t("investorCalc.sliderGuideColSlider")}</th>
                <th className="p-2 pr-4">{t("investorCalc.sliderGuideColWhat")}</th>
                <th className="p-2 text-right whitespace-nowrap">{t("investorCalc.sliderGuideColDefault")}</th>
              </tr>
            </thead>
            <tbody>
              {SLIDER_REF_ROWS.map((row) => (
                <tr key={row.id} className="border-b border-[var(--twin-border)] align-top">
                  <td className="p-2 pr-4 font-medium text-[var(--foreground)]">{t(row.labelKey)}</td>
                  <td className="p-2 pr-4 leading-relaxed text-[var(--twin-muted-strong)]">{t(row.descKey)}</td>
                  <td className="p-2 text-right font-mono text-xs tabular-nums text-[var(--foreground)] sm:text-sm">
                    {defaults[row.id]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </details>
  );
}
