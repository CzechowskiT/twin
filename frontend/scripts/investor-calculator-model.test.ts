import assert from "node:assert/strict";

import {
  ANNUAL_PREPAY_DISCOUNT,
  computeCandidateEconomicsExample,
  computeInvestorCalculator,
  INVESTOR_CALCULATOR_DEFAULTS,
  patchScenario,
  PLACEMENT_EMPLOYER_FEE_PERCENT,
  PLACEMENT_NET_TAKE_RATE_PERCENT,
} from "../src/lib/investor-calculator-model";
import {
  PLACEMENT_CANDIDATE_BONUS_PCT_OF_MONTHLY_SALARY,
  REFERRAL_BONUS_FIRST_PAYMENT_USD,
  REFERRAL_BONUS_HIRED_USD,
  REFERRAL_BONUS_RETAINED_3M_USD,
} from "../src/lib/candidate-rewards-constants";
import { annualPrepayUsdFromMonthly } from "../src/lib/pricing-locale";

function run(name: string, fn: () => void) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (e) {
    console.error(`fail ${name}`, e);
    process.exitCode = 1;
  }
}

run("organic scenario defaults", () => {
  const patch = patchScenario("current");
  assert.equal(patch.percentPaying, 10);
  assert.equal(patch.placementRate, 5);
  assert.equal(patch.subscriptionPrice, 4.99);
});

run("optimal scenario: 15% pay, 10% placement, $4.99", () => {
  const patch = patchScenario("optimized");
  assert.equal(patch.percentPaying, 15);
  assert.equal(patch.placementRate, 10);
  assert.equal(patch.subscriptionPrice, 4.99);
});

run("boosted scenario: 20% pay, 20% placement, $9.99", () => {
  const patch = patchScenario("aggressive");
  assert.equal(patch.percentPaying, 20);
  assert.equal(patch.placementRate, 20);
  assert.equal(patch.subscriptionPrice, 9.99);
});

run("placement net take ~25% of monthly salary (no LinkedIn)", () => {
  const inputs = {
    ...INVESTOR_CALCULATOR_DEFAULTS,
    linkedInAdoptionRate: 0,
    successFeePercent: PLACEMENT_EMPLOYER_FEE_PERCENT,
  };
  const r = computeInvestorCalculator(inputs);
  assert.ok(Math.abs(r.twinNetPlacementPctOfMonthlySalary - PLACEMENT_NET_TAKE_RATE_PERCENT) < 0.2);
  const monthly = inputs.averageSalary / 12;
  const expectedNet = monthly * (PLACEMENT_NET_TAKE_RATE_PERCENT / 100);
  assert.ok(Math.abs(r.avgSuccessFee - expectedNet) < 1);
});

run("MRR equals subscription MRR + placement MRR", () => {
  const r = computeInvestorCalculator(INVESTOR_CALCULATOR_DEFAULTS);
  assert.ok(Math.abs(r.mrr - (r.subscriptionMrr + r.placementMrr)) < 0.01);
  assert.ok(Math.abs(r.arr - (r.subscriptionArr + r.placementArr)) < 0.01);
  assert.ok(Math.abs(r.arr - r.totalRevenue) < 0.01);
});

run("annual prepay list prices", () => {
  assert.equal(annualPrepayUsdFromMonthly(4.99), 44.91);
  assert.equal(annualPrepayUsdFromMonthly(9.99), 89.91);
  assert.equal(ANNUAL_PREPAY_DISCOUNT, 0.25);
});

/**
 * BEP sanity (defaults, 100k users): placement net 25% makes placement ARR material vs
 * old “50% gross to TWIN” bug that overstated fees. At this scale net income stays negative
 * until user base or placement rate rises — honest unit economics, not −305k from mis-stated take.
 */
run("default scale: negative net with honest placement take", () => {
  const r = computeInvestorCalculator(INVESTOR_CALCULATOR_DEFAULTS);
  assert.ok(r.netIncome < 0);
  assert.ok(r.successFeeRevenue > 0);
  assert.ok(r.successFeeRevenue < r.subscriptionRevenue * 2);
  assert.ok(r.placementMrr > 0);
});

run("referral tiers use shared USD constants", () => {
  assert.equal(INVESTOR_CALCULATOR_DEFAULTS.referralBonusPerActivation, REFERRAL_BONUS_FIRST_PAYMENT_USD);
  assert.equal(INVESTOR_CALCULATOR_DEFAULTS.referralBonusRetained3m, REFERRAL_BONUS_RETAINED_3M_USD);
  assert.equal(INVESTOR_CALCULATOR_DEFAULTS.referralBonusPerHire, REFERRAL_BONUS_HIRED_USD);
});

