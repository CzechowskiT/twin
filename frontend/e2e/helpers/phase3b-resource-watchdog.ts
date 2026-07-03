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
 * Attempt 10 (2026-07-03) surfaced a second, narrower gap: cleanup reported
 * `chrome-headless-shell=0` while the operator visually observed Chrome/
 * Chromium memory pressure — the original detection only ever looked for
 * the literal `chrome-headless-shell` binary name, missing every other
 * process name a real (non-headless-shell) Chromium-family browser channel
 * can spawn on macOS (`Chromium`, `Google Chrome Helper` + its Renderer/GPU/
 * Plugin variants, `Google Chrome for Testing`). See
 * docs/PHASE3B_MACOS_PROCESS_DETECTION_2026-07-03.md.
 *
 * Widening *detection* to those names immediately raises a much sharper
 * safety problem: `Google Chrome Helper (Renderer)` is exactly the process
 * name real, everyday Google Chrome uses for its own tabs. A blanket
 * `pkill -f "Google Chrome Helper"` would kill a user's ordinary browser
 * tabs, not just a Playwright-launched test browser. So this module never
 * kills the ambiguous Chrome-family names by pattern. It only ever kills:
 *   (a) `chrome-headless-shell` by name — a binary name no ordinary user
 *       process is ever named, so name-based cleanup remains safe there, and
 *   (b) a specific PID that has been *proven* to descend from a
 *       Playwright-launched browser process (`browser.process()?.pid`),
 *       via a recursive `pgrep -P` child-PID walk (`assessChromeProcessOwnership`).
 * Anything else that matches a Chrome-family name but is NOT in that proven
 * PID tree — including a user's real daily-driver Chrome — is reported as
 * `unownedMatches` for manual review and is never touched.
 *
 * This module never launches a browser itself. It shells out to read-only
 * `pgrep`/`ps` for process inspection and, only on a detected violation, to
 * `pkill`/`kill` for best-effort cleanup — scoped as described above, never
 * anything else.
 */
import { execFileSync } from "node:child_process";

/** Prod Phase 3B runs refuse to start unless this env var is exactly "1". */
export const PHASE3B_RESOURCE_WATCHDOG_ENV_VAR = "PHASE3B_RESOURCE_WATCHDOG";

export const PHASE3B_WATCHDOG_POLL_MS = 5_000;
/** 1 browser + up to 7 renderer/tab processes + GPU/utility helpers (see execution guarantee §2) leaves headroom before this is treated as a runaway. */
export const PHASE3B_WATCHDOG_MAX_CHROME_HEADLESS_SHELL_PROCESSES = 20;
/** Below the 900s (prod) / 1200s (local) per-batch Playwright timeout — an independent, earlier backstop. */
export const PHASE3B_WATCHDOG_MAX_RUN_MS = 600_000;

/**
 * `chrome-headless-shell` is the only process name here that is always safe
 * to `pkill` by name: it is never the name of a real user-facing browser
 * process, only Playwright's headless-shell channel.
 */
export const PHASE3B_SAFE_KILL_PROCESS_PATTERNS = ["chrome-headless-shell"] as const;

/**
 * Ambiguous Chrome/Chromium-family process names (2026-07-03 hardening).
 * Every one of these can ALSO be a name used by a real, user-launched
 * browser (a daily-driver Chromium install, or — critically — the Helper
 * variants used by ordinary Google Chrome tabs/GPU/plugins). Never
 * `pkill`/killed by name; only killed via a proven PID-ownership tree
 * (see `assessChromeProcessOwnership`).
 */
export const PHASE3B_AMBIGUOUS_CHROME_PROCESS_PATTERNS = [
  "Google Chrome Helper (Renderer)",
  "Google Chrome Helper (GPU)",
  "Google Chrome Helper (Plugin)",
  "Google Chrome Helper",
  "Google Chrome for Testing",
  "Chromium",
] as const;

/** Union of every Chrome/Chromium-family process name this watchdog knows how to detect (for reporting). */
export const PHASE3B_ALL_CHROME_FAMILY_PATTERNS = [
  ...PHASE3B_SAFE_KILL_PROCESS_PATTERNS,
  ...PHASE3B_AMBIGUOUS_CHROME_PROCESS_PATTERNS,
] as const;

