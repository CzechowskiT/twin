import { fxUnitsPerUsd } from "@/lib/calculator-fx";
import {
  FOUNDING_COHORT_SIZE,
  FOUNDING_FREE_PREMIUM_MONTHS_DEFAULT,
  INTERVIEW_BOOKED_BONUS_MAX_PER_QUARTER,
  INTERVIEW_BOOKED_BONUS_USD,
  PLACEMENT_EMPLOYER_FEE_PCT_OF_MONTHLY_SALARY,
  PLACEMENT_PAYOUT_DELAY_DAYS_DEFAULT,
  REFERRAL_BONUS_FIRST_PAYMENT_USD,
  REFERRAL_BONUS_HIRED_USD,
  REFERRAL_BONUS_RETAINED_3M_USD,
} from "@/lib/candidate-rewards-constants";
import { ANNUAL_PREPAY_DISCOUNT, effectiveMonthlySubscriptionUsd } from "@/lib/pricing-locale";

/** ISO codes supported by the investor model (illustrative FX). */
export type InvestorModelCurrency = "USD" | "EUR" | "PLN" | "GBP";

/** Units of local currency per 1 USD — aligned with marketing FX table. */
export const LOCAL_PER_USD: Record<InvestorModelCurrency, number> = {
  USD: fxUnitsPerUsd("USD"),
  EUR: fxUnitsPerUsd("EUR"),
  PLN: fxUnitsPerUsd("PLN"),
  GBP: fxUnitsPerUsd("GBP"),
};

export type InvestorScenario = "current" | "optimized" | "aggressive";

export type InvestorCalculatorInputs = {
  totalUsers: number;
  percentPaying: number;
  subscriptionPrice: number;
  /** Share of paying users on annual prepay (25% off 12× monthly). */
  annualPrepayShare: number;
  placementRate: number;
  averageSalary: number;
  /** Employer success fee as % of monthly salary (default 50% = half a month). */
  successFeePercent: number;
  /** Illustrative delay before placement bonus cash payout (Terms). */
  placementPayoutDelayDays: number;
  linkedInIncentivePercent: number;
  linkedInAdoptionRate: number;
  referralBonusPerActivation: number;
  referralBonusRetained3m: number;
  referralBonusPerHire: number;
  /** Share of activated referrals who reach 3 paid months (retained tier). */
  referralRetention3mRate: number;
  referralRate: number;
  foundingCohortSize: number;
  /** Months of forgone Premium ARPU per founding member in the model year. */
  foundingFreePremiumMonths: number;
  interviewBonusUsd: number;
  interviewBonusMaxPerQuarter: number;
  /** Share of paying users who earn ≥1 interview slot bonus in the year. */
  interviewBonusAdoptionRate: number;
  /** Average confirmed slots per active user per year (capped at max/quarter × 4). */
  interviewAvgSlotsPerActiveUser: number;
  seniorEngineers: number;
  seniorEngineerSalary: number;
  otherEngineers: number;
  otherEngineerSalary: number;
  productManager: number;
  productManagerSalary: number;
  otherRoles: number;
  otherRolesSalary: number;
  founderSalary: number;
  hostingCostPerUser: number;
  apiCostPerUser: number;
  servicesCostPerUser: number;
  legalAccounting: number;
  officeMisc: number;
  organicGrowthRate: number;
  viralGrowthRate: number;
  currency: InvestorModelCurrency;
};

/** Employer pays this share of monthly salary on placement (gross success fee). */
export const PLACEMENT_EMPLOYER_FEE_PERCENT = PLACEMENT_EMPLOYER_FEE_PCT_OF_MONTHLY_SALARY;

/** TWIN net take when half the employer fee is returned to the candidate (baseline). */
export const PLACEMENT_NET_TAKE_RATE_PERCENT = 25;

