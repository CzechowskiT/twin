"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import {
  INTERVIEW_BOOKED_BONUS_MAX_PER_QUARTER,
  INTERVIEW_BOOKED_BONUS_USD,
  PLACEMENT_CANDIDATE_BONUS_PCT_OF_MONTHLY_SALARY,
  PLACEMENT_EMPLOYER_FEE_PCT_OF_MONTHLY_SALARY,
  REFERRAL_BONUS_FIRST_PAYMENT_USD,
  REFERRAL_BONUS_HIRED_USD,
  REFERRAL_BONUS_RETAINED_3M_USD,
} from "@/lib/candidate-rewards-constants";
import { formatCandidateListPriceUsd } from "@/lib/pricing-locale";

type RewardRow = {
  title: string;
  trigger: string;
  reward: string;
  timing: string;
};

function interpolate(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, v), template);
}

export function CandidateRewardsBand({ variant = "home" }: { variant?: "home" | "persona" }) {
  const { locale, t } = useTranslation();

  const money = (usd: number) => formatCandidateListPriceUsd(usd, locale);

  const rows: RewardRow[] = [
    {
      title: t("candidateRewards.placementTitle"),
      trigger: t("candidateRewards.placementTrigger"),
      reward: interpolate(t("candidateRewards.placementReward"), {
        pct: String(PLACEMENT_CANDIDATE_BONUS_PCT_OF_MONTHLY_SALARY),
        feePct: String(PLACEMENT_EMPLOYER_FEE_PCT_OF_MONTHLY_SALARY),
      }),
      timing: t("candidateRewards.placementTiming"),
    },
    {
      title: t("candidateRewards.referralTitle"),
      trigger: t("candidateRewards.referralTrigger"),
      reward: interpolate(t("candidateRewards.referralReward"), {
        firstPay: money(REFERRAL_BONUS_FIRST_PAYMENT_USD),
        retained: money(REFERRAL_BONUS_RETAINED_3M_USD),
        hired: money(REFERRAL_BONUS_HIRED_USD),
      }),
      timing: t("candidateRewards.referralTiming"),
    },
    {
      title: t("candidateRewards.foundingTitle"),
      trigger: t("candidateRewards.foundingTrigger"),
      reward: t("candidateRewards.foundingReward"),
      timing: t("candidateRewards.foundingTiming"),
    },
    {
      title: t("candidateRewards.interviewTitle"),
      trigger: t("candidateRewards.interviewTrigger"),
      reward: interpolate(t("candidateRewards.interviewReward"), {
        amount: money(INTERVIEW_BOOKED_BONUS_USD),
        max: String(INTERVIEW_BOOKED_BONUS_MAX_PER_QUARTER),
      }),
      timing: t("candidateRewards.interviewTiming"),
    },
  ];

  const sectionId = variant === "persona" ? "candidate-rewards" : undefined;

  const sectionClass =
    variant === "home"
      ? "candidate-rewards-band scroll-mt-24 border-t border-[var(--twin-border)]/60 py-10 sm:py-12"
      : "candidate-rewards-band scroll-mt-24 rounded-2xl border border-[var(--twin-border)] bg-[var(--twin-surface-raised)]/90 py-8 sm:py-10";

  return (
    <section id={sectionId} className={sectionClass} aria-labelledby="candidate-rewards-heading">
      <div className={variant === "home" ? "marketing-home-rail" : ""}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-muted)]">
          {t("candidateRewards.eyebrow")}
        </p>
        <h2
          id="candidate-rewards-heading"
          className="marketing-home-headline mt-3 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)] sm:text-3xl"
        >
          {t("candidateRewards.headline")}
        </h2>
        <p className="marketing-home-lede mt-3 text-sm leading-relaxed text-[var(--twin-muted-strong)] sm:text-base">
          {t("candidateRewards.lead")}
        </p>

        <div className="mt-8 overflow-x-auto rounded-2xl border border-[var(--twin-border)]/70 bg-[var(--twin-card)]/40 backdrop-blur-sm">
          <table className="w-full min-w-[32rem] border-collapse text-start text-sm">
            <thead>
              <tr className="border-b border-[var(--twin-border)]/60 text-[11px] font-semibold uppercase tracking-wider text-[var(--twin-muted)]">
                <th scope="col" className="px-4 py-3 sm:px-5">
                  {t("candidateRewards.colTrigger")}
                </th>
                <th scope="col" className="px-4 py-3 sm:px-5">
                  {t("candidateRewards.colReward")}
                </th>
                <th scope="col" className="hidden px-4 py-3 sm:table-cell sm:px-5">
                  {t("candidateRewards.colTiming")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.title} className="border-b border-[var(--twin-border)]/40 last:border-0">
                  <td className="align-top px-4 py-4 sm:px-5">
                    <p className="font-semibold text-[var(--foreground)]">{row.title}</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-[var(--twin-muted-strong)] sm:text-sm">
                      {row.trigger}
                    </p>
                  </td>
                  <td className="align-top px-4 py-4 text-xs leading-relaxed text-[var(--twin-muted-strong)] sm:px-5 sm:text-sm">
                    {row.reward}
                    <p className="mt-2 text-[11px] text-[var(--twin-muted)] sm:hidden">{row.timing}</p>
                  </td>
                  <td className="hidden align-top px-4 py-4 text-xs leading-relaxed text-[var(--twin-muted)] sm:table-cell sm:px-5 sm:text-sm">
                    {row.timing}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="marketing-home-lede mt-4 text-xs leading-relaxed text-[var(--twin-muted)]">
          {t("candidateRewards.mechanicsNote")}
        </p>
        <p className="marketing-home-lede mt-2 text-xs leading-relaxed text-[var(--twin-muted)]">
          {t("candidateRewards.disclaimer")}
        </p>
        <p className="mt-1 text-[11px] text-[var(--twin-muted)]">{t("candidateRewards.fraudLine")}</p>

        <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold">
          <Link href="/register/candidate" className="twin-link">
            {t("candidateRewards.ctaRegister")}
          </Link>
          <Link href="/dashboard/referrals" className="twin-link">
            {t("candidateRewards.ctaReferrals")}
          </Link>
          <Link href="/waitlist" className="twin-link">
            {t("candidateRewards.ctaFounding")}
          </Link>
          <Link href="/terms" className="twin-link">
            {t("candidateRewards.ctaTerms")}
          </Link>
          <Link href="/privacy" className="twin-link">
            {t("candidateRewards.ctaPrivacy")}
          </Link>
        </div>
      </div>
    </section>
  );
}