/** node/npm/playwright command-line patterns that indicate an orphaned Phase 3B run, not a real user process. */
export const PHASE3B_RUN_RELATED_PROCESS_PATTERNS = [
  "playwright.*phase3b",
  "test:phase3b-controlled-multitab-prod",
  "test:phase3b-controlled-multitab-browser",
  "npm.*phase3b-controlled-multitab",
  "node.*phase3b-controlled-multitab",
] as const;

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

/** Runs `pgrep -f <pattern>`; returns matching PIDs, or [] when there are no matches or on any failure. */
function runPgrepPids(pattern: string): number[] {
  try {
    const out = execFileSync("pgrep", ["-f", pattern], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return out
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => Number.parseInt(s, 10))
      .filter((n) => Number.isFinite(n));
  } catch (err) {
    if (hasExitStatus(err) && err.status === 1) return [];
    return [];
  }
}

/** Direct child PIDs of `pid` via `pgrep -P` (macOS/BSD pgrep). Never throws. */
function directChildPids(pid: number): number[] {
  try {
    const out = execFileSync("pgrep", ["-P", String(pid)], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return out
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => Number.parseInt(s, 10))
      .filter((n) => Number.isFinite(n));
  } catch (err) {
    if (hasExitStatus(err) && err.status === 1) return [];
    return [];
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

/** PIDs of every currently running `chrome-headless-shell` process (read-only). */
export function getChromeHeadlessShellPids(): number[] {
  return runPgrepPids("chrome-headless-shell");
}

export function countOrphanedPhase3bProcesses(): number {
  return PHASE3B_RUN_RELATED_PROCESS_PATTERNS.reduce((sum, pattern) => sum + runPgrepCount(pattern), 0);
}

/** Best-effort SIGTERM to any `chrome-headless-shell` process. Never throws. Always safe: no ordinary user process is ever named this. */
export function killChromeHeadlessShellProcesses(): void {
  try {
    execFileSync("pkill", ["-f", "chrome-headless-shell"], { stdio: "ignore" });
  } catch {
    /* no matching process, or pkill unavailable on this host — nothing to clean up */
  }
}

/**
 * Recursively walks `pgrep -P` from `rootPid` (a known Playwright browser
 * process) to build the full set of PIDs it owns — the browser process
 * itself plus every renderer/GPU/utility helper descendant. Read-only.
 * Bounded to `maxDepth` levels to guarantee termination even under a
 * pathological process tree.
 */
export function getOwnedProcessTree(rootPid: number, maxDepth = 6): number[] {
  const visited = new Set<number>([rootPid]);
  let frontier = [rootPid];
  for (let depth = 0; depth < maxDepth && frontier.length > 0; depth += 1) {
    const next: number[] = [];
    for (const pid of frontier) {
      for (const child of directChildPids(pid)) {
        if (!visited.has(child)) {
          visited.add(child);
          next.push(child);
        }
      }
    }
    frontier = next;
  }
  return [...visited];
}

export type Phase3bProcessSnapshot = {
  pid: number;
  ppid: number | null;
  command: string;
};

function parsePsLine(line: string): Phase3bProcessSnapshot | null {
  const match = line.match(/^\s*(\d+)\s+(\d+)\s+(.*)$/);
  if (!match) return null;
  const pid = Number.parseInt(match[1]!, 10);
  const ppid = Number.parseInt(match[2]!, 10);
  const command = match[3] ?? "";
  if (!Number.isFinite(pid)) return null;
  return { pid, ppid: Number.isFinite(ppid) ? ppid : null, command };
}

function matchesAnyChromeFamilyPattern(command: string): boolean {
  return PHASE3B_ALL_CHROME_FAMILY_PATTERNS.some((pattern) => command.includes(pattern));
}

/**
 * Lists every currently running process whose command line matches a known
 * Chrome/Chromium-family pattern (`chrome-headless-shell`, `Chromium`,
 * `Google Chrome Helper` + variants, `Google Chrome for Testing`).
 * Read-only — never kills anything, and intentionally does NOT match plain
 * `Google Chrome` (the ordinary browser app process itself is not part of
 * this watchdog's kill-eligible surface at all, by name or by tree).
 */
export function listChromeFamilyProcesses(): Phase3bProcessSnapshot[] {
  try {
    const out = execFileSync("ps", ["-axo", "pid=,ppid=,command="], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return out
      .split("\n")
      .map(parsePsLine)
      .filter((snapshot): snapshot is Phase3bProcessSnapshot => snapshot !== null && matchesAnyChromeFamilyPattern(snapshot.command));
  } catch {
    return [];
  }
}

export type Phase3bOwnershipStatus = "NO_MATCHING_PROCESSES" | "OWNED" | "NEEDS_MANUAL_REVIEW";

export type Phase3bOwnershipReport = {
  status: Phase3bOwnershipStatus;
  /** Root Playwright browser PID this assessment was made against, if any. */
  browserPid: number | null;
  /** PIDs proven to descend from `browserPid` — the only PIDs ever eligible for kill. */
  ownedPids: number[];
  ownedProcesses: Phase3bProcessSnapshot[];
  /**
   * Chrome-family processes NOT in the owned tree — includes a real
   * daily-driver browser, unrelated Chromium instances, or (when
   * `browserPid` is null) every match found, since ownership cannot be
   * proven at all in that case. NEVER killed by this module.
   */
  unownedMatches: Phase3bProcessSnapshot[];
};

/**
 * Builds an ownership report for cleanup decisions (2026-07-03 hardening —
 * see docs/PHASE3B_MACOS_PROCESS_DETECTION_2026-07-03.md).
 *
 * If `browserPid` is a known, still-alive Playwright browser process, every
 * Chrome-family process in that PID's descendant tree is "owned" and safe
 * to terminate. Any Chrome-family process NOT in that tree is left entirely
 * alone and reported as `unownedMatches`. If `browserPid` is null (ownership
 * inaccessible from the Playwright API, or not yet launched), NOTHING can be
 * proven owned: every match is reported as `unownedMatches` and `status` is
 * `NEEDS_MANUAL_REVIEW` — this module never guesses.
 */
export function assessChromeProcessOwnership(browserPid: number | null): Phase3bOwnershipReport {
  const allMatches = listChromeFamilyProcesses();
  if (allMatches.length === 0) {
    return { status: "NO_MATCHING_PROCESSES", browserPid, ownedPids: [], ownedProcesses: [], unownedMatches: [] };
  }
  if (browserPid === null) {
    return { status: "NEEDS_MANUAL_REVIEW", browserPid, ownedPids: [], ownedProcesses: [], unownedMatches: allMatches };
  }
  const ownedTree = new Set(getOwnedProcessTree(browserPid));
  const ownedProcesses = allMatches.filter((p) => ownedTree.has(p.pid));
  const unownedMatches = allMatches.filter((p) => !ownedTree.has(p.pid));
  return {
    status: unownedMatches.length > 0 ? "NEEDS_MANUAL_REVIEW" : "OWNED",
    browserPid,
    ownedPids: ownedProcesses.map((p) => p.pid),
    ownedProcesses,
    unownedMatches,
  };
}

/** Best-effort SIGTERM to a single, already-proven-owned PID. Never throws. Never kills by process name. */
function killOwnedPid(pid: number): void {
  try {
    process.kill(pid, "SIGTERM");
  } catch {
    /* already exited, or no permission — nothing to do */
  }
}

/**
 * Terminates only PIDs already proven to descend from `browserPid` (via
 * `assessChromeProcessOwnership`). Never touches any process outside that
 * tree — in particular, never touches a real daily-driver Chrome/Chromium
 * or any Chrome-family instance not started by this run. Returns the report
 * that was used to decide what (if anything) was killed, so callers can
 * log/persist the owned-PID-tree state before/after cleanup.
 */
export function cleanupOwnedChromeProcesses(browserPid: number | null): Phase3bOwnershipReport {
  const report = assessChromeProcessOwnership(browserPid);
  for (const pid of report.ownedPids) killOwnedPid(pid);
  return report;
}

/**
 * Throws if `chrome-headless-shell` or orphaned phase3b/playwright processes
 * are already running before this attempt starts. Mirrors, in code, the
 * manual preflight checks recorded by hand in every Gate E attempt doc since
 * attempt 6 (chrome-headless-shell count == 0, playwright/phase3b count == 0).
 *
 * Deliberately does NOT also refuse to start merely because ambiguous
 * Chrome-family processes (`listChromeFamilyProcesses()`) exist on the host:
 * a real daily-driver Chrome/Chromium being open is completely normal
 * operator behavior, not evidence of a leftover Phase 3B run, and must never
 * block a legitimate attempt from starting.
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
  /**
   * Late-binds the Playwright-owned browser PID once it becomes available
   * (Playwright's `browser` fixture is lazily launched; it does not exist
   * at watchdog-creation time). Safe to call multiple times; the most
   * recent non-null PID wins. Pass `browser.process()?.pid ?? null`.
   */
  setBrowserPid(pid: number | null): void;
  getBrowserPid(): number | null;
  /**
   * Ownership report captured at the moment cleanup last ran (on the first
   * violation, or via `captureOwnershipSnapshot()`). Null until then.
   */
  getOwnershipReport(): Phase3bOwnershipReport | null;
  /**
   * Read-only: captures a fresh ownership report against the current
   * browser PID right now, without requiring a violation. Intended for
   * "before" (start of run) / "after" (end of run) reporting, per
   * docs/PHASE3B_MACOS_PROCESS_DETECTION_2026-07-03.md §3.
   */
  captureOwnershipSnapshot(): Phase3bOwnershipReport;
};

export type Phase3bResourceWatchdogOptions = {
  pollMs?: number;
  maxChromeHeadlessShellProcesses?: number;
  maxRunMs?: number;
  /** Playwright browser PID, if already known at creation time (usually not — prefer `setBrowserPid` once the browser fixture resolves). */
  browserPid?: number | null;
  onViolation?: (violation: Phase3bWatchdogViolation) => void;
};

/**
 * Starts a background poller that checks `chrome-headless-shell` process
 * count, the owned Chrome-family process-tree size (once a browser PID is
 * known via `setBrowserPid`), and elapsed wall-clock time on an interval.
 * On the first violation, it immediately runs ownership-scoped cleanup (the
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
  let browserPid: number | null = options.browserPid ?? null;
  let violation: Phase3bWatchdogViolation | null = null;
  let ownershipReport: Phase3bOwnershipReport | null = null;

  function runCleanup(): void {
    killChromeHeadlessShellProcesses();
    ownershipReport = cleanupOwnedChromeProcesses(browserPid);
  }

  const timer: NodeJS.Timeout = setInterval(() => {
    if (violation) return;
    const elapsedMs = Date.now() - startedAt;
    if (elapsedMs > maxRunMs) {
      violation = { kind: "RUN_TIMEOUT_EXCEEDED", elapsedMs, maxMs: maxRunMs };
    } else {
      const headlessCount = countChromeHeadlessShellProcesses();
      if (headlessCount > maxChromeHeadlessShellProcesses) {
        violation = { kind: "PROCESS_COUNT_EXCEEDED", count: headlessCount, max: maxChromeHeadlessShellProcesses };
      } else if (browserPid !== null) {
        // Broader than chrome-headless-shell alone: catches a runaway even
        // when Playwright launched a real (non-headless-shell) Chromium
        // channel, which is exactly the gap attempt 10 surfaced.
        const ownedCount = getOwnedProcessTree(browserPid).length;
        if (ownedCount > maxChromeHeadlessShellProcesses) {
          violation = { kind: "PROCESS_COUNT_EXCEEDED", count: ownedCount, max: maxChromeHeadlessShellProcesses };
        }
      }
    }
    if (violation) {
      clearInterval(timer);
      runCleanup();
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
    setBrowserPid(pid: number | null): void {
      if (pid !== null) browserPid = pid;
    },
    getBrowserPid(): number | null {
      return browserPid;
    },
    getOwnershipReport(): Phase3bOwnershipReport | null {
      return ownershipReport;
    },
    captureOwnershipSnapshot(): Phase3bOwnershipReport {
      return assessChromeProcessOwnership(browserPid);
    },
  };
}

/** Throws a descriptive error if `handle` has recorded a violation. Call at batch checkpoints. */
export function assertNoWatchdogViolation(handle: Phase3bResourceWatchdogHandle): void {
  const violation = handle.getViolation();
  if (!violation) return;
  const message =
    violation.kind === "PROCESS_COUNT_EXCEEDED"
      ? `phase3b resource watchdog: chrome-headless-shell process count ${violation.count} exceeded max ${violation.max} — aborted for resource safety, owned processes killed`
      : `phase3b resource watchdog: run exceeded ${violation.maxMs}ms wall-clock budget (${violation.elapsedMs}ms elapsed) — aborted for resource safety, owned processes killed`;
  throw new Error(message);
}
