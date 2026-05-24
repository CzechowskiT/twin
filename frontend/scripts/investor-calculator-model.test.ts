import assert from "node:assert/strict";

import {
  REFERRAL_BONUS_FIRST_PAYMENT_USD,
  REFERRAL_BONUS_HIRED_USD,
  REFERRAL_BONUS_RETAINED_3M_USD,
} from "../src/lib/candidate-rewards-constants";
import {
  ANNUAL_PREPAY_DISCOUNT,
  computeInvestorCalculator,
  INVESTOR_CALCULATOR_DEFAULTS,
  patchScenario,
  PLACEMENT_EMPLOYER_FEE_PERCENT,
  PLACEMENT_NET_TAKE_RATE_PERCENT,
} from "../src/lib/investor-calculator-model";
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

/** UI slider range (10k–1M): variable costs scale linearly with users; team/fixed flat. */
const SLIDER_MIN_USERS = 10_000;
const SLIDER_MAX_USERS = 1_000_000;

function variableCostsExFixed(r: ReturnType<typeof computeInvestorCalculator>) {
  return r.totalInfrastructure + r.candidateRewardCosts;
}

run("slider min/max: variable costs scale ~linearly with users", () => {
  const atMin = computeInvestorCalculator({
    ...INVESTOR_CALCULATOR_DEFAULTS,
    totalUsers: SLIDER_MIN_USERS,
  });
  const atMax = computeInvestorCalculator({
    ...INVESTOR_CALCULATOR_DEFAULTS,
    totalUsers: SLIDER_MAX_USERS,
  });
  assert.equal(atMin.teamCosts, atMax.teamCosts);
  assert.equal(atMin.fixedCosts, atMax.fixedCosts);
  const ratio = variableCostsExFixed(atMax) / variableCostsExFixed(atMin);
  assert.ok(Math.abs(ratio - SLIDER_MAX_USERS / SLIDER_MIN_USERS) < 0.001);
});

run("slider min/max: founding drag capped at cohort size", () => {
  const atMin = computeInvestorCalculator({
    ...INVESTOR_CALCULATOR_DEFAULTS,
    totalUsers: SLIDER_MIN_USERS,
  });
  const atMax = computeInvestorCalculator({
    ...INVESTOR_CALCULATOR_DEFAULTS,
    totalUsers: SLIDER_MAX_USERS,
  });
  assert.equal(atMin.foundingRevenueDrag, atMax.foundingRevenueDrag);
  assert.ok(atMin.foundingRevenueDrag > 0);
});

run("model scales at 100, 1k, 10k, 100k: per-user variable costs constant", () => {
  const scales = [100, 1_000, 10_000, 100_000];
  const perUser: number[] = [];
  for (const totalUsers of scales) {
    const r = computeInvestorCalculator({
      ...INVESTOR_CALCULATOR_DEFAULTS,
      totalUsers,
    });
    perUser.push(variableCostsExFixed(r) / totalUsers);
    assert.ok(Math.abs(r.referralCosts + r.interviewBonusCosts - r.candidateRewardCosts) < 0.01);
    assert.ok(
      Math.abs(r.totalCosts - (r.fixedCosts + r.variableCosts)) < 0.01,
      `cost identity @ ${totalUsers}`,
    );
  }
  const first = perUser[0]!;
  for (const p of perUser) {
    assert.ok(Math.abs(p - first) < 0.0001, `per-user variable drift: ${p} vs ${first}`);
  }
});

run("team salaries: default headcount × salary = teamCosts", () => {
  const d = INVESTOR_CALCULATOR_DEFAULTS;
  const expected =
    d.seniorEngineers * d.seniorEngineerSalary +
    d.otherEngineers * d.otherEngineerSalary +
    d.productManager * d.productManagerSalary +
    d.otherRoles * d.otherRolesSalary +
    d.founderSalary;
  assert.equal(expected, 970_000);
  const r = computeInvestorCalculator(d);
  assert.equal(r.teamCosts, expected);
  assert.equal(
    r.fixedCosts,
    expected + d.legalAccounting + d.officeMisc,
  );
});

run("referral tiers: funnel math matches breakdown", () => {
  const d = INVESTOR_CALCULATOR_DEFAULTS;
  const r = computeInvestorCalculator(d);
  const { activation, retained3m, hire, total } = r.referralCostBreakdown;
  const newRefs = d.totalUsers * (d.referralRate / 100) * (d.viralGrowthRate / 100);
  const activated = newRefs * (d.percentPaying / 100);
  const retained = activated * (d.referralRetention3mRate / 100);
  assert.ok(Math.abs(activation - activated * d.referralBonusPerActivation) < 0.02);
  assert.ok(Math.abs(retained3m - retained * d.referralBonusRetained3m) < 0.02);
  assert.ok(
    Math.abs(hire - activated * (d.placementRate / 100) * d.referralBonusPerHire) < 0.02,
  );
  assert.ok(Math.abs(total - (activation + retained3m + hire)) < 0.01);
});

run("interview bonus scales with paying users only", () => {
  const d = INVESTOR_CALCULATOR_DEFAULTS;
  const base = computeInvestorCalculator(d);
  const halfUsers = computeInvestorCalculator({ ...d, totalUsers: d.totalUsers / 2 });
  assert.ok(Math.abs(halfUsers.interviewBonusCosts - base.interviewBonusCosts / 2) < 0.02);
  const zeroAdoption = computeInvestorCalculator({ ...d, interviewBonusAdoptionRate: 0 });
  assert.equal(zeroAdoption.interviewBonusCosts, 0);
});

run("infrastructure per-user = hosting + api + services", () => {
  const d = INVESTOR_CALCULATOR_DEFAULTS;
  const r = computeInvestorCalculator(d);
  const perUser = d.hostingCostPerUser + d.apiCostPerUser + d.servicesCostPerUser;
  assert.equal(perUser, 2.4);
  assert.ok(Math.abs(r.infrastructureCostPerUser - perUser) < 0.0001);
  assert.ok(Math.abs(r.totalInfrastructure - perUser * d.totalUsers) < 0.01);
});