export const INVESTOR_CALCULATOR_DEFAULTS: InvestorCalculatorInputs = {
  totalUsers: 100_000,
  percentPaying: 10,
  subscriptionPrice: 4.99,
  annualPrepayShare: 0.35,
  placementRate: 5,
  averageSalary: 50_000,
  successFeePercent: PLACEMENT_EMPLOYER_FEE_PERCENT,
  placementPayoutDelayDays: PLACEMENT_PAYOUT_DELAY_DAYS_DEFAULT,
  linkedInIncentivePercent: 75,
  linkedInAdoptionRate: 60,
  referralBonusPerActivation: REFERRAL_BONUS_FIRST_PAYMENT_USD,
  referralBonusRetained3m: REFERRAL_BONUS_RETAINED_3M_USD,
  referralBonusPerHire: REFERRAL_BONUS_HIRED_USD,
  referralRetention3mRate: 60,
  referralRate: 40,
  foundingCohortSize: FOUNDING_COHORT_SIZE,
  foundingFreePremiumMonths: FOUNDING_FREE_PREMIUM_MONTHS_DEFAULT,
  interviewBonusUsd: INTERVIEW_BOOKED_BONUS_USD,
  interviewBonusMaxPerQuarter: INTERVIEW_BOOKED_BONUS_MAX_PER_QUARTER,
  interviewBonusAdoptionRate: 15,
  interviewAvgSlotsPerActiveUser: 2,
  seniorEngineers: 2,
  seniorEngineerSalary: 150_000,
  otherEngineers: 2,
  otherEngineerSalary: 120_000,
  productManager: 1,
  productManagerSalary: 130_000,
  otherRoles: 2,
  otherRolesSalary: 90_000,
  founderSalary: 120_000,
  hostingCostPerUser: 1.08,
  apiCostPerUser: 0.96,
  servicesCostPerUser: 0.36,
  legalAccounting: 30_000,
  officeMisc: 20_000,
  organicGrowthRate: 7,
  viralGrowthRate: 10.5,
  currency: "USD",
};

export type ReferralCostBreakdown = {
  activation: number;
  retained3m: number;
  hire: number;
  total: number;
};

export type YearProjection = {
  year: number;
  users: number;
  revenue: number;
  costs: number;
  netIncome: number;
  margin: number;
};

export type InvestorCalculatorResults = {
  subscriptionRevenue: number;
  subscriptionRevenueGross: number;
  foundingRevenueDrag: number;
  successFeeRevenue: number;
  totalRevenue: number;
  mrr: number;
  arr: number;
  subscriptionMrr: number;
  subscriptionArr: number;
  placementMrr: number;
  placementArr: number;
  revenuePerUser: number;
  payingUsers: number;
  placementsPerYear: number;
  avgSuccessFee: number;
  twinNetPlacementPctOfMonthlySalary: number;
  teamCosts: number;
  totalInfrastructure: number;
  referralCosts: number;
  referralCostBreakdown: ReferralCostBreakdown;
  interviewBonusCosts: number;
  candidateRewardCosts: number;
  fixedCosts: number;
  variableCosts: number;
  totalCosts: number;
  costPerUser: number;
  infrastructureCostPerUser: number;
  referralCostPerUser: number;
  candidateRewardCostPerUser: number;
  netIncome: number;
  margin: number;
  contributionMargin: number;
  breakEvenUsers: number;
  usersNeeded: number;
  growthNeeded: number;
  yearsToBreakEven: number;
  projection: YearProjection[];
};

function teamCosts(i: InvestorCalculatorInputs): number {
  return (
    i.seniorEngineers * i.seniorEngineerSalary +
    i.otherEngineers * i.otherEngineerSalary +
    i.productManager * i.productManagerSalary +
    i.otherRoles * i.otherRolesSalary +
    i.founderSalary
  );
}

function effectiveMonthlyUsd(i: InvestorCalculatorInputs): number {
  return effectiveMonthlySubscriptionUsd(i.subscriptionPrice, i.annualPrepayShare);
}

function foundingMembersCount(i: InvestorCalculatorInputs, totalUsers: number): number {
  return Math.min(i.foundingCohortSize, totalUsers);
}

/** Forgone subscription ARPU from founding free Premium window (model year). */
function foundingRevenueDragUsd(i: InvestorCalculatorInputs, totalUsers: number): number {
  const members = foundingMembersCount(i, totalUsers);
  const monthsForgone = Math.min(12, Math.max(0, i.foundingFreePremiumMonths));
  return members * effectiveMonthlyUsd(i) * monthsForgone;
}

type ReferralFunnel = {
  newReferrals: number;
  activatedReferrals: number;
  retained3mReferrals: number;
  hiredReferrals: number;
};

/**
 * Referral volume for the model year: new referred users =
 * totalUsers × referralRate × viralGrowthRate (both as shares, not “% who refer once”).
 */
function referralFunnel(i: InvestorCalculatorInputs, totalUsers: number): ReferralFunnel {
  const newReferrals = totalUsers * (i.referralRate / 100) * (i.viralGrowthRate / 100);
  const activatedReferrals = newReferrals * (i.percentPaying / 100);
  const retained3mReferrals = activatedReferrals * (i.referralRetention3mRate / 100);
  const hiredReferrals = activatedReferrals * (i.placementRate / 100);
  return { newReferrals, activatedReferrals, retained3mReferrals, hiredReferrals };
}

