/** ISO codes supported by the investor model (illustrative FX). */
export type InvestorModelCurrency = "USD" | "EUR" | "PLN" | "GBP";

/** Units of local currency per 1 USD (static illustrative rates). */
export const LOCAL_PER_USD: Record<InvestorModelCurrency, number> = {
  USD: 1,
  EUR: 0.92,
  PLN: 4.05,
  GBP: 0.79,
};

export type InvestorScenario = "current" | "optimized" | "aggressive";

export type InvestorCalculatorInputs = {
  totalUsers: number;
  percentPaying: number;
  subscriptionPrice: number;
  placementRate: number;
  averageSalary: number;
  successFeePercent: number;
  linkedInIncentivePercent: number;
  linkedInAdoptionRate: number;
  referralBonusPerActivation: number;
  referralBonusPerHire: number;
  referralRate: number;
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

export const INVESTOR_CALCULATOR_DEFAULTS: InvestorCalculatorInputs = {
  totalUsers: 100_000,
  percentPaying: 10,
  subscriptionPrice: 4.99,
  placementRate: 5,
  averageSalary: 50_000,
  successFeePercent: 50,
  linkedInIncentivePercent: 75,
  linkedInAdoptionRate: 60,
  referralBonusPerActivation: 15,
  referralBonusPerHire: 100,
  referralRate: 40,
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
  successFeeRevenue: number;
  totalRevenue: number;
  revenuePerUser: number;
  payingUsers: number;
  placementsPerYear: number;
  avgSuccessFee: number;
  teamCosts: number;
  totalInfrastructure: number;
  referralCosts: number;
  fixedCosts: number;
  variableCosts: number;
  totalCosts: number;
  costPerUser: number;
  infrastructureCostPerUser: number;
  referralCostPerUser: number;
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

function referralCostsUsd(i: InvestorCalculatorInputs, totalUsers: number): number {
  const newReferrals = totalUsers * (i.referralRate / 100) * (i.viralGrowthRate / 100);
  const activatedReferrals = newReferrals * (i.percentPaying / 100);
  const hiredReferrals = activatedReferrals * (i.placementRate / 100);
  return activatedReferrals * i.referralBonusPerActivation + hiredReferrals * i.referralBonusPerHire;
}

function avgSuccessFeeUsd(i: InvestorCalculatorInputs, placementsPerYear: number): number {
  if (placementsPerYear <= 0) return 0;
  const monthlySalary = i.averageSalary / 12;
  const successFeeBase = monthlySalary * (i.successFeePercent / 100);
  const linkedInPlacements = placementsPerYear * (i.linkedInAdoptionRate / 100);
  const nonLinkedInPlacements = placementsPerYear - linkedInPlacements;
  const twinKeepsLinkedIn = successFeeBase * (1 - i.linkedInIncentivePercent / 100);
  const twinKeepsNonLinkedIn = successFeeBase * 0.5;
  return (linkedInPlacements * twinKeepsLinkedIn + nonLinkedInPlacements * twinKeepsNonLinkedIn) / placementsPerYear;
}

function buildProjection(
  i: InvestorCalculatorInputs,
  fixedCosts: number,
  infrastructureCostPerUser: number,
  referralCostPerUser: number,
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
    const yearSubscriptionRev = yearPayingUsers * i.subscriptionPrice * 12;
    const yearSuccessFeeRev = yearPlacements * avgSuccessFee;
    const yearRevenue = yearSubscriptionRev + yearSuccessFeeRev;
    const yearVarCosts = currentUsers * (infrastructureCostPerUser + referralCostPerUser);
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

  const subscriptionRevenue = payingUsers * i.subscriptionPrice * 12;
  const successFeeRevenue = placementsPerYear * avgSuccessFee;
  const totalRevenue = subscriptionRevenue + successFeeRevenue;
  const revenuePerUser = i.totalUsers > 0 ? totalRevenue / i.totalUsers : 0;

  const tc = teamCosts(i);
  const infrastructureCostPerUser = i.hostingCostPerUser + i.apiCostPerUser + i.servicesCostPerUser;
  const totalInfrastructure = infrastructureCostPerUser * i.totalUsers;
  const refCosts = referralCostsUsd(i, i.totalUsers);
  const referralCostPerUser = i.totalUsers > 0 ? refCosts / i.totalUsers : 0;

  const fixedCosts = tc + i.legalAccounting + i.officeMisc;
  const variableCosts = totalInfrastructure + refCosts;
  const totalCosts = fixedCosts + variableCosts;
  const costPerUser = i.totalUsers > 0 ? totalCosts / i.totalUsers : 0;

  const netIncome = totalRevenue - totalCosts;
  const margin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;
  const contributionMargin = revenuePerUser - (infrastructureCostPerUser + referralCostPerUser);

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

  const projection = buildProjection(i, fixedCosts, infrastructureCostPerUser, referralCostPerUser, avgSuccessFee, i.viralGrowthRate);

  return {
    subscriptionRevenue,
    successFeeRevenue,
    totalRevenue,
    revenuePerUser,
    payingUsers,
    placementsPerYear,
    avgSuccessFee,
    teamCosts: tc,
    totalInfrastructure,
    referralCosts: refCosts,
    fixedCosts,
    variableCosts,
    totalCosts,
    costPerUser,
    infrastructureCostPerUser,
    referralCostPerUser,
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
    return { percentPaying: 15, placementRate: 6, subscriptionPrice: 7.99, viralGrowthRate: 15 };
  }
  if (scenario === "aggressive") {
    return {
      percentPaying: 20,
      placementRate: 7,
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
