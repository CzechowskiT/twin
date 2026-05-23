import assert from "node:assert/strict";

import {
  annualPrepayUsdFromMonthly,
  CANDIDATE_PLAN_USD,
  formatPlanAnnualPrice,
  formatPlanPrice,
  roundPsychMonthlyLocal,
} from "../src/lib/pricing-locale";

function run(name: string, fn: () => void) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (e) {
    console.error(`fail ${name}`, e);
    process.exitCode = 1;
  }
}

run("en premium is $4.99", () => {
  assert.equal(formatPlanPrice("premium", "en"), "$4.99");
});

run("en pro is $9.99", () => {
  assert.equal(formatPlanPrice("pro", "en"), "$9.99");
});

run("premium annual prepay is $44.91", () => {
  assert.equal(annualPrepayUsdFromMonthly(CANDIDATE_PLAN_USD.premium), 44.91);
  assert.equal(formatPlanAnnualPrice("premium", "en"), "$44.91");
});

run("pro annual prepay is $89.91", () => {
  assert.equal(annualPrepayUsdFromMonthly(CANDIDATE_PLAN_USD.pro), 89.91);
  assert.equal(formatPlanAnnualPrice("pro", "en"), "$89.91");
});

run("pl premium is psych-rounded PLN", () => {
  const price = formatPlanPrice("premium", "pl");
  assert.match(price, /19,99\s*zł|19,99\s*PLN|zł\s*19,99/i);
  assert.equal(roundPsychMonthlyLocal(CANDIDATE_PLAN_USD.premium, "PLN"), 19.99);
});

run("pl pro is psych-rounded PLN", () => {
  const price = formatPlanPrice("pro", "pl");
  assert.match(price, /39,99\s*zł|39,99\s*PLN|zł\s*39,99/i);
  assert.equal(roundPsychMonthlyLocal(CANDIDATE_PLAN_USD.pro, "PLN"), 39.99);
});

run("de premium uses EUR", () => {
  const price = formatPlanPrice("premium", "de");
  assert.match(price, /4,99\s*€|€\s*4,99|4,99\s*EUR/i);
});

run("pl premium annual is psych-rounded PLN", () => {
  const annual = formatPlanAnnualPrice("premium", "pl");
  assert.match(annual, /zł|PLN/i);
});
