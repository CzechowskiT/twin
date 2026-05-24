/** Illustrative B2B ROI model — amounts in USD (display applies FX in the UI). */

export const B2B_INTEGRATION_FEE_USD = 100_000;
export const B2B_WORKSPACE_SEAT_USD = 99.99;
export const B2B_ANNUAL_PREPAY_DISCOUNT = 0.25;

/** Founder spreadsheet: 500 PLN/vacancy market floor; flat fee = 10% of that spend (not % of salary). */
export const B2B_FLAT_RATE_VACANCY_COST_PLN = 500;
export const B2B_FLAT_RATE_FEE_RATIO = 0.1;
export const B2B_FLAT_RATE_PLN_PER_USD = 4;

export type B2bFlatRateInputs = {
  headcount: number;
  rotationRate: number;
  vacancies: number | null;
  costPerVacancyUsd: number;
  flatRateRatio: number;
};

export const B2B_FLAT_RATE_DEFAULTS: B2bFlatRateInputs = {
  headcount: 1_000,
  rotationRate: 0.15,
  vacancies: null,
  costPerVacancyUsd: B2B_FLAT_RATE_VACANCY_COST_PLN / B2B_FLAT_RATE_PLN_PER_USD,
  flatRateRatio: B2B_FLAT_RATE_FEE_RATIO,
};

export type B2bFlatRateResults = {
  vacancies: number;
  traditionalTotalUsd: number;
  flatRateTotalUsd: number;
  savingsUsd: number;
  savingsPercent: number | null;
};

export function resolveFlatRateVacancies(i: B2bFlatRateInputs): number {
  if (i.vacancies !== null && i.vacancies >= 0) return Math.round(i.vacancies);
  return Math.max(0, Math.round(i.headcount * i.rotationRate));
}

export function computeB2bFlatRate(i: B2bFlatRateInputs): B2bFlatRateResults {
  const vacancies = resolveFlatRateVacancies(i);
  const traditionalTotalUsd = vacancies * i.costPerVacancyUsd;
  const ratio = Math.min(1, Math.max(0, i.flatRateRatio));
  const flatRateTotalUsd = traditionalTotalUsd * ratio;
  const savingsUsd = traditionalTotalUsd - flatRateTotalUsd;
  const savingsPercent =
    traditionalTotalUsd > 0 ? (savingsUsd / traditionalTotalUsd) * 100 : null;

  return { vacancies, traditionalTotalUsd, flatRateTotalUsd, savingsUsd, savingsPercent };
}

export type B2bRoiInputs = {
  annualSalaryUsd: number;
  agencyFeePercent: number;
  numberOfHires: number;
  hrHoursSavedPerMonth: number;
  hrHourlyRateUsd: number;
  recruiterSeats: number;
};

export const B2B_ROI_DEFAULTS: B2bRoiInputs = {
  annualSalaryUsd: 60_000,
  agencyFeePercent: 15,
  numberOfHires: 50,
  hrHoursSavedPerMonth: 100,
  hrHourlyRateUsd: 50,
  recruiterSeats: 3,
};

export type B2bRoiResults = {
  monthlySalaryUsd: number;
  agencyFeePerHireUsd: number;
  twinEmployerFeePerHireUsd: number;
  candidateBonusPerHireUsd: number;
  twinNetRevenuePerHireUsd: number;
  savingsPerHireUsd: number;
  savingsPercent: number | null;
  totalSavingsUsd: number;
  integrationFeeUsd: number;
  timeValueSavingsUsd: number;
  costSavingsUsd: number;
  totalEnterpriseValueUsd: number;
  netBenefitUsd: number;
  enterpriseRoiPercent: number | null;
  workspaceMonthlyUsd: number;
  workspaceAnnualUsd: number;
};

export function computeB2bRoi(i: B2bRoiInputs): B2bRoiResults {
  const monthlySalaryUsd = i.annualSalaryUsd / 12;
  const agencyFeePerHireUsd = i.annualSalaryUsd * (i.agencyFeePercent / 100);
  const twinEmployerFeePerHireUsd = monthlySalaryUsd * 0.5;
  const candidateBonusPerHireUsd = twinEmployerFeePerHireUsd * 0.5;
  const twinNetRevenuePerHireUsd = twinEmployerFeePerHireUsd * 0.5;

  const savingsPerHireUsd = agencyFeePerHireUsd - twinEmployerFeePerHireUsd;
  const savingsPercent =
    agencyFeePerHireUsd > 0 ? (savingsPerHireUsd / agencyFeePerHireUsd) * 100 : null;
  const totalSavingsUsd = savingsPerHireUsd * i.numberOfHires;

  const timeValueSavingsUsd = i.hrHoursSavedPerMonth * i.hrHourlyRateUsd * 12;
  const costSavingsUsd = savingsPerHireUsd * i.numberOfHires;
  const totalEnterpriseValueUsd = timeValueSavingsUsd + costSavingsUsd;
  const integrationFeeUsd = B2B_INTEGRATION_FEE_USD;
  const netBenefitUsd = totalEnterpriseValueUsd - integrationFeeUsd;
  const enterpriseRoiPercent =
    integrationFeeUsd > 0 ? (netBenefitUsd / integrationFeeUsd) * 100 : null;

  const workspaceMonthlyUsd = i.recruiterSeats * B2B_WORKSPACE_SEAT_USD;
  const workspaceAnnualUsd = workspaceMonthlyUsd * 12 * (1 - B2B_ANNUAL_PREPAY_DISCOUNT);

  return {
    monthlySalaryUsd,
    agencyFeePerHireUsd,
    twinEmployerFeePerHireUsd,
    candidateBonusPerHireUsd,
    twinNetRevenuePerHireUsd,
    savingsPerHireUsd,
    savingsPercent,
    totalSavingsUsd,
    integrationFeeUsd,
    timeValueSavingsUsd,
    costSavingsUsd,
    totalEnterpriseValueUsd,
    netBenefitUsd,
    enterpriseRoiPercent,
    workspaceMonthlyUsd,
    workspaceAnnualUsd,
  };
}