function referralCostBreakdownUsd(i: InvestorCalculatorInputs, totalUsers: number): ReferralCostBreakdown {
  const { activatedReferrals, retained3mReferrals, hiredReferrals } = referralFunnel(i, totalUsers);
  const activation = activatedReferrals * i.referralBonusPerActivation;
  const retained3m = retained3mReferrals * i.referralBonusRetained3m;
  const hire = hiredReferrals * i.referralBonusPerHire;
  return { activation, retained3m, hire, total: activation + retained3m + hire };
}

function interviewBonusCostsUsd(i: InvestorCalculatorInputs, payingUsers: number): number {
  const maxSlotsPerUserPerYear = i.interviewBonusMaxPerQuarter * 4;
  const slotsPerActive = Math.min(maxSlotsPerUserPerYear, Math.max(0, i.interviewAvgSlotsPerActiveUser));
  const activeUsers = payingUsers * (i.interviewBonusAdoptionRate / 100);
  return activeUsers * slotsPerActive * i.interviewBonusUsd;
}

/**
 * Net placement revenue to TWIN per hire (model USD).
 * Employer pays successFeePercent of monthly salary; TWIN returns half of that fee to the candidate.
 * Baseline net to TWIN = 25% of monthly salary (not 50% gross employer fee).
 * LinkedIn viral placements share more of the employer fee with the candidate.
 */
function avgSuccessFeeUsd(i: InvestorCalculatorInputs, placementsPerYear: number): number {
  if (placementsPerYear <= 0) return 0;
  const monthlySalary = i.averageSalary / 12;
  const employerFee = monthlySalary * (i.successFeePercent / 100);
  const twinKeepsDefault = employerFee * 0.5;
  const linkedInPlacements = placementsPerYear * (i.linkedInAdoptionRate / 100);
  const nonLinkedInPlacements = placementsPerYear - linkedInPlacements;
  const twinKeepsLinkedIn = employerFee * (1 - i.linkedInIncentivePercent / 100);
  const twinKeepsNonLinkedIn = twinKeepsDefault;
  return (linkedInPlacements * twinKeepsLinkedIn + nonLinkedInPlacements * twinKeepsNonLinkedIn) / placementsPerYear;
}

function subscriptionRevenueGrossUsd(i: InvestorCalculatorInputs, payingUsers: number): number {
  return payingUsers * effectiveMonthlyUsd(i) * 12;
}

function buildProjection(
  i: InvestorCalculatorInputs,
  fixedCosts: number,
  infrastructureCostPerUser: number,
  candidateRewardCostPerUser: number,
  avgSuccessFee: number,
  growth: number,
): YearProjection[] {
  const g = growth / 100;
  const out: YearProjection[] = [];
  let currentUsers = i.totalUsers;
  for (let year = 1; year <= 5; year += 1) {
    currentUsers *= 1 + g;
    const yearPayingUsers = currentUsers * (i.percentPaying / 100);
    const yearPlacements = yearPayingUsers * (i.placementRate / 100);
    const yearSubscriptionGross = subscriptionRevenueGrossUsd(i, yearPayingUsers);
    const yearFoundingDrag = foundingRevenueDragUsd(i, currentUsers);
    const yearSubscriptionRev = yearSubscriptionGross - yearFoundingDrag;
    const yearSuccessFeeRev = yearPlacements * avgSuccessFee;
    const yearRevenue = yearSubscriptionRev + yearSuccessFeeRev;
    const yearVarCosts = currentUsers * (infrastructureCostPerUser + candidateRewardCostPerUser);
    const yearTotalCosts = fixedCosts + yearVarCosts;
    const yearNetIncome = yearRevenue - yearTotalCosts;
    const yearMargin = yearRevenue > 0 ? (yearNetIncome / yearRevenue) * 100 : 0;
    out.push({
      year,
      users: Math.round(currentUsers),
      revenue: yearRevenue,
      costs: yearTotalCosts,
      netIncome: yearNetIncome,
      margin: yearMargin,
    });
  }
  return out;
}

