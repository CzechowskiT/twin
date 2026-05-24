"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { MarketingPageSurface } from "@/components/marketing/marketing-page-surface";
import { useTranslation } from "@/components/language-provider";
import { Shell } from "@/components/ui";
import {
  B2B_FLAT_RATE_DEFAULTS,
  B2B_ROI_DEFAULTS,
  computeB2bFlatRate,
  computeB2bRoi,
} from "@/lib/b2b-roi-calculator-model";
import { convertDisplayToModelUsd, convertModelUsdToDisplay } from "@/lib/calculator-fx";
import {
  defaultCurrencyForLocale,
  listCalculatorCurrencies,
  numberFormatLocaleForUi,
} from "@/lib/calculator-currencies";
import type { Locale } from "@/lib/i18n";

function formatMoney(amountDisplay: number, locale: Locale, currency: string) {
  const loc = numberFormatLocaleForUi(locale);
  try {
    return new Intl.NumberFormat(loc, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amountDisplay);
  } catch {
    return `${Math.round(amountDisplay)} ${currency}`;
  }
}

function useCurrencyLabel(locale: Locale): (code: string) => string {
  try {
    const loc = numberFormatLocaleForUi(locale);
    const dn = new Intl.DisplayNames(loc, { type: "currency" });
    return (code: string) => {
      try {
        return dn.of(code) ?? code;
      } catch {
        return code;
      }
    };
  } catch {
    return (code: string) => code;
  }
}

type CurrencySelectProps = {
  value: string;
  onChange: (code: string) => void;
  label: string;
  inputClass: string;
  locale: Locale;
};

