/**
 * Playwright globalTeardown — safety net when a test aborts before context.close().
 * Only targets Playwright-managed chrome-headless-shell binaries (ms-playwright cache).
 */
import { execSync } from "node:child_process";

function killOrphanedPlaywrightShells() {
  if (process.platform !== "darwin" && process.platform !== "linux") return;

  try {
    const listing = execSync("pgrep -fl chrome-headless-shell 2>/dev/null || true", {
      encoding: "utf8",
    });
    const pids = listing
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => /ms-playwright|playwright.*headless/i.test(line))
      .map((line) => Number.parseInt(line.split(/\s+/)[0] ?? "", 10))
      .filter((pid) => Number.isFinite(pid) && pid > 0);

    for (const pid of pids) {
      try {
        process.kill(pid, "SIGTERM");
      } catch {
        /* already exited */
      }
    }
  } catch {
    /* pgrep unavailable — skip */
  }
}

export default async function globalTeardown() {
  killOrphanedPlaywrightShells();
}
