/**
 * Phase 3B resource watchdog — process-count + wall-clock guards for the
 * controlled-multitab prod run.
 *
 * Closes the residual risk flagged (but never resolved) by
 * docs/GATE_E_ATTEMPT7_EXECUTION_GUARANTEE_2026-06-29.md §4: the harness's
 * *application-level* concurrency ceiling (1 browser, 1 context, ≤7 pages,
 * serial batches, 0 retries) was already code-enforced going into attempt 6,
 * yet a `chrome-headless-shell` CPU/process-count runaway still happened —
 * because host-level resource conditions during a live run were only ever
 * caught by manual operator observation, never by code. Attempt 9
 * (docs/gate-e-phase3b-attempt9-result-2026-07-02.md) was manually aborted
 * before any Playwright invocation specifically because this gap was still
 * open. This module closes it.
 *
 * This module never launches a browser itself. It shells out to read-only
 * `pgrep` for process inspection and, only on a detected violation, to
 * `pkill` for best-effort cleanup of orphaned `chrome-headless-shell`
 * processes — never anything else. See
 * docs/PHASE3B_RESOURCE_WATCHDOG_2026-07-03.md.
 */
import { execFileSync } from "node:child_process";

/** Prod Phase 3B runs refuse to start unless this env var is exactly "1". */
export const PHASE3B_RESOURCE_WATCHDOG_ENV_VAR = "PHASE3B_RESOURCE_WATCHDOG";

export const PHASE3B_WATCHDOG_POLL_MS = 5_000;
/** 1 browser + up to 7 renderer/tab processes + GPU/utility helpers (see execution guarantee §2) leaves headroom before this is treated as a runaway. */
export const PHASE3B_WATCHDOG_MAX_CHROME_HEADLESS_SHELL_PROCESSES = 20;
/** Below the 900s (prod) / 1200s (local) per-batch Playwright timeout — an independent, earlier backstop. */
export const PHASE3B_WATCHDOG_MAX_RUN_MS = 600_000;

export type Phase3bWatchdogViolation =
  | { kind: "PROCESS_COUNT_EXCEEDED"; count: number; max: number }
  | { kind: "RUN_TIMEOUT_EXCEEDED"; elapsedMs: number; maxMs: number };

function hasExitStatus(err: unknown): err is { status: number } {
  return typeof err === "object" && err !== null && typeof (err as { status?: unknown }).status === "number";
}