function CurrencySelect({ value, onChange, label, inputClass, locale }: CurrencySelectProps) {
  const codes = useMemo(() => listCalculatorCurrencies(), []);
  const labelOf = useCurrencyLabel(locale);

  return (
    <label className="block sm:col-span-2 lg:col-span-3">
      <span className="mb-1.5 block text-sm font-medium text-[var(--twin-muted-strong)]">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
        aria-label={label}
      >
        {codes.map((code) => (
          <option key={code} value={code}>
            {code} — {labelOf(code)}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Illustrative agency vs TWIN-style fee model — no TWIN revenue disclosure. */
export function TwinRoiCalculator() {
  const { t, locale } = useTranslation();
  const [currency, setCurrency] = useState(() => defaultCurrencyForLocale(locale));
  const [inputsUsd, setInputsUsd] = useState(B2B_ROI_DEFAULTS);
  const [flatInputsUsd, setFlatInputsUsd] = useState(B2B_FLAT_RATE_DEFAULTS);

  const calc = useMemo(() => computeB2bRoi(inputsUsd), [inputsUsd]);
  const flatCalc = useMemo(() => computeB2bFlatRate(flatInputsUsd), [flatInputsUsd]);

  const money = (usd: number) => formatMoney(convertModelUsdToDisplay(usd, currency), locale, currency);

  const onCurrencyChange = (next: string) => {
    setCurrency(next);
  };

  const inputClass =
    "w-full min-w-0 rounded border border-[var(--twin-border)] bg-[var(--twin-input-bg)] px-3 py-2 text-lg font-semibold text-[var(--foreground)] focus:border-[var(--twin-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--twin-accent)]/20 sm:text-xl";

  const savingsPercent =
    calc.savingsPercent !== null ? calc.savingsPercent.toFixed(1) : null;

  return (
    <Shell wide rail>
      <MarketingPageSurface wide withCard={false}>
        <div className="marketing-calculator-page">
        <header className="marketing-hero-rail mb-8 sm:mb-10">
          <h1 className="twin-page-intro twin-section-title text-2xl sm:text-3xl">{t("calculator.title")}</h1>
          <p className="mt-3 text-sm leading-relaxed text-[var(--twin-muted-strong)] sm:text-base">
            {t("calculator.subtitle")}
          </p>
          <p className="mt-2 text-xs text-[var(--twin-muted-strong)]">{t("calculator.disclaimer")}</p>
        </header>

        <section className="twin-card-panel mb-6 p-5 sm:p-6">
          <h2 className="twin-section-title mb-5 text-lg sm:text-xl">{t("calculator.paramsTitle")}</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <CurrencySelect
              value={currency}
              onChange={onCurrencyChange}
              label={t("calculator.currency")}
              inputClass={inputClass}
              locale={locale}
            />
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-[var(--twin-muted-strong)]">
                {t("calculator.annualSalary")}
              </span>
              <input
                type="number"
                min={1}
                value={Math.round(convertModelUsdToDisplay(inputsUsd.annualSalaryUsd, currency))}
                onChange={(e) =>
                  setInputsUsd({
                    ...inputsUsd,
                    annualSalaryUsd: convertDisplayToModelUsd(Number(e.target.value) || 0, currency),
                  })
                }
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-[var(--twin-muted-strong)]">
                {t("calculator.agencyFee")}
              </span>
              <input
                type="number"
                min={0}
                max={100}
                value={inputsUsd.agencyFeePercent}
                onChange={(e) => setInputsUsd({ ...inputsUsd, agencyFeePercent: Number(e.target.value) || 0 })}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-[var(--twin-muted-strong)]">
                {t("calculator.placementsPerYear")}
              </span>
              <input
                type="number"
                min={0}
                value={inputsUsd.numberOfHires}
                onChange={(e) => setInputsUsd({ ...inputsUsd, numberOfHires: Number(e.target.value) || 0 })}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-[var(--twin-muted-strong)]">
                {t("calculator.hrHoursSaved")}
              </span>
              <input
                type="number"
                min={0}
                value={inputsUsd.hrHoursSavedPerMonth}
                onChange={(e) =>
                  setInputsUsd({ ...inputsUsd, hrHoursSavedPerMonth: Number(e.target.value) || 0 })
                }
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-[var(--twin-muted-strong)]">
                {t("calculator.hrHourlyRate")}
              </span>
              <input
                type="number"
                min={0}
                value={Math.round(convertModelUsdToDisplay(inputsUsd.hrHourlyRateUsd, currency))}
                onChange={(e) =>
                  setInputsUsd({
                    ...inputsUsd,
                    hrHourlyRateUsd: convertDisplayToModelUsd(Number(e.target.value) || 0, currency),
                  })
                }
                className={inputClass}
              />
            </label>
          </div>
        </section>

        <div className="mb-6 grid gap-5 md:grid-cols-2">
          <section className="twin-card-panel rounded-xl border border-red-200/80 bg-gradient-to-b from-red-50/90 to-[var(--twin-card)] p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 className="text-lg font-semibold text-red-950 sm:text-xl">{t("calculator.traditionalTitle")}</h3>
              <span className="shrink-0 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-800">
                {t("calculator.traditionalBadge")}
              </span>
            </div>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm text-[var(--twin-muted)]">{t("calculator.costPerHire")}</dt>
                <dd className="text-2xl font-bold text-red-700 sm:text-3xl">{money(calc.agencyFeePerHireUsd)}</dd>
                <dd className="text-xs text-[var(--twin-muted)]">
                  {t("calculator.agencyFeeDetail")
                    .replace("{{annual}}", money(inputsUsd.annualSalaryUsd))
                    .replace("{{pct}}", String(inputsUsd.agencyFeePercent))}
                </dd>
              </div>
              <div className="border-t border-red-200/80 pt-4">
                <dt className="text-sm text-[var(--twin-muted)]">{t("calculator.bonusForCandidate")}</dt>
                <dd className="text-xl font-bold text-red-700">{money(0)}</dd>
              </div>
              <div className="border-t border-red-200/80 pt-4">
                <dt className="text-sm text-[var(--twin-muted)]">{t("calculator.retention")}</dt>
                <dd className="text-base font-semibold text-red-800">{t("calculator.retentionNo")}</dd>
              </div>
              <div className="border-t border-red-200/80 pt-4">
                <dt className="text-sm text-[var(--twin-muted)]">{t("calculator.totalAnnualCost")}</dt>
                <dd className="text-xl font-bold text-red-700">
                  {money(calc.agencyFeePerHireUsd * inputsUsd.numberOfHires)}
                </dd>
              </div>
            </dl>
          </section>

          <section className="twin-card-panel rounded-xl border border-[var(--twin-border)] bg-gradient-to-b from-[var(--twin-accent-muted)] to-[var(--twin-card)] p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 className="text-lg font-semibold text-[var(--twin-accent-hover)] sm:text-xl">{t("calculator.twinTitle")}</h3>
              <span className="shrink-0 rounded-full bg-[var(--twin-accent-soft)]/50 px-2.5 py-1 text-xs font-semibold text-[var(--twin-accent-hover)]">
                {t("calculator.twinBadge")}
              </span>
            </div>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm text-[var(--twin-muted)]">{t("calculator.costPerHire")}</dt>
                <dd className="text-2xl font-bold text-[var(--twin-accent)] sm:text-3xl">{money(calc.twinEmployerFeePerHireUsd)}</dd>
                <dd className="text-xs text-[var(--twin-muted)]">
                  {t("calculator.twinFeeDetail").replace("{{monthly}}", money(calc.monthlySalaryUsd))}
                </dd>
              </div>
              <div className="border-t border-[var(--twin-border)] pt-4">
                <dt className="text-sm text-[var(--twin-muted)]">{t("calculator.placementTakeRate")}</dt>
                <dd className="text-xl font-bold text-[var(--twin-accent-hover)]">{money(calc.twinNetRevenuePerHireUsd)}</dd>
                <dd className="text-xs text-[var(--twin-muted)]">
                  {t("calculator.twinNetDetail").replace("{{monthly}}", money(calc.monthlySalaryUsd))}
                </dd>
              </div>
              <div className="border-t border-[var(--twin-border)] pt-4">
                <dt className="text-sm text-[var(--twin-muted)]">{t("calculator.bonusForCandidate")}</dt>
                <dd className="text-xl font-bold text-[var(--twin-accent)]">{money(calc.candidateBonusPerHireUsd)}</dd>
                <dd className="text-xs text-[var(--twin-muted)]">{t("calculator.bonusAfter")}</dd>
              </div>
              <div className="border-t border-[var(--twin-border)] pt-4">
                <dt className="text-sm text-[var(--twin-muted)]">{t("calculator.retention")}</dt>
                <dd className="text-base font-semibold text-[var(--twin-accent-hover)]">{t("calculator.retentionYes")}</dd>
              </div>
              <div className="border-t border-[var(--twin-border)] pt-4">
                <dt className="text-sm text-[var(--twin-muted)]">{t("calculator.totalAnnualCost")}</dt>
                <dd className="text-xl font-bold text-[var(--twin-accent)]">
                  {money(calc.twinEmployerFeePerHireUsd * inputsUsd.numberOfHires)}
                </dd>
              </div>
            </dl>
          </section>
        </div>

        <section className="twin-card-panel--accent mb-6 rounded-2xl p-6 text-center sm:p-8">
          <h2 className="text-xl font-semibold text-[var(--foreground)] sm:text-2xl">{t("calculator.savingsTitle")}</h2>
          <p className="mt-2 text-sm text-[var(--twin-muted)]">{t("calculator.savingsPerHire")}</p>
          <p className="mt-3 text-4xl font-bold tracking-tight text-[var(--twin-link)] sm:text-5xl">{money(calc.savingsPerHireUsd)}</p>
          {savingsPercent !== null ? (
            <p className="mt-4 inline-block rounded-full bg-[var(--twin-cta)] px-5 py-2 text-sm font-semibold text-[var(--twin-on-cta)] shadow-sm">
              {t("calculator.cheaperBy").replace("{{pct}}", savingsPercent)}
            </p>
          ) : (
            <p className="mt-4 text-sm text-[var(--twin-muted)]">—</p>
          )}
          <div className="mt-8 grid gap-4 text-center sm:grid-cols-2">
            <div className="twin-card-inset rounded-lg p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-[var(--twin-muted)]">
                {t("calculator.savingsAnnual")}
              </div>
              <div className="mt-1 text-xl font-bold text-[var(--foreground)]">{money(calc.totalSavingsUsd)}</div>
            </div>
            <div className="twin-card-inset rounded-lg p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-[var(--twin-muted)]">
                {t("calculator.roiVsAgency")}
              </div>
              <div className="mt-1 text-xl font-bold text-[var(--foreground)]">
                {savingsPercent !== null ? `${savingsPercent}%` : "—"}
              </div>
            </div>
          </div>
        </section>

        <div className="mb-6 grid gap-5 md:grid-cols-2">
          <section className="twin-card-panel rounded-xl border border-[var(--twin-border)] p-5 sm:p-6">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">{t("calculator.candidateCardTitle")}</h3>
            <p className="mt-3 text-3xl font-bold text-[var(--twin-link)]">{money(calc.candidateBonusPerHireUsd)}</p>
            <p className="mt-1 text-sm text-[var(--twin-muted)]">{t("calculator.candidateCardSub")}</p>
            <ul className="mt-4 space-y-2 border-t border-[var(--twin-border)] pt-4 text-sm text-[var(--twin-muted-strong)]">
              <li>{t("calculator.candidateB1")}</li>
              <li>{t("calculator.candidateB2")}</li>
              <li>{t("calculator.candidateB3")}</li>
            </ul>
          </section>
          <section className="twin-card-panel rounded-xl border border-[var(--twin-border)] p-5 sm:p-6">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">{t("calculator.companyCardTitle")}</h3>
            <p className="mt-3 text-3xl font-bold text-[var(--twin-cta)]">{money(calc.savingsPerHireUsd)}</p>
            <p className="mt-1 text-sm text-[var(--twin-muted)]">{t("calculator.companyCardSub")}</p>
            <ul className="mt-4 space-y-2 border-t border-[var(--twin-border)] pt-4 text-sm text-[var(--twin-muted-strong)]">
              <li>{t("calculator.companyB1")}</li>
              <li>{t("calculator.companyB2")}</li>
              <li>{t("calculator.companyB3")}</li>
            </ul>
          </section>
        </div>

        <section className="twin-card-panel mb-6 rounded-2xl border border-[var(--twin-border)] p-5 sm:p-8">
          <h2 className="twin-section-title mb-3 text-lg sm:text-xl">{t("calculator.workspaceIntegrationsTitle")}</h2>
          <p className="max-w-3xl text-sm leading-relaxed text-[var(--twin-muted-strong)]">
            {t("calculator.workspaceIntegrationsLead")}
          </p>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-[var(--twin-border)] bg-[var(--twin-surface-raised)]/60 p-4 sm:p-5">
              <div className="text-xs font-semibold uppercase tracking-wider text-[var(--twin-muted)]">
                {t("calculator.workspaceSeatPriceLabel")}
              </div>
              <p className="mt-2 text-2xl font-bold text-[var(--foreground)]">{t("calculator.workspaceSeatPriceValue")}</p>
              <label className="mt-6 block">
                <span className="mb-1.5 block text-sm font-medium text-[var(--twin-muted-strong)]">
                  {t("calculator.workspaceSeatCount")}
                </span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={inputsUsd.recruiterSeats}
                  onChange={(e) =>
                    setInputsUsd({
                      ...inputsUsd,
                      recruiterSeats: Math.max(1, Math.floor(Number(e.target.value)) || 1),
                    })
                  }
                  className={inputClass}
                />
              </label>
              <p className="mt-2 text-xs leading-relaxed text-[var(--twin-muted)]">{t("calculator.workspaceSeatHint")}</p>
            </div>
            <div className="flex flex-col justify-center gap-5 rounded-xl border border-[var(--twin-border)] bg-[var(--twin-surface)] p-4 sm:p-5">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-[var(--twin-muted)]">
                  {t("calculator.workspaceMonthlyTotal")}
                </div>
                <p className="mt-1 text-2xl font-bold text-[var(--twin-link)]">{money(calc.workspaceMonthlyUsd)}</p>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-[var(--twin-muted)]">
                  {t("calculator.workspaceAnnualTotal")}
                </div>
                <p className="mt-1 text-2xl font-bold text-[var(--twin-link)]">{money(calc.workspaceAnnualUsd)}</p>
                <p className="mt-1 text-xs text-[var(--twin-muted)]">{t("calculator.workspaceAnnualPrepayNote")}</p>
              </div>
            </div>
          </div>
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">{t("calculator.workspaceScopeTitle")}</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[var(--twin-muted-strong)]">
              <li>{t("calculator.workspaceScope1")}</li>
              <li>{t("calculator.workspaceScope2")}</li>
              <li>{t("calculator.workspaceScope3")}</li>
              <li>{t("calculator.workspaceScope4")}</li>
            </ul>
          </div>
          <p className="mt-5 text-xs leading-relaxed text-[var(--twin-muted)]">{t("calculator.workspaceFoot")}</p>
        </section>

        <section
          id="flat-rate"
          className="twin-card-panel mb-6 rounded-2xl border border-[var(--twin-border)] p-5 sm:p-8"
        >
          <h2 className="twin-section-title mb-2 text-lg sm:text-xl">{t("calculator.flatRateTitle")}</h2>
          <p className="mb-6 max-w-3xl text-sm leading-relaxed text-[var(--twin-muted-strong)]">
            {t("calculator.flatRateLead")}
          </p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-[var(--twin-muted-strong)]">
                {t("calculator.flatRateHeadcount")}
              </span>
              <input
                type="number"
                min={0}
                value={flatInputsUsd.headcount}
                onChange={(e) =>
                  setFlatInputsUsd({ ...flatInputsUsd, headcount: Number(e.target.value) || 0 })
                }
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-[var(--twin-muted-strong)]">
                {t("calculator.flatRateRotation")}
              </span>
              <input
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={flatInputsUsd.rotationRate}
                onChange={(e) =>
                  setFlatInputsUsd({ ...flatInputsUsd, rotationRate: Number(e.target.value) || 0 })
                }
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-[var(--twin-muted-strong)]">
                {t("calculator.flatRateVacancies")}
              </span>
              <input
                type="number"
                min={0}
                placeholder="auto"
                value={flatInputsUsd.vacancies ?? ""}
                onChange={(e) => {
                  const raw = e.target.value;
                  setFlatInputsUsd({
                    ...flatInputsUsd,
                    vacancies: raw === "" ? null : Math.max(0, Number(raw) || 0),
                  });
                }}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-[var(--twin-muted-strong)]">
                {t("calculator.flatRateVacancyCost")}
              </span>
              <input
                type="number"
                min={0}
                value={Math.round(convertModelUsdToDisplay(flatInputsUsd.costPerVacancyUsd, currency))}
                onChange={(e) =>
                  setFlatInputsUsd({
                    ...flatInputsUsd,
                    costPerVacancyUsd: convertDisplayToModelUsd(Number(e.target.value) || 0, currency),
                  })
                }
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-[var(--twin-muted-strong)]">
                {t("calculator.flatRateRatio")}
              </span>
              <input
                type="number"
                min={0}
                max={100}
                value={Math.round(flatInputsUsd.flatRateRatio * 100)}
                onChange={(e) =>
                  setFlatInputsUsd({
                    ...flatInputsUsd,
                    flatRateRatio: (Number(e.target.value) || 0) / 100,
                  })
                }
                className={inputClass}
              />
            </label>
          </div>
          <dl className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="twin-card-inset rounded-lg p-4">
              <dt className="text-sm text-[var(--twin-muted)]">{t("calculator.flatRateTraditional")}</dt>
              <dd className="mt-1 text-2xl font-bold text-red-700">{money(flatCalc.traditionalTotalUsd)}</dd>
              <dd className="mt-1 text-xs text-[var(--twin-muted)]">
                {t("calculator.flatRateVacanciesDetail")
                  .replace("{{count}}", String(flatCalc.vacancies))
                  .replace(
                    "{{cost}}",
                    money(flatInputsUsd.costPerVacancyUsd),
                  )}
              </dd>
            </div>
            <div className="twin-card-inset rounded-lg p-4">
              <dt className="text-sm text-[var(--twin-muted)]">{t("calculator.flatRateTwin")}</dt>
              <dd className="mt-1 text-2xl font-bold text-[var(--twin-link)]">{money(flatCalc.flatRateTotalUsd)}</dd>
            </div>
            <div className="twin-card-inset rounded-lg p-4">
              <dt className="text-sm text-[var(--twin-muted)]">{t("calculator.flatRateSavings")}</dt>
              <dd className="mt-1 text-2xl font-bold text-[var(--twin-cta)]">{money(flatCalc.savingsUsd)}</dd>
              {flatCalc.savingsPercent !== null ? (
                <dd className="mt-1 text-xs text-[var(--twin-muted)]">{flatCalc.savingsPercent.toFixed(0)}%</dd>
              ) : null}
            </div>
          </dl>
          <p className="mt-5 text-xs leading-relaxed text-[var(--twin-muted)]">{t("calculator.flatRateFoot")}</p>
        </section>

        <section className="twin-card-panel rounded-2xl border border-amber-200/80 bg-gradient-to-b from-amber-50/50 to-[var(--twin-card)] p-5 sm:p-8">
          <h2 className="twin-section-title mb-6 text-lg sm:text-xl">{t("calculator.enterpriseTitle")}</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--twin-muted)]">
                {t("calculator.costsTitle")}
              </h3>
              <div className="twin-card-inset rounded-lg p-4">
                <div className="text-sm text-[var(--twin-muted)]">{t("calculator.integrationFee")}</div>
                <div className="mt-1 text-2xl font-bold text-red-700">
                  {money(calc.integrationFeeUsd)}
                  <span className="text-base font-medium text-[var(--twin-muted)]">{t("calculator.perYear")}</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--twin-muted)]">
                {t("calculator.valueTitle")}
              </h3>
              <div className="space-y-3">
                <div className="twin-card-inset rounded-lg p-4">
                  <div className="text-sm text-[var(--twin-muted)]">{t("calculator.timeSavings")}</div>
                  <div className="mt-1 text-xl font-bold text-[var(--twin-link)]">{money(calc.timeValueSavingsUsd)}</div>
                  <div className="text-xs text-[var(--twin-muted)]">
                    {t("calculator.timeSavingsSub")
                      .replace("{{hours}}", String(inputsUsd.hrHoursSavedPerMonth))
                      .replace("{{rate}}", String(Math.round(convertModelUsdToDisplay(inputsUsd.hrHourlyRateUsd, currency))))
                      .replace("{{code}}", currency)}
                  </div>
                </div>
                <div className="twin-card-inset rounded-lg p-4">
                  <div className="text-sm text-[var(--twin-muted)]">{t("calculator.hireCostSavings")}</div>
                  <div className="mt-1 text-xl font-bold text-[var(--twin-link)]">{money(calc.costSavingsUsd)}</div>
                  <div className="text-xs text-[var(--twin-muted)]">
                    {t("calculator.hireCostSavingsSub")
                      .replace("{{perHire}}", money(calc.savingsPerHireUsd))
                      .replace("{{hires}}", String(inputsUsd.numberOfHires))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="twin-roi-enterprise-strip mt-6 rounded-xl bg-gradient-to-r from-[var(--twin-accent)] to-[var(--twin-accent-hover)] p-5 shadow-md sm:p-6">
            <div className="grid gap-4 text-center sm:grid-cols-3">
              <div>
                <div className="twin-roi-enterprise-strip-muted text-xs font-medium uppercase tracking-wide">
                  {t("calculator.totalValue")}
                </div>
                <div className="mt-1 text-2xl font-bold">{money(calc.totalEnterpriseValueUsd)}</div>
              </div>
              <div>
                <div className="twin-roi-enterprise-strip-muted text-xs font-medium uppercase tracking-wide">
                  {t("calculator.netBenefit")}
                </div>
                <div className="mt-1 text-2xl font-bold">{money(calc.netBenefitUsd)}</div>
              </div>
              <div>
                <div className="twin-roi-enterprise-strip-muted text-xs font-medium uppercase tracking-wide">
                  {t("calculator.roiLabel")}
                </div>
                <div className="mt-1 text-2xl font-bold">
                  {calc.enterpriseRoiPercent !== null ? `${calc.enterpriseRoiPercent.toFixed(1)}%` : "—"}
                </div>
              </div>
            </div>
          </div>

          <p className="mt-5 text-start text-xs leading-relaxed text-[var(--twin-muted)] sm:text-sm">
            {t("calculator.enterpriseFoot")}
          </p>
        </section>

        <footer className="marketing-hero-rail mt-10 border-t border-[var(--twin-border)] pt-8">
          <p className="text-sm leading-relaxed text-[var(--twin-muted-strong)]">{t("calculator.wishlistLead")}</p>
          <div className="marketing-cta-stack mt-4">
            <Link
              href="/waitlist"
              className="marketing-cta-filled-pill marketing-btn-primary-shadow twin-touch-target inline-flex min-h-[2.75rem] w-full items-center justify-center rounded-full bg-[var(--twin-cta)] px-6 text-sm font-semibold text-[var(--twin-on-cta)] transition hover:bg-[var(--twin-cta-hover)] active:scale-[0.98]"
            >
              {t("home.joinWishlist")}
            </Link>
          </div>
          <p className="mt-6 text-sm text-[var(--twin-muted-strong)]">
            <Link href="/calculator" className="twin-link font-medium">
              {t("calculator.linkInvestorModel")}
            </Link>
          </p>
          <p className="mt-4 text-xs leading-relaxed text-[var(--twin-muted-strong)]">{t("calculator.footerNote")}</p>
        </footer>
        </div>
      </MarketingPageSurface>
    </Shell>
  );
}