run("referral cost breakdown sums to total", () => {
  const r = computeInvestorCalculator(INVESTOR_CALCULATOR_DEFAULTS);
  const { activation, retained3m, hire, total } = r.referralCostBreakdown;
  assert.ok(activation > 0);
  assert.ok(retained3m > 0);
  assert.ok(hire > 0);
  assert.ok(Math.abs(total - (activation + retained3m + hire)) < 0.01);
  assert.equal(r.referralCosts, total);
});

run("founding drag and interview bonuses affect P&L", () => {
  const base = computeInvestorCalculator(INVESTOR_CALCULATOR_DEFAULTS);
  assert.ok(base.foundingRevenueDrag > 0);
  assert.ok(base.interviewBonusCosts > 0);
  assert.equal(base.candidateRewardCosts, base.referralCosts + base.interviewBonusCosts);
  const noFounding = computeInvestorCalculator({
    ...INVESTOR_CALCULATOR_DEFAULTS,
    foundingFreePremiumMonths: 0,
  });
  assert.ok(noFounding.subscriptionRevenue > base.subscriptionRevenue);
});

/** Organic scenario @ 100k users — deck sanity (USD model). */
run("organic @ 100k: MRR/ARR/BEP/net internally consistent", () => {
  const r = computeInvestorCalculator(INVESTOR_CALCULATOR_DEFAULTS);
  assert.equal(Math.round(r.mrr), 71_362);
  assert.equal(Math.round(r.arr), 856_348);
  assert.equal(Math.round(r.breakEvenUsers), 188_314);
  assert.equal(Math.round(r.netIncome), -478_352);
  assert.ok(Math.abs(r.mrr - (r.subscriptionMrr + r.placementMrr)) < 0.02);
  assert.ok(Math.abs(r.arr - r.totalRevenue) < 0.02);
  assert.ok(Math.abs(r.margin - (r.netIncome / r.totalRevenue) * 100) < 0.05);
});

run("optimized scenario is profitable at 100k users", () => {
  const r = computeInvestorCalculator({
    ...INVESTOR_CALCULATOR_DEFAULTS,
    ...patchScenario("optimized"),
  });
  assert.ok(r.netIncome > 0);
  assert.ok(r.breakEvenUsers < INVESTOR_CALCULATOR_DEFAULTS.totalUsers);
});

run("candidate economics example matches marketing USD constants", () => {
  const ex = computeCandidateEconomicsExample(INVESTOR_CALCULATOR_DEFAULTS);
  const monthly = INVESTOR_CALCULATOR_DEFAULTS.averageSalary / 12;
  assert.ok(Math.abs(ex.placementBonusToCandidateUsd - monthly * (PLACEMENT_CANDIDATE_BONUS_PCT_OF_MONTHLY_SALARY / 100)) < 0.02);
  assert.ok(Math.abs(ex.employerFeeUsd - monthly * (PLACEMENT_EMPLOYER_FEE_PERCENT / 100)) < 0.02);
  assert.ok(Math.abs(ex.twinNetPlacementUsd - ex.employerFeeUsd + ex.placementBonusToCandidateUsd) < 0.02);
  assert.equal(ex.referralTiersUsd.activation, REFERRAL_BONUS_FIRST_PAYMENT_USD);
  assert.equal(ex.referralTiersUsd.retained3m, REFERRAL_BONUS_RETAINED_3M_USD);
  assert.equal(ex.referralTiersUsd.hire, REFERRAL_BONUS_HIRED_USD);
  assert.equal(ex.referralTiersUsd.maxStackUsd, 140);
  assert.equal(ex.interviewMaxAnnualUsd, 320);
});

run("referral tiers stack without double-counting hire as separate funnel", () => {
  const r = computeInvestorCalculator(INVESTOR_CALCULATOR_DEFAULTS);
  const { activation, retained3m, hire, total } = r.referralCostBreakdown;
  const users = INVESTOR_CALCULATOR_DEFAULTS.totalUsers;
  const growth = INVESTOR_CALCULATOR_DEFAULTS.viralGrowthRate / 100;
  const refShare = INVESTOR_CALCULATOR_DEFAULTS.referralRate / 100;
  const newRefs = users * growth * refShare;
  const activated = newRefs * (INVESTOR_CALCULATOR_DEFAULTS.percentPaying / 100);
  assert.ok(Math.abs(activation - activated * REFERRAL_BONUS_FIRST_PAYMENT_USD) < 0.02);
  assert.ok(Math.abs(hire - activated * (INVESTOR_CALCULATOR_DEFAULTS.placementRate / 100) * REFERRAL_BONUS_HIRED_USD) < 0.02);
  assert.ok(total >= activation + retained3m + hire);
});