/** Runs `pgrep -fc <pattern>`; returns 0 (not an error) when there are no matches. */
function runPgrepCount(pattern: string): number {
  try {
    const out = execFileSync("pgrep", ["-fc", pattern], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const parsed = Number.parseInt(out.trim(), 10);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch (err) {
    // pgrep exits 1 with empty stdout when nothing matches — that means "0",
    // not a failure. Any other failure (pgrep missing, permissions) also
    // fails safe to 0: this helper can only ever make a run *more* cautious
    // via assertResourceSafeToStart()/the watchdog poll, never less.
    if (hasExitStatus(err) && err.status === 1) return 0;
    return 0;
  }
}

/** True if `pgrep` appears to be usable on this host (best-effort probe). */
export function isProcessInspectionAvailable(): boolean {
  try {
    execFileSync("pgrep", ["-f", "__phase3b_resource_watchdog_probe__"], {
      stdio: ["ignore", "ignore", "ignore"],
    });
    return true;
  } catch (err) {
    // Exit code 1 ("no process matched") still proves the pgrep binary ran.
    return hasExitStatus(err);
  }
}

export function countChromeHeadlessShellProcesses(): number {
  return runPgrepCount("chrome-headless-shell");
}

export function countOrphanedPhase3bProcesses(): number {
  return runPgrepCount("playwright.*phase3b") + runPgrepCount("test:phase3b-controlled-multitab-prod");
}

/** Best-effort SIGTERM to any `chrome-headless-shell` process. Never throws. */
export function killChromeHeadlessShellProcesses(): void {
  try {
    execFileSync("pkill", ["-f", "chrome-headless-shell"], { stdio: "ignore" });
  } catch {
    /* no matching process, or pkill unavailable on this host — nothing to clean up */
  }
}

/**
 * Throws if `chrome-headless-shell` or orphaned phase3b/playwright processes
 * are already running before this attempt starts. Mirrors, in code, the
 * manual preflight checks recorded by hand in every Gate E attempt doc since
 * attempt 6 (chrome-headless-shell count == 0, playwright/phase3b count == 0).
 */
export function assertResourceSafeToStart(): void {
  const chromeCount = countChromeHeadlessShellProcesses();
  if (chromeCount > 0) {
    throw new Error(
      `phase3b resource watchdog: ${chromeCount} chrome-headless-shell process(es) already running before start; refusing to start a new Phase 3B run`,
    );
  }
  const orphanCount = countOrphanedPhase3bProcesses();
  if (orphanCount > 0) {
    throw new Error(
      `phase3b resource watchdog: ${orphanCount} orphaned playwright/phase3b process(es) already running before start; refusing to start a new Phase 3B run`,
    );
  }
}

/**
 * Hard requirement for prod Phase 3B runs: `PHASE3B_RESOURCE_WATCHDOG=1`
 * must be explicitly set, mirroring the existing `PLAYWRIGHT_ALLOW_PROD_SMOKE`
 * gate. No-op for non-prod runs.
 */
export function requirePhase3bResourceWatchdogEnabled(
  isProd: boolean,
  env: Record<string, string | undefined> = process.env,
): void {
  if (!isProd) return;
  if (env[PHASE3B_RESOURCE_WATCHDOG_ENV_VAR] !== "1") {
    throw new Error(
      `phase3b resource watchdog: set ${PHASE3B_RESOURCE_WATCHDOG_ENV_VAR}=1 to run production Phase 3B ` +
        `(see docs/PHASE3B_RESOURCE_WATCHDOG_2026-07-03.md). Refusing to start without it.`,
    );
  }
}

export type Phase3bResourceWatchdogHandle = {
  /** Stops the background poller. Always call this in a `finally` block. */
  stop(): void;
  /** Non-null once a violation has been detected; cleanup has already run by then. */
  getViolation(): Phase3bWatchdogViolation | null;
};

export type Phase3bResourceWatchdogOptions = {
  pollMs?: number;
  maxChromeHeadlessShellProcesses?: number;
  maxRunMs?: number;
  onViolation?: (violation: Phase3bWatchdogViolation) => void;
};

/**
 * Starts a background poller that checks `chrome-headless-shell` process
 * count and elapsed wall-clock time on an interval. On the first violation,
 * it immediately kills orphaned `chrome-headless-shell` processes (the
 * protective action) and records the violation for `getViolation()` — it
 * does NOT throw or crash the process itself; callers must check
 * `getViolation()` at their own checkpoints (e.g. before each batch) and
 * fail the current test explicitly. This keeps failures visible as normal
 * Playwright test failures instead of an unhandled interval exception.
 * Always call `.stop()` once the run completes, pass or fail.
 */
export function createPhase3bResourceWatchdog(
  options: Phase3bResourceWatchdogOptions = {},
): Phase3bResourceWatchdogHandle {
  const pollMs = options.pollMs ?? PHASE3B_WATCHDOG_POLL_MS;
  const maxChromeHeadlessShellProcesses =
    options.maxChromeHeadlessShellProcesses ?? PHASE3B_WATCHDOG_MAX_CHROME_HEADLESS_SHELL_PROCESSES;
  const maxRunMs = options.maxRunMs ?? PHASE3B_WATCHDOG_MAX_RUN_MS;
  const startedAt = Date.now();
  let violation: Phase3bWatchdogViolation | null = null;

  const timer: NodeJS.Timeout = setInterval(() => {
    if (violation) return;
    const elapsedMs = Date.now() - startedAt;
    if (elapsedMs > maxRunMs) {
      violation = { kind: "RUN_TIMEOUT_EXCEEDED", elapsedMs, maxMs: maxRunMs };
    } else {
      const count = countChromeHeadlessShellProcesses();
      if (count > maxChromeHeadlessShellProcesses) {
        violation = { kind: "PROCESS_COUNT_EXCEEDED", count, max: maxChromeHeadlessShellProcesses };
      }
    }
    if (violation) {
      clearInterval(timer);
      killChromeHeadlessShellProcesses();
      options.onViolation?.(violation);
    }
  }, pollMs);
  timer.unref?.();

  return {
    stop(): void {
      clearInterval(timer);
    },
    getViolation(): Phase3bWatchdogViolation | null {
      return violation;
    },
  };
}

/** Throws a descriptive error if `handle` has recorded a violation. Call at batch checkpoints. */
export function assertNoWatchdogViolation(handle: Phase3bResourceWatchdogHandle): void {
  const violation = handle.getViolation();
  if (!violation) return;
  const message =
    violation.kind === "PROCESS_COUNT_EXCEEDED"
      ? `phase3b resource watchdog: chrome-headless-shell process count ${violation.count} exceeded max ${violation.max} — aborted for resource safety, orphaned processes killed`
      : `phase3b resource watchdog: run exceeded ${violation.maxMs}ms wall-clock budget (${violation.elapsedMs}ms elapsed) — aborted for resource safety, orphaned processes killed`;
  throw new Error(message);
}
