/**
 * Microsoft busy-read staging smoke env — dry-run vs live HTTP vs live Graph.
 * Never log JWT or token values from these helpers.
 */

export const MICROSOFT_BUSY_READ_SMOKE_ENV = {
  dryRun: "TWIN_BUSY_READ_SMOKE_DRY_RUN",
  allowLive: "TWIN_BUSY_READ_SMOKE_ALLOW_LIVE",
  prodBase: "TWIN_PROD_BASE_URL",
  testJwt: "TWIN_PROD_TEST_JWT",
} as const;

export function microsoftBusyReadSmokeDryRun(): boolean {
  return process.env[MICROSOFT_BUSY_READ_SMOKE_ENV.dryRun] === "1";
}

export function microsoftBusyReadSmokeAllowLive(): boolean {
  return process.env[MICROSOFT_BUSY_READ_SMOKE_ENV.allowLive] === "1";
}

export function microsoftBusyReadSmokeHasJwt(): boolean {
  return Boolean(process.env[MICROSOFT_BUSY_READ_SMOKE_ENV.testJwt]?.trim());
}

/** Human-readable mode label for operator logs — never includes secrets. */
export function microsoftBusyReadSmokeModeLabel(): string {
  if (microsoftBusyReadSmokeDryRun()) return "dry_run_static";
  if (microsoftBusyReadSmokeAllowLive()) return "live_graph_allowed";
  return "safe_http_gates_off";
}