/** All monetary fields in model USD. */
export function computeInvestorCalculator(i: InvestorCalculatorInputs): InvestorCalculatorResults {
  const payingUsers = i.totalUsers * (i.percentPaying / 100);
  const placementsPerYear = payingUsers * (i.placementRate / 100);
  const avgSuccessFee = avgSuccessFeeUsd(i, placementsPerYear);
  const monthlySalary = i.averageSalary / 12;
  const twinNetPlacementPctOfMonthlySalary =
    monthlySalary > 0 ? (avgSuccessFee / monthlySalary) * 100 : 0;

  const subscriptionRevenueGross = subscriptionRevenueGrossUsd(i, payingUsers);
  const foundingRevenueDrag = foundingRevenueDragUsd(i, i.totalUsers);
  const subscriptionRevenue = subscriptionRevenueGross - foundingRevenueDrag;
  const successFeeRevenue = placementsPerYear * avgSuccessFee;
  const totalRevenue = subscriptionRevenue + successFeeRevenue;
  const subscriptionMrr = subscriptionRevenue / 12;
  const placementArr = successFeeRevenue;
  const placementMrr = placementArr / 12;
  const subscriptionArr = subscriptionRevenue;
  const mrr = subscriptionMrr + placementMrr;
  const arr = subscriptionArr + placementArr;
  const revenuePerUser = i.totalUsers > 0 ? totalRevenue / i.totalUsers : 0;

  const tc = teamCosts(i);
  const infrastructureCostPerUser = i.hostingCostPerUser + i.apiCostPerUser + i.servicesCostPerUser;
  const totalInfrastructure = infrastructureCostPerUser * i.totalUsers;
  const referralCostBreakdown = referralCostBreakdownUsd(i, i.totalUsers);
  const referralCosts = referralCostBreakdown.total;
  const interviewBonusCosts = interviewBonusCostsUsd(i, payingUsers);
  const candidateRewardCosts = referralCosts + interviewBonusCosts;
  const referralCostPerUser = i.totalUsers > 0 ? candidateRewardCosts / i.totalUsers : 0;
  const candidateRewardCostPerUser = referralCostPerUser;

  const fixedCosts = tc + i.legalAccounting + i.officeMisc;
  const variableCosts = totalInfrastructure + candidateRewardCosts;
  const totalCosts = fixedCosts + variableCosts;
  const costPerUser = i.totalUsers > 0 ? totalCosts / i.totalUsers : 0;

  const netIncome = totalRevenue - totalCosts;
  const margin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;
  const contributionMargin = revenuePerUser - (infrastructureCostPerUser + candidateRewardCostPerUser);

  const breakEvenUsers =
    contributionMargin > 0 && Number.isFinite(fixedCosts / contributionMargin)
      ? fixedCosts / contributionMargin
      : Number.POSITIVE_INFINITY;
  const usersNeeded = Math.max(0, breakEvenUsers - i.totalUsers);
  const growthNeeded = i.totalUsers > 0 ? (usersNeeded / i.totalUsers) * 100 : 0;

  const effectiveGrowthRate = i.viralGrowthRate / 100;
  let yearsToBreakEven = 0;
  if (i.totalUsers < breakEvenUsers && effectiveGrowthRate > 0 && breakEvenUsers < Number.POSITIVE_INFINITY) {
    yearsToBreakEven = Math.log(breakEvenUsers / i.totalUsers) / Math.log(1 + effectiveGrowthRate);
  }

  const projection = buildProjection(
    i,
    fixedCosts,
    infrastructureCostPerUser,
    candidateRewardCostPerUser,
    avgSuccessFee,
    i.viralGrowthRate,
  );

  return {
    subscriptionRevenue,
    subscriptionRevenueGross,
    foundingRevenueDrag,
    successFeeRevenue,
    totalRevenue,
    mrr,
    arr,
    subscriptionMrr,
    subscriptionArr,
    placementMrr,
    placementArr,
    revenuePerUser,
    payingUsers,
    placementsPerYear,
    avgSuccessFee,
    twinNetPlacementPctOfMonthlySalary,
    teamCosts: tc,
    totalInfrastructure,
    referralCosts,
    referralCostBreakdown,
    interviewBonusCosts,
    candidateRewardCosts,
    fixedCosts,
    variableCosts,
    totalCosts,
    costPerUser,
    infrastructureCostPerUser,
    referralCostPerUser,
    candidateRewardCostPerUser,
    netIncome,
    margin,
    contributionMargin,
    breakEvenUsers,
    usersNeeded,
    growthNeeded,
    yearsToBreakEven,
    projection,
  };
}

export function patchScenario(
  scenario: InvestorScenario,
): Partial<InvestorCalculatorInputs> {
  if (scenario === "optimized") {
    return { percentPaying: 15, placementRate: 10, subscriptionPrice: 4.99, viralGrowthRate: 15 };
  }
  if (scenario === "aggressive") {
    return {
      percentPaying: 20,
      placementRate: 20,
      subscriptionPrice: 9.99,
      viralGrowthRate: 20,
      linkedInAdoptionRate: 80,
      referralRate: 60,
    };
  }
  return {
    percentPaying: 10,
    placementRate: 5,
    subscriptionPrice: 4.99,
    viralGrowthRate: 10.5,
    linkedInAdoptionRate: 60,
    referralRate: 40,
  };
}

/** Exported for tests — annual prepay discount constant re-export. */
export { ANNUAL_PREPAY_DISCOUNT };
