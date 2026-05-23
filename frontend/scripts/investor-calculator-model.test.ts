import assert from "node:assert/strict";

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

/** Organic scenario @ 100k users — deck sanity (USD model). */
run("organic @ 100k: MRR/ARR/BEP/net internally consistent", () => {
  const r = computeInvestorCalculator(INVESTOR_CALCULATOR_DEFAULTS);
  assert.equal(Math.round(r.mrr), 75_916);
  assert.equal(Math.round(r.arr), 910_988);
  assert.equal(Math.round(r.breakEvenUsers), 153_942);
  assert.equal(Math.round(r.netIncome), -357_412);
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
