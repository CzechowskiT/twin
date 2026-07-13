/**
 * Stabilization window — blocks product merges during Path B hardening batch.
 */

export type StabilizationResult = {
  ok: boolean;
  reason: string;
  productMergesAllowed: boolean;
  hardeningMergesAllowed: boolean;
};

export function evaluateStabilizationWindow(opts: {
  credentialsSet: boolean;
  stabilizationActive?: boolean;
}): StabilizationResult {
  const active = opts.stabilizationActive ?? !opts.credentialsSet;
  if (active && !opts.credentialsSet) {
    return {
      ok: true,
      reason: "ACTIVE — Path B: no product PR merges until founder smoke credentials SET",
      productMergesAllowed: false,
      hardeningMergesAllowed: true,
    };
  }
  if (opts.credentialsSet && !active) {
    return {
      ok: true,
      reason: "INACTIVE — credentials SET; Path A merge train eligible after smoke PASS",
      productMergesAllowed: true,
      hardeningMergesAllowed: true,
    };
  }
  return {
    ok: true,
    reason: "ACTIVE — awaiting founder smoke evidence",
    productMergesAllowed: false,
    hardeningMergesAllowed: true,
  };
}
