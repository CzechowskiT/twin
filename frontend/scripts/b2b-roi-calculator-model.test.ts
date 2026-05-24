import assert from "node:assert/strict";

import {
  B2B_FLAT_RATE_DEFAULTS,
  B2B_ROI_DEFAULTS,
  computeB2bFlatRate,
  computeB2bRoi,
} from "../src/lib/b2b-roi-calculator-model";
import { convertDisplayToModelUsd, convertModelUsdToDisplay } from "../src/lib/calculator-fx";

function run(name: string, fn: () => void) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (e) {
    console.error(`fail ${name}`, e);
    process.exitCode = 1;
  }
}

run("agency vs twin per-hire savings at defaults", () => {
  const r = computeB2bRoi(B2B_ROI_DEFAULTS);
  assert.equal(r.agencyFeePerHireUsd, 9_000);
  assert.equal(r.twinEmployerFeePerHireUsd, 2_500);
  assert.equal(r.savingsPerHireUsd, 6_500);
  assert.ok(r.savingsPercent !== null && Math.abs(r.savingsPercent - (6500 / 9000) * 100) < 0.01);
});

run("enterprise ROI uses integration fee denominator", () => {
  const r = computeB2bRoi(B2B_ROI_DEFAULTS);
  const expectedRoi = (r.netBenefitUsd / r.integrationFeeUsd) * 100;
  assert.ok(r.enterpriseRoiPercent !== null && Math.abs(r.enterpriseRoiPercent - expectedRoi) < 0.01);
});

run("FX display round-trip preserves USD model", () => {
  const usd = 60_000;
  const pln = convertModelUsdToDisplay(usd, "PLN");
  assert.equal(convertDisplayToModelUsd(pln, "PLN"), usd);
});

run("flat rate matches founder spreadsheet (1000 × 15% × 500 PLN @ 10%)", () => {
  const r = computeB2bFlatRate(B2B_FLAT_RATE_DEFAULTS);
  assert.equal(r.vacancies, 150);
  assert.equal(r.traditionalTotalUsd, 18_750);
  assert.equal(r.flatRateTotalUsd, 1_875);
  assert.equal(r.savingsUsd, 16_875);
});
