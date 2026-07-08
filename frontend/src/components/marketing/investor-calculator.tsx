"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { InvestorCalculatorSliderGuide } from "@/components/marketing/investor-calculator-slider-guide";
import { MarketingPageSurface } from "@/components/marketing/marketing-page-surface";
import { MvpLiveStatsStrip } from "@/components/marketing/mvp-live-stats-strip";
import { Input, Shell } from "@/components/ui";
import { convertModelUsdToDisplay } from "@/lib/calculator-fx";
import { numberFormatLocaleForUi } from "@/lib/calculator-currencies";
import {
  REFERRAL_BONUS_FIRST_PAYMENT_USD,
  REFERRAL_BONUS_HIRED_USD,
  REFERRAL_BONUS_RETAINED_3M_USD,
} from "@/lib/candidate-rewards-constants";
import {
  computeInvestorCalculator,
  INVESTOR_CALCULATOR_DEFAULTS,
  patchScenario,
  type InvestorCalculatorInputs,
  type InvestorModelCurrency,
  type InvestorScenario,
} from "@/lib/investor-calculator-model";
import type { Locale } from "@/lib/i18n";
import { INVESTOR_CALCULATOR_ILLUSTRATIVE_ONLY } from "@/lib/seven-day-d5-investor";
import {
  effectiveMonthlySubscriptionUsd,
  formatCandidateListPriceUsd,
  formatPlanPrice,
} from "@/lib/pricing-locale";

const INVESTOR_CURRENCIES: InvestorModelCurrency[] = ["USD", "EUR", "PLN", "GBP"];

function formatModelMoney(usd: number, locale: Locale, currency: InvestorModelCurrency, maximumFractionDigits = 0) {
  const loc = numberFormatLocaleForUi(locale);
  const amount = convertModelUsdToDisplay(usd, currency);
  try {
    return new Intl.NumberFormat(loc, {
      style: "currency",
      currency,
      maximumFractionDigits,
      minimumFractionDigits: maximumFractionDigits > 0 ? maximumFractionDigits : 0,
    }).format(amount);
  } catch {
    return `${amount.toFixed(maximumFractionDigits)} ${currency}`;
  }
}

const inputClass =
  "w-full min-w-0 rounded border border-[var(--twin-border)] bg-[var(--twin-input-bg)] px-3 py-2 text-sm font-medium text-[var(--foreground)] focus:border-[var(--twin-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--twin-accent)]/20";

