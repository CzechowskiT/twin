"use client";

import { useMemo, useState } from "react";

import { MarketingPageSurface } from "@/components/marketing/marketing-page-surface";
import { useTranslation } from "@/components/language-provider";
import { Shell } from "@/components/ui";
import {
  defaultCurrencyForLocale,
  listCalculatorCurrencies,
  numberFormatLocaleForUi,
} from "@/lib/calculator-currencies";
import type { Locale } from "@/lib/i18n";

function formatMoney(amount: number, locale: Locale, currency: string) {
  const loc = numberFormatLocaleForUi(locale);
  try {
    return new Intl.NumberFormat(loc, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${Math.round(amount)} ${currency}`;
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
  const [annualSalary, setAnnualSalary] = useState(60_000);
  const [agencyFeePercent, setAgencyFeePercent] = useState(15);
  const [numberOfHires, setNumberOfHires] = useState(50);
  const [hrHoursSaved, setHrHoursSaved] = useState(100);
  const [hrHourlyRate, setHrHourlyRate] = useState(50);

  const monthlySalary = annualSalary / 12;
  const agencyFee = annualSalary * (agencyFeePercent / 100);
  const twinFee = monthlySalary * 0.5;
  const candidateBonus = twinFee * 0.5;

  const savingsPerHire = agencyFee - twinFee;
  const savingsPercent = useMemo(() => {
    if (agencyFee <= 0) return null;
    return ((savingsPerHire / agencyFee) * 100).toFixed(1);
  }, [agencyFee, savingsPerHire]);
  const totalSavings = savingsPerHire * numberOfHires;

  const integrationFee = 100_000;
  const timeValueSavings = hrHoursSaved * hrHourlyRate * 12;
  const costSavings = savingsPerHire * numberOfHires;
  const totalEnterpriseValue = timeValueSavings + costSavings;
  const enterpriseROI =
    integrationFee > 0 ? (((totalEnterpriseValue - integrationFee) / integrationFee) * 100).toFixed(1) : null;

  const inputClass =
    "w-full min-w-0 rounded border border-[var(--twin-border)] bg-[var(--twin-input-bg)] px-3 py-2 text-lg font-semibold text-[var(--foreground)] focus:border-[var(--twin-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--twin-accent)]/20 sm:text-xl";

  const money = (amount: number) => formatMoney(amount, locale, currency);

  return (
    <Shell wide rail>
      <MarketingPageSurface wide withCard={false}>
        <header className="mb-8 text-center sm:mb-10">
          <h1 className="twin-page-intro twin-section-title text-2xl sm:text-3xl">{t("calculator.title")}</h1>
          <p className="mx-auto mt-3 max-w-3xl text-sm leading-relaxed text-[var(--twin-muted-strong)] sm:text-base">
            {t("calculator.subtitle")}
          </p>
          <p className="mx-auto mt-2 max-w-2xl text-xs text-[var(--twin-muted-strong)]">{t("calculator.disclaimer")}</p>
        </header>

        <section className="twin-card-panel mb-6 p-5 sm:p-6">
          <h2 className="twin-section-title mb-5 text-lg sm:text-xl">{t("calculator.paramsTitle")}</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <CurrencySelect
              value={currency}
              onChange={setCurrency}
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
                value={annualSalary}
                onChange={(e) => setAnnualSalary(Number(e.target.value) || 0)}
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
                value={agencyFeePercent}
                onChange={(e) => setAgencyFeePercent(Number(e.target.value) || 0)}
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
                value={numberOfHires}
                onChange={(e) => setNumberOfHires(Number(e.target.value) || 0)}
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
                value={hrHoursSaved}
                onChange={(e) => setHrHoursSaved(Number(e.target.value) || 0)}
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
                value={hrHourlyRate}
                onChange={(e) => setHrHourlyRate(Number(e.target.value) || 0)}
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
                <dd className="text-2xl font-bold text-red-700 sm:text-3xl">{money(agencyFee)}</dd>
                <dd className="text-xs text-[var(--twin-muted)]">
                  {t("calculator.agencyFeeDetail")
                    .replace("{{annual}}", money(annualSalary))
                    .replace("{{pct}}", String(agencyFeePercent))}
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
                <dd className="text-xl font-bold text-red-700">{money(agencyFee * numberOfHires)}</dd>
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
                <dd className="text-2xl font-bold text-[var(--twin-accent)] sm:text-3xl">{money(twinFee)}</dd>
                <dd className="text-xs text-[var(--twin-muted)]">
                  {t("calculator.twinFeeDetail").replace("{{monthly}}", money(monthlySalary))}
                </dd>
              </div>
              <div className="border-t border-[var(--twin-border)] pt-4">
                <dt className="text-sm text-[var(--twin-muted)]">{t("calculator.bonusForCandidate")}</dt>
                <dd className="text-xl font-bold text-[var(--twin-accent)]">{money(candidateBonus)}</dd>
                <dd className="text-xs text-[var(--twin-muted)]">{t("calculator.bonusAfter")}</dd>
              </div>
              <div className="border-t border-[var(--twin-border)] pt-4">
                <dt className="text-sm text-[var(--twin-muted)]">{t("calculator.retention")}</dt>
                <dd className="text-base font-semibold text-[var(--twin-accent-hover)]">{t("calculator.retentionYes")}</dd>
              </div>
              <div className="border-t border-[var(--twin-border)] pt-4">
                <dt className="text-sm text-[var(--twin-muted)]">{t("calculator.totalAnnualCost")}</dt>
                <dd className="text-xl font-bold text-[var(--twin-accent)]">{money(twinFee * numberOfHires)}</dd>
              </div>
            </dl>
          </section>
        </div>

        <section className="twin-card-panel--accent mb-6 rounded-2xl p-6 text-center sm:p-8">
          <h2 className="text-xl font-semibold text-[var(--foreground)] sm:text-2xl">{t("calculator.savingsTitle")}</h2>
          <p className="mt-2 text-sm text-[var(--twin-muted)]">{t("calculator.savingsPerHire")}</p>
          <p className="mt-3 text-4xl font-bold tracking-tight text-[var(--twin-link)] sm:text-5xl">{money(savingsPerHire)}</p>
          {savingsPercent !== null ? (
            <p className="mt-4 inline-block rounded-full bg-[var(--twin-cta)] px-5 py-2 text-sm font-semibold text-white shadow-sm">
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
              <div className="mt-1 text-xl font-bold text-[var(--foreground)]">{money(totalSavings)}</div>
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
            <p className="mt-3 text-3xl font-bold text-[var(--twin-link)]">{money(candidateBonus)}</p>
            <p className="mt-1 text-sm text-[var(--twin-muted)]">{t("calculator.candidateCardSub")}</p>
            <ul className="mt-4 space-y-2 border-t border-[var(--twin-border)] pt-4 text-sm text-[var(--twin-muted-strong)]">
              <li>{t("calculator.candidateB1")}</li>
              <li>{t("calculator.candidateB2")}</li>
              <li>{t("calculator.candidateB3")}</li>
            </ul>
          </section>
          <section className="twin-card-panel rounded-xl border border-[var(--twin-border)] p-5 sm:p-6">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">{t("calculator.companyCardTitle")}</h3>
            <p className="mt-3 text-3xl font-bold text-[var(--twin-cta)]">{money(savingsPerHire)}</p>
            <p className="mt-1 text-sm text-[var(--twin-muted)]">{t("calculator.companyCardSub")}</p>
            <ul className="mt-4 space-y-2 border-t border-[var(--twin-border)] pt-4 text-sm text-[var(--twin-muted-strong)]">
              <li>{t("calculator.companyB1")}</li>
              <li>{t("calculator.companyB2")}</li>
              <li>{t("calculator.companyB3")}</li>
            </ul>
          </section>
        </div>

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
                  {money(integrationFee)}
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
                  <div className="mt-1 text-xl font-bold text-[var(--twin-link)]">{money(timeValueSavings)}</div>
                  <div className="text-xs text-[var(--twin-muted)]">
                    {t("calculator.timeSavingsSub")
                      .replace("{{hours}}", String(hrHoursSaved))
                      .replace("{{rate}}", String(hrHourlyRate))
                      .replace("{{code}}", currency)}
                  </div>
                </div>
                <div className="twin-card-inset rounded-lg p-4">
                  <div className="text-sm text-[var(--twin-muted)]">{t("calculator.hireCostSavings")}</div>
                  <div className="mt-1 text-xl font-bold text-[var(--twin-link)]">{money(costSavings)}</div>
                  <div className="text-xs text-[var(--twin-muted)]">
                    {t("calculator.hireCostSavingsSub")
                      .replace("{{perHire}}", money(savingsPerHire))
                      .replace("{{hires}}", String(numberOfHires))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-gradient-to-r from-[var(--twin-accent)] to-[var(--twin-accent-hover)] p-5 text-white shadow-md sm:p-6">
            <div className="grid gap-4 text-center sm:grid-cols-3">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-white/80">{t("calculator.totalValue")}</div>
                <div className="mt-1 text-2xl font-bold">{money(totalEnterpriseValue)}</div>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-white/80">{t("calculator.netBenefit")}</div>
                <div className="mt-1 text-2xl font-bold">{money(totalEnterpriseValue - integrationFee)}</div>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-white/80">{t("calculator.roiLabel")}</div>
                <div className="mt-1 text-2xl font-bold">{enterpriseROI !== null ? `${enterpriseROI}%` : "—"}</div>
              </div>
            </div>
          </div>

          <p className="mt-5 text-center text-xs leading-relaxed text-[var(--twin-muted)] sm:text-sm">
            {t("calculator.enterpriseFoot")}
          </p>
        </section>

        <p className="mt-8 text-center text-xs leading-relaxed text-[var(--twin-muted-strong)] sm:text-sm">
          {t("calculator.footerNote")}
        </p>
      </MarketingPageSurface>
    </Shell>
  );
}
