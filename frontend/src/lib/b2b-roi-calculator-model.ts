/** Illustrative B2B ROI model — amounts in USD (display applies FX in the UI). */

export const B2B_INTEGRATION_FEE_USD = 100_000;
export const B2B_WORKSPACE_SEAT_USD = 99.99;
export const B2B_ANNUAL_PREPAY_DISCOUNT = 0.25;

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