function IconTarget({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconDollar({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function IconTrend({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M23 6l-9.5 9.5-5-5L1 18" />
      <path d="M17 6h6v6" />
    </svg>
  );
}

function IconZap({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}

function IconUsers({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function KpiCard({
  accentClass,
  icon,
  label,
  value,
  sub,
  foot,
}: {
  accentClass: string;
  icon: ReactNode;
  label: string;
  value: string;
  sub: string;
  foot?: ReactNode;
}) {
  return (
    <div className={`min-w-0 overflow-hidden rounded-2xl p-4 text-white shadow-lg sm:p-5 ${accentClass}`}>
      <div className="mb-2 flex min-w-0 items-start gap-2 opacity-95">
        <span className="mt-0.5 shrink-0 opacity-90">{icon}</span>
        <div className="min-w-0 text-sm leading-snug">{label}</div>
      </div>
      <div className="text-xl font-bold leading-tight tabular-nums tracking-tight sm:text-2xl lg:text-3xl">{value}</div>
      <div className="mt-1 break-words text-sm leading-snug opacity-85">{sub}</div>
      {foot ? (
        <div className="mt-2 break-words border-t border-white/20 pt-2 text-xs leading-snug opacity-90">{foot}</div>
      ) : null}
    </div>
  );
}

function ScenarioButton({
  active,
  onClick,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-w-0 rounded-xl border-2 p-4 text-left transition ${
        active
          ? "border-[var(--twin-accent)] bg-[var(--twin-accent-muted)] shadow-md"
          : "border-[var(--twin-border)] hover:border-[var(--twin-border-hover)]"
      }`}
    >
      <div className="font-bold text-[var(--foreground)]">{title}</div>
      <div className="mt-1 break-words text-sm leading-snug text-[var(--twin-muted-strong)]">{desc}</div>
    </button>
  );
}

function RangeRow({
  label,
  min,
  max,
  step,
  value,
  onChange,
  minLabel,
  maxLabel,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (n: number) => void;
  minLabel: string;
  maxLabel: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-[var(--twin-muted-strong)]">{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--twin-accent)]"
      />
      <div className="mt-1 flex justify-between text-xs text-[var(--twin-muted)]">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}

/** Investor-facing financial model (illustrative). Model amounts are USD; display uses selected currency with static FX. */
export function InvestorCalculator() {
  const { t, locale } = useTranslation();
  const [scenario, setScenario] = useState<InvestorScenario>("current");
  const [inputs, setInputs] = useState<InvestorCalculatorInputs>(INVESTOR_CALCULATOR_DEFAULTS);

  const c = inputs.currency;

  const calc = useMemo(() => computeInvestorCalculator(inputs), [inputs]);

  const money = (usd: number, digits = 0) => formatModelMoney(usd, locale, c, digits);

  const applyScenario = (s: InvestorScenario) => {
    setScenario(s);
    setInputs((prev) => ({
      ...INVESTOR_CALCULATOR_DEFAULTS,
      currency: prev.currency,
      ...patchScenario(s),
    }));
  };

  const firstProfitIdx = calc.projection.findIndex((p) => p.netIncome >= 0);
  const peopleCount =
    inputs.seniorEngineers + inputs.otherEngineers + inputs.productManager + inputs.otherRoles + 1;

  const beDisplay =
    calc.breakEvenUsers < Number.POSITIVE_INFINITY ? Math.round(calc.breakEvenUsers).toLocaleString(locale) : "—";

  const yearsBe =
    calc.yearsToBreakEven > 0 ? `${calc.yearsToBreakEven.toFixed(1)}${t("investorCalc.yearsShort")}` : calc.netIncome >= 0 ? t("investorCalc.nowShort") : "∞";

  const subPriceLabel =
    inputs.subscriptionPrice <= 5.5
      ? formatPlanPrice("premium", locale)
      : formatPlanPrice("pro", locale);

  const scenarioDesc = (payPct: number, placePct: number, monthlyUsd: number) => {
    const price =
      monthlyUsd <= 5.5 ? formatPlanPrice("premium", locale) : formatPlanPrice("pro", locale);
    return t("investorCalc.scenarioDesc")
      .replace("{{pay}}", String(payPct))
      .replace("{{place}}", String(placePct))
      .replace("{{price}}", price);
  };

  const effectiveMonthlyUsd = effectiveMonthlySubscriptionUsd(
    inputs.subscriptionPrice,
    inputs.annualPrepayShare,
  );

  const listPrice = (usd: number) => formatCandidateListPriceUsd(usd, locale);

  const referralTierLabel = (key: "bonusActivation" | "bonusRetained3m" | "bonusHire", usd: number) =>
    t(`investorCalc.${key}`).replace("{amount}", listPrice(usd));

  const programReferralPnl = t("investorCalc.programReferralPnl")
    .replace("{first}", listPrice(REFERRAL_BONUS_FIRST_PAYMENT_USD))
    .replace("{retained}", listPrice(REFERRAL_BONUS_RETAINED_3M_USD))
    .replace("{hired}", listPrice(REFERRAL_BONUS_HIRED_USD));

  const programFoundingPnl = t("investorCalc.programFoundingPnl")
    .replace("{months}", String(inputs.foundingFreePremiumMonths))
    .replace("{cohort}", inputs.foundingCohortSize.toLocaleString(locale));

  const programInterviewPnl = t("investorCalc.programInterviewPnl")
    .replace("{amount}", listPrice(inputs.interviewBonusUsd))
    .replace("{max}", String(inputs.interviewBonusMaxPerQuarter));

  return (
    <Shell wide rail>
      <MarketingPageSurface wide withCard={false}>
        <header className="mb-8 text-center sm:mb-10">
          <h1 className="twin-page-intro twin-section-title text-2xl sm:text-3xl">{t("investorCalc.title")}</h1>
          <p className="mx-auto mt-3 max-w-3xl text-sm leading-relaxed text-[var(--twin-muted-strong)] sm:text-base">
            {t("investorCalc.lead")}
          </p>
          <p className="mx-auto mt-2 max-w-2xl text-xs text-[var(--twin-muted-strong)]">{t("investorCalc.disclaimer")}</p>
          {INVESTOR_CALCULATOR_ILLUSTRATIVE_ONLY ? (
            <p className="mx-auto mt-2 max-w-2xl text-xs text-[var(--twin-muted-strong)]" data-seven-day-investor-calculator-illustrative>
              {t("sevenDayD5.calculatorIllustrativeBody")}
            </p>
          ) : null}
        </header>

        <MvpLiveStatsStrip />

        <section className="twin-card-panel mb-6 p-5 sm:p-6">
          <h2 className="twin-section-title mb-4 text-lg">{t("investorCalc.quickScenarios")}</h2>
          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ScenarioButton
              active={scenario === "current"}
              onClick={() => applyScenario("current")}
              title={t("investorCalc.scenarioCurrent")}
              desc={scenarioDesc(10, 5, 4.99)}
            />
            <ScenarioButton
              active={scenario === "optimized"}
              onClick={() => applyScenario("optimized")}
              title={t("investorCalc.scenarioOptimized")}
              desc={scenarioDesc(15, 10, 4.99)}
            />
            <ScenarioButton
              active={scenario === "aggressive"}
              onClick={() => applyScenario("aggressive")}
              title={t("investorCalc.scenarioAggressive")}
              desc={scenarioDesc(20, 20, 9.99)}
            />
          </div>
        </section>

        <InvestorCalculatorSliderGuide />

        <div className="mb-6 grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard
            accentClass="bg-gradient-to-br from-cyan-600 to-teal-700"
            icon={<IconDollar className="h-5 w-5" />}
            label={t("investorCalc.kpiMrr")}
            value={money(calc.mrr, 0)}
            sub={t("investorCalc.kpiMrrSub")}
            foot={`${t("investorCalc.kpiSubMrr")}: ${money(calc.subscriptionMrr, 0)} · ${t("investorCalc.kpiPlaceMrr")}: ${money(calc.placementMrr, 0)}`}
          />
          <KpiCard
            accentClass="bg-gradient-to-br from-indigo-600 to-blue-800"
            icon={<IconTrend className="h-5 w-5" />}
            label={t("investorCalc.kpiArr")}
            value={money(calc.arr, 0)}
            sub={t("investorCalc.kpiArrSub")}
            foot={`${t("investorCalc.kpiSubArr")}: ${money(calc.subscriptionArr, 0)} · ${t("investorCalc.kpiPlaceArr")}: ${money(calc.placementArr, 0)}`}
          />
          <KpiCard
            accentClass="bg-gradient-to-br from-sky-600 to-blue-700"
            icon={<IconTarget className="h-5 w-5" />}
            label={t("investorCalc.kpiBreakEven")}
            value={beDisplay}
            sub={t("investorCalc.kpiBreakEvenSub")}
            foot={
              calc.usersNeeded > 0
                ? `${t("investorCalc.moreUsers")}: +${Math.round(calc.usersNeeded).toLocaleString(locale)} (${calc.growthNeeded.toFixed(1)}%)`
                : undefined
            }
          />
          <KpiCard
            accentClass={
              calc.netIncome >= 0
                ? "bg-gradient-to-br from-emerald-600 to-teal-700"
                : "bg-gradient-to-br from-rose-600 to-red-700"
            }
            icon={<IconDollar className="h-5 w-5" />}
            label={t("investorCalc.kpiNetIncome")}
            value={money(calc.netIncome, 0)}
            sub={`${calc.margin.toFixed(1)}% ${t("investorCalc.margin")}`}
            foot={calc.netIncome >= 0 ? t("investorCalc.profitableTag") : t("investorCalc.lossTag")}
          />
          <KpiCard
            accentClass="bg-gradient-to-br from-violet-600 to-indigo-700"
            icon={<IconTrend className="h-5 w-5" />}
            label={t("investorCalc.kpiRevPerUser")}
            value={money(calc.revenuePerUser, 2)}
            sub={t("investorCalc.perYear")}
            foot={`${t("investorCalc.contribution")}: ${money(calc.contributionMargin, 2)}`}
          />
          <KpiCard
            accentClass="bg-gradient-to-br from-amber-600 to-orange-700"
            icon={<IconZap className="h-5 w-5" />}
            label={t("investorCalc.kpiTimeBe")}
            value={yearsBe}
            sub={t("investorCalc.kpiTimeBeSub").replace("{{pct}}", String(inputs.viralGrowthRate))}
            foot={
              calc.yearsToBreakEven > 0
                ? t("investorCalc.reachUsers").replace("{{n}}", beDisplay)
                : undefined
            }
          />
        </div>

        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          <section className="twin-card-panel p-5 sm:p-6">
            <h3 className="twin-section-title mb-4 flex items-center gap-2 text-lg">
              <IconUsers className="h-5 w-5 shrink-0 text-[var(--twin-accent)]" />
              {t("investorCalc.sectionUserRev")}
            </h3>
            <div className="mb-5 rounded-xl border border-[var(--twin-border)] bg-[var(--twin-surface-raised)]/60 p-4">
              <label className="mb-1.5 block text-sm font-medium text-[var(--twin-muted-strong)]">{t("calculator.currency")}</label>
              <select
                value={c}
                onChange={(e) =>
                  setInputs({ ...inputs, currency: e.target.value as InvestorModelCurrency })
                }
                className={inputClass}
              >
                {INVESTOR_CURRENCIES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-[var(--twin-muted)]">{t("investorCalc.fxNote")}</p>
            </div>
            <div className="space-y-4">
              <RangeRow
                label={`${t("investorCalc.totalUsers")}: ${inputs.totalUsers.toLocaleString(locale)}`}
                min={10_000}
                max={1_000_000}
                step={10_000}
                value={inputs.totalUsers}
                onChange={(n) => setInputs({ ...inputs, totalUsers: n })}
                minLabel="10K"
                maxLabel="1M"
              />
              <RangeRow
                label={`${t("investorCalc.percentPaying")}: ${inputs.percentPaying}% (${Math.round(calc.payingUsers).toLocaleString(locale)})`}
                min={5}
                max={30}
                step={0.5}
                value={inputs.percentPaying}
                onChange={(n) => setInputs({ ...inputs, percentPaying: n })}
                minLabel="5%"
                maxLabel="30%"
              />
              <RangeRow
                label={`${t("investorCalc.subPrice")}: ${subPriceLabel}${t("investorCalc.perMonth")}`}
                min={2.99}
                max={29.99}
                step={0.5}
                value={inputs.subscriptionPrice}
                onChange={(n) => setInputs({ ...inputs, subscriptionPrice: n })}
                minLabel={money(2.99, 2)}
                maxLabel={money(29.99, 2)}
              />
              <RangeRow
                label={`${t("investorCalc.annualPrepayShare")}: ${Math.round(inputs.annualPrepayShare * 100)}%`}
                min={0}
                max={100}
                step={5}
                value={Math.round(inputs.annualPrepayShare * 100)}
                onChange={(n) => setInputs({ ...inputs, annualPrepayShare: n / 100 })}
                minLabel="0%"
                maxLabel="100%"
              />
              <p className="text-xs text-[var(--twin-muted)]">{t("investorCalc.annualPrepayHint")}</p>
              <RangeRow
                label={`${t("investorCalc.placementRate")}: ${inputs.placementRate}% (${Math.round(calc.placementsPerYear).toLocaleString(locale)} ${t("investorCalc.hiresPerYear")})`}
                min={1}
                max={20}
                step={0.5}
                value={inputs.placementRate}
                onChange={(n) => setInputs({ ...inputs, placementRate: n })}
                minLabel="1%"
                maxLabel="20%"
              />
              <RangeRow
                label={`${t("investorCalc.avgSalary")}: ${money(inputs.averageSalary, 0)}${t("investorCalc.perYear")}`}
                min={30_000}
                max={150_000}
                step={5000}
                value={inputs.averageSalary}
                onChange={(n) => setInputs({ ...inputs, averageSalary: n })}
                minLabel={money(30_000, 0)}
                maxLabel={money(150_000, 0)}
              />
              <RangeRow
                label={`${t("investorCalc.employerPlacementFee")}: ${inputs.successFeePercent}%`}
                min={40}
                max={60}
                step={5}
                value={inputs.successFeePercent}
                onChange={(n) => setInputs({ ...inputs, successFeePercent: n })}
                minLabel="40%"
                maxLabel="60%"
              />
              <p className="text-sm text-[var(--twin-muted-strong)]">
                {t("investorCalc.placementTakeRate")}:{" "}
                <span className="font-semibold text-[var(--foreground)]">
                  {calc.twinNetPlacementPctOfMonthlySalary.toFixed(1)}% {t("investorCalc.ofMonthlySalary")}
                </span>
                {" · "}
                {t("investorCalc.avgToTwin")} {money(calc.avgSuccessFee, 0)}
              </p>
              <p className="text-xs text-[var(--twin-muted)]">{t("investorCalc.placementNetNote")}</p>
              <p className="text-xs text-[var(--twin-muted)]">
                {t("investorCalc.placementPayoutDelay")}:{" "}
                {t("investorCalc.placementPayoutDays").replace("{{n}}", String(inputs.placementPayoutDelayDays))}
              </p>
            </div>
          </section>

          <section className="twin-card-panel p-5 sm:p-6">
            <h3 className="twin-section-title mb-4 flex items-center gap-2 text-lg">
              <IconZap className="h-5 w-5 shrink-0 text-[var(--twin-accent)]" />
              {t("investorCalc.sectionGrowth")}
            </h3>
            <div className="space-y-4">
              <RangeRow
                label={`${t("investorCalc.viralGrowth")}: ${inputs.viralGrowthRate}%`}
                min={0}
                max={50}
                step={0.5}
                value={inputs.viralGrowthRate}
                onChange={(n) => setInputs({ ...inputs, viralGrowthRate: n })}
                minLabel="0%"
                maxLabel="50%"
              />
              <div className="rounded-xl border border-[var(--twin-border)] bg-[var(--twin-accent-muted)]/25 p-4">
                <h4 className="mb-3 font-semibold text-[var(--foreground)]">{t("investorCalc.linkedInProgram")}</h4>
                <RangeRow
                  label={`${t("investorCalc.candidateShare")}: ${inputs.linkedInIncentivePercent}%`}
                  min={50}
                  max={90}
                  step={5}
                  value={inputs.linkedInIncentivePercent}
                  onChange={(n) => setInputs({ ...inputs, linkedInIncentivePercent: n })}
                  minLabel="50%"
                  maxLabel="90%"
                />
                <RangeRow
                  label={`${t("investorCalc.linkedInAdopt")}: ${inputs.linkedInAdoptionRate}%`}
                  min={20}
                  max={100}
                  step={5}
                  value={inputs.linkedInAdoptionRate}
                  onChange={(n) => setInputs({ ...inputs, linkedInAdoptionRate: n })}
                  minLabel="20%"
                  maxLabel="100%"
                />
              </div>
              <div className="rounded-xl border border-[var(--twin-border)] bg-emerald-500/10 p-4 dark:bg-emerald-950/30">
                <h4 className="mb-3 font-semibold text-[var(--foreground)]">{t("investorCalc.referralProgram")}</h4>
                <RangeRow
                  label={`${t("investorCalc.referralRate")}: ${inputs.referralRate}%`}
                  min={10}
                  max={80}
                  step={5}
                  value={inputs.referralRate}
                  onChange={(n) => setInputs({ ...inputs, referralRate: n })}
                  minLabel="10%"
                  maxLabel="80%"
                />
                <RangeRow
                  label={`${referralTierLabel("bonusActivation", inputs.referralBonusPerActivation)}`}
                  min={5}
                  max={50}
                  step={5}
                  value={inputs.referralBonusPerActivation}
                  onChange={(n) => setInputs({ ...inputs, referralBonusPerActivation: n })}
                  minLabel={listPrice(5)}
                  maxLabel={listPrice(50)}
                />
                <RangeRow
                  label={`${referralTierLabel("bonusRetained3m", inputs.referralBonusRetained3m)}`}
                  min={10}
                  max={75}
                  step={5}
                  value={inputs.referralBonusRetained3m}
                  onChange={(n) => setInputs({ ...inputs, referralBonusRetained3m: n })}
                  minLabel={listPrice(10)}
                  maxLabel={listPrice(75)}
                />
                <RangeRow
                  label={`${t("investorCalc.referralRetention3m")}: ${inputs.referralRetention3mRate}%`}
                  min={10}
                  max={100}
                  step={5}
                  value={inputs.referralRetention3mRate}
                  onChange={(n) => setInputs({ ...inputs, referralRetention3mRate: n })}
                  minLabel="10%"
                  maxLabel="100%"
                />
                <RangeRow
                  label={`${referralTierLabel("bonusHire", inputs.referralBonusPerHire)}`}
                  min={50}
                  max={300}
                  step={25}
                  value={inputs.referralBonusPerHire}
                  onChange={(n) => setInputs({ ...inputs, referralBonusPerHire: n })}
                  minLabel={listPrice(50)}
                  maxLabel={listPrice(300)}
                />
              </div>
              <div className="rounded-xl border border-[var(--twin-border)] bg-violet-500/10 p-4 dark:bg-violet-950/30">
                <h4 className="mb-3 font-semibold text-[var(--foreground)]">{t("investorCalc.programFounding")}</h4>
                <RangeRow
                  label={`${t("investorCalc.foundingCohortSize")}: ${inputs.foundingCohortSize.toLocaleString(locale)}`}
                  min={100}
                  max={5000}
                  step={100}
                  value={inputs.foundingCohortSize}
                  onChange={(n) => setInputs({ ...inputs, foundingCohortSize: n })}
                  minLabel="100"
                  maxLabel="5K"
                />
                <RangeRow
                  label={`${t("investorCalc.foundingFreeMonths")}: ${inputs.foundingFreePremiumMonths}`}
                  min={0}
                  max={12}
                  step={1}
                  value={inputs.foundingFreePremiumMonths}
                  onChange={(n) => setInputs({ ...inputs, foundingFreePremiumMonths: n })}
                  minLabel="0"
                  maxLabel="12"
                />
              </div>
              <div className="rounded-xl border border-[var(--twin-border)] bg-sky-500/10 p-4 dark:bg-sky-950/30">
                <h4 className="mb-3 font-semibold text-[var(--foreground)]">{t("investorCalc.programInterview")}</h4>
                <RangeRow
                  label={`${t("investorCalc.interviewAdoption")}: ${inputs.interviewBonusAdoptionRate}%`}
                  min={0}
                  max={50}
                  step={1}
                  value={inputs.interviewBonusAdoptionRate}
                  onChange={(n) => setInputs({ ...inputs, interviewBonusAdoptionRate: n })}
                  minLabel="0%"
                  maxLabel="50%"
                />
                <RangeRow
                  label={`${t("investorCalc.interviewAvgSlots")}: ${inputs.interviewAvgSlotsPerActiveUser}`}
                  min={0}
                  max={inputs.interviewBonusMaxPerQuarter * 4}
                  step={1}
                  value={inputs.interviewAvgSlotsPerActiveUser}
                  onChange={(n) => setInputs({ ...inputs, interviewAvgSlotsPerActiveUser: n })}
                  minLabel="0"
                  maxLabel={String(inputs.interviewBonusMaxPerQuarter * 4)}
                />
                <p className="text-xs text-[var(--twin-muted)]">
                  {t("investorCalc.interviewMaxPerQuarter")}: {inputs.interviewBonusMaxPerQuarter} ·{" "}
                  {listPrice(inputs.interviewBonusUsd)}/slot
                </p>
              </div>
            </div>
          </section>
        </div>

        <section className="twin-card-panel mb-6 p-5 sm:p-6">
          <h3 className="twin-section-title mb-4 text-lg">{t("investorCalc.sectionCandidateRewards")}</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <RewardProgramCard
              title={t("investorCalc.programPlacement")}
              detail={t("investorCalc.programPlacementPnl")}
              value={money(calc.successFeeRevenue, 0)}
              valueClass="text-emerald-700 dark:text-emerald-300"
              sub={`${calc.twinNetPlacementPctOfMonthlySalary.toFixed(1)}% ${t("investorCalc.ofMonthlySalary")}`}
            />
            <RewardProgramCard
              title={t("investorCalc.programReferral")}
              detail={programReferralPnl}
              value={money(-calc.referralCosts, 0)}
              valueClass="text-rose-700 dark:text-rose-300"
              sub={`${money(calc.referralCostBreakdown.activation, 0)} + ${money(calc.referralCostBreakdown.retained3m, 0)} + ${money(calc.referralCostBreakdown.hire, 0)}`}
            />
            <RewardProgramCard
              title={t("investorCalc.programFounding")}
              detail={programFoundingPnl}
              value={money(-calc.foundingRevenueDrag, 0)}
              valueClass="text-amber-700 dark:text-amber-300"
              sub={t("investorCalc.subscriptionGrossNote")}
            />
            <RewardProgramCard
              title={t("investorCalc.programInterview")}
              detail={programInterviewPnl}
              value={money(-calc.interviewBonusCosts, 0)}
              valueClass="text-rose-700 dark:text-rose-300"
              sub={`${inputs.interviewBonusAdoptionRate}% × ${inputs.interviewAvgSlotsPerActiveUser} slots`}
            />
          </div>
        </section>

        <section className="twin-card-panel mb-6 p-5 sm:p-6">
          <h3 className="twin-section-title mb-4 text-lg">{t("investorCalc.sectionCosts")}</h3>
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <h4 className="mb-3 font-semibold text-[var(--foreground)]">{t("investorCalc.team")}</h4>
              <div className="space-y-2 text-sm">
                <FieldNum
                  label={t("investorCalc.seniorSalary").replace("{{n}}", String(inputs.seniorEngineers))}
                  value={inputs.seniorEngineerSalary}
                  onChange={(n) => setInputs({ ...inputs, seniorEngineerSalary: n })}
                />
                <FieldNum
                  label={t("investorCalc.otherEngSalary").replace("{{n}}", String(inputs.otherEngineers))}
                  value={inputs.otherEngineerSalary}
                  onChange={(n) => setInputs({ ...inputs, otherEngineerSalary: n })}
                />
                <FieldNum
                  label={t("investorCalc.pmSalary")}
                  value={inputs.productManagerSalary}
                  onChange={(n) => setInputs({ ...inputs, productManagerSalary: n })}
                />
                <FieldNum
                  label={t("investorCalc.otherRolesSalary").replace("{{n}}", String(inputs.otherRoles))}
                  value={inputs.otherRolesSalary}
                  onChange={(n) => setInputs({ ...inputs, otherRolesSalary: n })}
                />
                <p className="border-t border-[var(--twin-border)] pt-2 text-xs text-[var(--twin-muted)]">{t("investorCalc.teamTotal")}</p>
                <p className="font-bold text-[var(--foreground)]">{money(calc.teamCosts, 0)}</p>
              </div>
            </div>
            <div>
              <h4 className="mb-3 font-semibold text-[var(--foreground)]">{t("investorCalc.infraTitle")}</h4>
              <div className="space-y-2 text-sm">
                <FieldNum
                  label={t("investorCalc.hosting")}
                  value={inputs.hostingCostPerUser}
                  onChange={(n) => setInputs({ ...inputs, hostingCostPerUser: n })}
                  step={0.01}
                />
                <FieldNum
                  label={t("investorCalc.api")}
                  value={inputs.apiCostPerUser}
                  onChange={(n) => setInputs({ ...inputs, apiCostPerUser: n })}
                  step={0.01}
                />
                <FieldNum
                  label={t("investorCalc.services")}
                  value={inputs.servicesCostPerUser}
                  onChange={(n) => setInputs({ ...inputs, servicesCostPerUser: n })}
                  step={0.01}
                />
                <p className="border-t border-[var(--twin-border)] pt-2 text-xs text-[var(--twin-muted)]">{t("investorCalc.infraTotal")}</p>
                <p className="font-bold text-[var(--foreground)]">{money(calc.totalInfrastructure, 0)}</p>
              </div>
            </div>
            <div>
              <h4 className="mb-3 font-semibold text-[var(--foreground)]">{t("investorCalc.otherFixed")}</h4>
              <div className="space-y-2 text-sm">
                <FieldNum
                  label={t("investorCalc.legal")}
                  value={inputs.legalAccounting}
                  onChange={(n) => setInputs({ ...inputs, legalAccounting: n })}
                />
                <FieldNum
                  label={t("investorCalc.office")}
                  value={inputs.officeMisc}
                  onChange={(n) => setInputs({ ...inputs, officeMisc: n })}
                />
                <p className="text-xs text-[var(--twin-muted)]">{t("investorCalc.rowCandidateRewards")}</p>
                <p className="rounded border border-[var(--twin-border)] bg-[var(--twin-surface-raised)] px-2 py-1 font-mono text-sm">
                  {money(calc.candidateRewardCosts, 0)}
                </p>
                <p className="border-t border-[var(--twin-border)] pt-2 text-xs text-[var(--twin-muted)]">{t("investorCalc.allCosts")}</p>
                <p className="font-bold text-rose-700 dark:text-rose-300">{money(calc.totalCosts, 0)}</p>
              </div>
            </div>
          </div>
        </section>

        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          <BreakdownCard
            title={t("investorCalc.revTitle")}
            rows={[
              {
                title: t("investorCalc.rowSubscriptions"),
                detail: `${Math.round(calc.payingUsers).toLocaleString(locale)} × ${money(effectiveMonthlyUsd, 2)} × 12`,
                value: money(calc.subscriptionRevenueGross, 0),
                pct: calc.totalRevenue > 0 ? (calc.subscriptionRevenueGross / calc.totalRevenue) * 100 : 0,
                valueClass: "text-sky-700 dark:text-sky-300",
              },
              {
                title: t("investorCalc.rowFoundingDrag"),
                detail: t("investorCalc.programFounding"),
                value: money(-calc.foundingRevenueDrag, 0),
                pct: calc.totalRevenue > 0 ? (-calc.foundingRevenueDrag / calc.totalRevenue) * 100 : 0,
                valueClass: "text-amber-700 dark:text-amber-300",
              },
              {
                title: t("investorCalc.rowSuccessFees"),
                detail: `${Math.round(calc.placementsPerYear).toLocaleString(locale)} × ${money(calc.avgSuccessFee, 0)}`,
                value: money(calc.successFeeRevenue, 0),
                pct: calc.totalRevenue > 0 ? (calc.successFeeRevenue / calc.totalRevenue) * 100 : 0,
                valueClass: "text-emerald-700 dark:text-emerald-300",
              },
            ]}
            totalLabel={t("investorCalc.totalRevenue")}
            total={money(calc.totalRevenue, 0)}
            foot={
              <>
                <div className="flex justify-between text-sm">
                  <span>{t("investorCalc.kpiMrr")}</span>
                  <span className="font-semibold">{money(calc.mrr, 0)}{t("investorCalc.perMonth")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>{t("investorCalc.kpiArr")}</span>
                  <span className="font-semibold">{money(calc.arr, 0)}{t("investorCalc.perYear")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>{t("investorCalc.revPerUser")}</span>
                  <span className="font-semibold">{money(calc.revenuePerUser, 2)}{t("investorCalc.perYear")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>{t("investorCalc.revPerPaying")}</span>
                  <span className="font-semibold">
                    {calc.payingUsers > 0 ? money(calc.totalRevenue / calc.payingUsers, 2) : "—"}
                    {t("investorCalc.perYear")}
                  </span>
                </div>
              </>
            }
          />
          <BreakdownCard
            title={t("investorCalc.costTitle")}
            rows={[
              {
                title: t("investorCalc.rowTeam"),
                detail: t("investorCalc.peopleCount").replace("{{n}}", String(peopleCount)),
                value: money(calc.teamCosts, 0),
                pct: calc.totalCosts > 0 ? (calc.teamCosts / calc.totalCosts) * 100 : 0,
                valueClass: "text-rose-700 dark:text-rose-300",
              },
              {
                title: t("investorCalc.rowInfra"),
                detail: `${money(calc.infrastructureCostPerUser, 2)} ${t("investorCalc.perUserYr")}`,
                value: money(calc.totalInfrastructure, 0),
                pct: calc.totalCosts > 0 ? (calc.totalInfrastructure / calc.totalCosts) * 100 : 0,
                valueClass: "text-amber-700 dark:text-amber-300",
              },
              {
                title: t("investorCalc.rowReferralActivation"),
                detail: listPrice(inputs.referralBonusPerActivation),
                value: money(calc.referralCostBreakdown.activation, 0),
                pct: calc.totalCosts > 0 ? (calc.referralCostBreakdown.activation / calc.totalCosts) * 100 : 0,
                valueClass: "text-violet-700 dark:text-violet-300",
              },
              {
                title: t("investorCalc.rowReferralRetained3m"),
                detail: listPrice(inputs.referralBonusRetained3m),
                value: money(calc.referralCostBreakdown.retained3m, 0),
                pct: calc.totalCosts > 0 ? (calc.referralCostBreakdown.retained3m / calc.totalCosts) * 100 : 0,
                valueClass: "text-violet-700 dark:text-violet-300",
              },
              {
                title: t("investorCalc.rowReferralHire"),
                detail: listPrice(inputs.referralBonusPerHire),
                value: money(calc.referralCostBreakdown.hire, 0),
                pct: calc.totalCosts > 0 ? (calc.referralCostBreakdown.hire / calc.totalCosts) * 100 : 0,
                valueClass: "text-violet-700 dark:text-violet-300",
              },
              {
                title: t("investorCalc.rowInterviewBonus"),
                detail: `${listPrice(inputs.interviewBonusUsd)}/slot`,
                value: money(calc.interviewBonusCosts, 0),
                pct: calc.totalCosts > 0 ? (calc.interviewBonusCosts / calc.totalCosts) * 100 : 0,
                valueClass: "text-sky-700 dark:text-sky-300",
              },
              {
                title: t("investorCalc.rowOther"),
                detail: t("investorCalc.legalOffice"),
                value: money(inputs.legalAccounting + inputs.officeMisc, 0),
                pct:
                  calc.totalCosts > 0
                    ? ((inputs.legalAccounting + inputs.officeMisc) / calc.totalCosts) * 100
                    : 0,
                valueClass: "text-[var(--twin-muted-strong)]",
              },
            ]}
            totalLabel={t("investorCalc.totalCosts")}
            total={money(calc.totalCosts, 0)}
            totalTone="danger"
            foot={
              <>
                <div className="flex justify-between text-sm">
                  <span>{t("investorCalc.costPerUser")}</span>
                  <span className="font-semibold">{money(calc.costPerUser, 2)}{t("investorCalc.perYear")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>{t("investorCalc.fixedCosts")}</span>
                  <span className="font-semibold">{money(calc.fixedCosts, 0)}</span>
                </div>
              </>
            }
          />
        </div>

        <section className="twin-card-panel mb-6 p-5 sm:p-6">
          <h3 className="twin-section-title mb-4 text-lg">{t("investorCalc.projectionTitle")}</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-sm">
              <thead>
                <tr className="border-b-2 border-[var(--twin-border)] text-left text-[var(--twin-muted-strong)]">
                  <th className="p-2">{t("investorCalc.colYear")}</th>
                  <th className="p-2 text-right">{t("investorCalc.colUsers")}</th>
                  <th className="p-2 text-right">{t("investorCalc.colRev")}</th>
                  <th className="p-2 text-right">{t("investorCalc.colCosts")}</th>
                  <th className="p-2 text-right">{t("investorCalc.colNet")}</th>
                  <th className="p-2 text-right">{t("investorCalc.colMargin")}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[var(--twin-border)] bg-[var(--twin-accent-muted)]/30">
                  <td className="p-2 font-semibold">{t("investorCalc.rowCurrent")}</td>
                  <td className="p-2 text-right font-mono tabular-nums">{inputs.totalUsers.toLocaleString(locale)}</td>
                  <td className="p-2 text-right font-mono tabular-nums">{money(calc.totalRevenue, 0)}</td>
                  <td className="p-2 text-right font-mono tabular-nums">{money(calc.totalCosts, 0)}</td>
                  <td
                    className={`p-2 text-right font-mono font-bold tabular-nums ${calc.netIncome >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}
                  >
                    {money(calc.netIncome, 0)}
                  </td>
                  <td className="p-2 text-right font-mono tabular-nums">{calc.margin.toFixed(1)}%</td>
                </tr>
                {calc.projection.map((p, rowIdx) => (
                  <tr
                    key={p.year}
                    className={`border-b border-[var(--twin-border)] ${firstProfitIdx >= 0 && rowIdx === firstProfitIdx ? "bg-emerald-500/10" : ""}`}
                  >
                    <td className="p-2">{t("investorCalc.yearN").replace("{{n}}", String(p.year))}</td>
                    <td className="p-2 text-right font-mono tabular-nums">{p.users.toLocaleString(locale)}</td>
                    <td className="p-2 text-right font-mono tabular-nums">{money(p.revenue, 0)}</td>
                    <td className="p-2 text-right font-mono tabular-nums">{money(p.costs, 0)}</td>
                    <td
                      className={`p-2 text-right font-mono font-bold tabular-nums ${p.netIncome >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}
                    >
                      {money(p.netIncome, 0)}
                    </td>
                    <td className="p-2 text-right font-mono tabular-nums">{p.margin.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {firstProfitIdx >= 0 ? (
            <div className="mt-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-950 dark:text-emerald-100">
              <p className="font-semibold">
                {t("investorCalc.beBannerTitle").replace(
                  "{{y}}",
                  String(calc.projection[firstProfitIdx]!.year),
                )}
              </p>
              <p className="mt-1 text-emerald-900/90 dark:text-emerald-200/90">
                {t("investorCalc.beBannerBody")
                  .replace("{{u}}", calc.projection[firstProfitIdx]!.users.toLocaleString(locale))
                  .replace("{{m}}", money(calc.projection[firstProfitIdx]!.netIncome, 0))}
              </p>
            </div>
          ) : null}
        </section>

        <section className="twin-card-panel mb-8 bg-gradient-to-br from-indigo-600 to-violet-800 p-6 text-white shadow-xl sm:p-8">
          <h3 className="mb-5 text-xl font-bold sm:text-2xl">{t("investorCalc.insightsTitle")}</h3>
          <div className="grid gap-6 md:grid-cols-2">
            <InsightCol
              title={t("investorCalc.insightUnit")}
              rows={[
                [t("investorCalc.insRpu"), money(calc.revenuePerUser, 2)],
                [t("investorCalc.insVcpu"), money(calc.infrastructureCostPerUser + calc.candidateRewardCostPerUser, 2)],
                [t("investorCalc.insCm"), money(calc.contributionMargin, 2)],
              ]}
            />
            <InsightCol
              title={t("investorCalc.insightPath")}
              rows={[
                [t("investorCalc.insCurU"), inputs.totalUsers.toLocaleString(locale)],
                [t("investorCalc.insBeU"), beDisplay],
                [
                  t("investorCalc.insTime"),
                  calc.yearsToBreakEven > 0
                    ? `${calc.yearsToBreakEven.toFixed(1)} ${t("investorCalc.yearsWord")}`
                    : t("investorCalc.profitableNowWord"),
                ],
              ]}
            />
            <InsightCol
              title={t("investorCalc.insightGrowth")}
              rows={[
                [t("investorCalc.insViral"), `${inputs.viralGrowthRate}%`],
                [t("investorCalc.insLi"), `${inputs.linkedInAdoptionRate}%`],
                [t("investorCalc.insRef"), `${inputs.referralRate}%`],
              ]}
            />
            <InsightCol
              title={t("investorCalc.insightEfficiency")}
              rows={[
                [t("investorCalc.insPlace"), `${inputs.placementRate}%`],
                [t("investorCalc.insPaying"), `${inputs.percentPaying}%`],
                [t("investorCalc.insMargin"), `${calc.margin.toFixed(1)}%`],
              ]}
            />
          </div>
          {calc.netIncome < 0 && calc.usersNeeded > 0 ? (
            <div className="mt-6 rounded-lg bg-white/10 p-4 text-sm backdrop-blur">
              <p className="font-semibold">{t("investorCalc.toBeTitle")}</p>
              <ul className="mt-2 list-inside list-disc space-y-1 opacity-95">
                <li>{t("investorCalc.toBe1").replace("{{n}}", Math.round(calc.usersNeeded).toLocaleString(locale)).replace("{{p}}", calc.growthNeeded.toFixed(1))}</li>
                <li>{t("investorCalc.toBe2").replace("{{y}}", calc.yearsToBreakEven.toFixed(1))}</li>
              </ul>
            </div>
          ) : null}
        </section>

        <p className="mb-4 text-center text-sm text-[var(--twin-muted-strong)]">
          <Link href="/calculator/b2b" className="twin-link font-medium">
            {t("investorCalc.linkB2b")}
          </Link>
        </p>
        <footer className="text-center text-xs text-[var(--twin-muted)]">
          <p>{t("investorCalc.footerVersion")}</p>
          <p className="mt-1">{t("investorCalc.footerLegal")}</p>
        </footer>
      </MarketingPageSurface>
    </Shell>
  );
}

function RewardProgramCard({
  title,
  detail,
  value,
  valueClass,
  sub,
}: {
  title: string;
  detail: string;
  value: string;
  valueClass: string;
  sub: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--twin-border)] bg-[var(--twin-surface-raised)]/60 p-4">
      <div className="font-semibold text-[var(--foreground)]">{title}</div>
      <p className="mt-1 text-xs leading-relaxed text-[var(--twin-muted)]">{detail}</p>
      <div className={`mt-3 text-xl font-bold tabular-nums ${valueClass}`}>{value}</div>
      <p className="mt-1 text-xs text-[var(--twin-muted-strong)]">{sub}</p>
    </div>
  );
}

function FieldNum({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-[var(--twin-muted)]">{label}</span>
      <Input
        type="number"
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value))}
        className="!mb-0 text-sm"
      />
    </label>
  );
}

function BreakdownCard({
  title,
  rows,
  totalLabel,
  total,
  totalTone,
  foot,
}: {
  title: string;
  rows: { title: string; detail: string; value: string; pct: number; valueClass: string }[];
  totalLabel: string;
  total: string;
  totalTone?: "danger";
  foot: ReactNode;
}) {
  return (
    <section className="twin-card-panel p-5 sm:p-6">
      <h3 className="twin-section-title mb-4 text-lg">{title}</h3>
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.title} className="flex flex-wrap items-start justify-between gap-2 border-b border-[var(--twin-border)] pb-3">
            <div>
              <div className="font-semibold text-[var(--foreground)]">{r.title}</div>
              <div className="text-xs text-[var(--twin-muted)]">{r.detail}</div>
            </div>
            <div className="text-right">
              <div className={`font-bold ${r.valueClass}`}>{r.value}</div>
              <div className="text-xs text-[var(--twin-muted)]">{r.pct.toFixed(0)}%</div>
            </div>
          </div>
        ))}
        <div
          className={`flex items-center justify-between rounded-lg p-3 ${
            totalTone === "danger" ? "bg-rose-500/10" : "bg-[var(--twin-accent-muted)]/35"
          }`}
        >
          <span className="font-bold text-[var(--foreground)]">{totalLabel}</span>
          <span className={`text-xl font-bold ${totalTone === "danger" ? "text-rose-700 dark:text-rose-300" : ""}`}>
            {total}
          </span>
        </div>
        <div className="space-y-1 border-t border-[var(--twin-border)] pt-3 text-[var(--twin-muted-strong)]">{foot}</div>
      </div>
    </section>
  );
}

function InsightCol({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div>
      <div className="mb-2 text-sm opacity-90">{title}</div>
      <div className="space-y-2 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-2 border-b border-white/15 pb-2 last:border-0">
            <span className="opacity-90">{k}</span>
            <span className="font-bold tabular-nums">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
