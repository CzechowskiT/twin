/**
 * Safe local test env loader for Cursor-agent / npm harnesses.
 *
 * Problem: `TWIN_ACCESS_TOKEN` (and other local-only secrets) may live in
 * `.env.local` files that Next.js dev server auto-loads but plain `node` /
 * `tsx` / Playwright processes do not. This loader closes that gap for
 * local and Cursor-agent test runs — it is never used against production.
 *
 * Safety:
 * - Never logs, throws, or returns file contents or secret values — only
 *   booleans and file paths (metadata safe to print/commit to docs).
 * - `targetEnv` values already set always win over file contents (an
 *   explicitly exported `TWIN_ACCESS_TOKEN` is never overridden).
 * - Missing files are a no-op, not an error.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HELPERS_DIR = dirname(fileURLToPath(import.meta.url));
const FRONTEND_ROOT = join(HELPERS_DIR, "..", "..");
const REPO_ROOT = join(FRONTEND_ROOT, "..");

export const DEFAULT_ROOT_ENV_LOCAL_PATH = join(REPO_ROOT, ".env.local");
export const DEFAULT_FRONTEND_ENV_LOCAL_PATH = join(FRONTEND_ROOT, ".env.local");

export type LoadLocalTestEnvOptions = {
  /** Overrides the root `.env.local` path — for tests only. */
  rootEnvPath?: string;
  /** Overrides the `frontend/.env.local` path — for tests only. */
  frontendEnvPath?: string;
  /** Overrides the mutated env object — defaults to `process.env`. For tests only. */
  targetEnv?: Record<string, string | undefined>;
};

export type LoadLocalTestEnvResult = {
  /** Absolute paths of files that existed and were parsed, in load order. */
  loadedFiles: string[];
  /** Whether `TWIN_ACCESS_TOKEN` is non-empty in `targetEnv` after loading. */
  tokenPresent: boolean;
  /** Whether each candidate file exists on disk, regardless of parse result. */
  sourceCandidates: {
    rootEnvLocal: boolean;
    frontendEnvLocal: boolean;
  };
};

/** Strips a leading UTF-8 BOM (`\uFEFF`), if present — some editors save `.env.local` with one. */
function stripBom(content: string): string {
  return content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
}

/** Minimal KEY=VALUE parser — comments, blank lines, optional quotes, `export ` prefix. */
function parseEnvFile(content: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const rawLine of stripBom(content).split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    // Tolerate any amount of whitespace after `export` (space or tab), not just a single space.
    const withoutExport = line.replace(/^export\s+/, "");
    const eqIndex = withoutExport.indexOf("=");
    if (eqIndex <= 0) continue;
    const key = withoutExport.slice(0, eqIndex).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let value = withoutExport.slice(eqIndex + 1).trim();
    const isDoubleQuoted = value.startsWith('"') && value.endsWith('"') && value.length >= 2;
    const isSingleQuoted = value.startsWith("'") && value.endsWith("'") && value.length >= 2;
    if (isDoubleQuoted || isSingleQuoted) value = value.slice(1, -1);
    values[key] = value;
  }
  return values;
}

/**
 * Reads + parses `path` into `target`, without overriding keys already set to a
 * non-empty value. An existing key that is present but empty (e.g. a shell that
 * exports `TWIN_ACCESS_TOKEN=` with no value) is treated as "not actually set"
 * so a real value from the file can still fill it in. Returns whether the file
 * existed.
 */
function loadFileInto(path: string, target: Record<string, string | undefined>): boolean {
  if (!existsSync(path)) return false;
  let content: string;
  try {
    content = readFileSync(path, "utf8");
  } catch {
    return false;
  }
  const parsed = parseEnvFile(content);
  for (const [key, value] of Object.entries(parsed)) {
    if (target[key] === undefined || target[key] === "") target[key] = value;
  }
  return true;
}

/**
 * Loads root `.env.local` then `frontend/.env.local` (deterministic order) into
 * `targetEnv` (defaults to `process.env`). Values already present in `targetEnv`
 * are never overridden — an explicitly exported shell var always wins.
 *
 * Safe to call unconditionally, including in Cursor-agent shells with no local
 * env files and in production/CI where `TWIN_ACCESS_TOKEN` is intentionally unset.
 */
export function loadLocalTestEnv(options: LoadLocalTestEnvOptions = {}): LoadLocalTestEnvResult {
  const rootEnvPath = options.rootEnvPath ?? DEFAULT_ROOT_ENV_LOCAL_PATH;
  const frontendEnvPath = options.frontendEnvPath ?? DEFAULT_FRONTEND_ENV_LOCAL_PATH;
  const targetEnv = options.targetEnv ?? (process.env as Record<string, string | undefined>);

  const rootEnvLocal = existsSync(rootEnvPath);
  const frontendEnvLocal = existsSync(frontendEnvPath);

  const loadedFiles: string[] = [];
  if (loadFileInto(rootEnvPath, targetEnv)) loadedFiles.push(rootEnvPath);
  if (loadFileInto(frontendEnvPath, targetEnv)) loadedFiles.push(frontendEnvPath);

  return {
    loadedFiles,
    tokenPresent: Boolean(targetEnv.TWIN_ACCESS_TOKEN?.trim()),
    sourceCandidates: { rootEnvLocal, frontendEnvLocal },
  };
}
