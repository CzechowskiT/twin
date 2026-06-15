/** Resolve deploy SHA from platform env (Vercel / Railway / manual). */
export function resolveDeployCommitFromEnv(
  env: Record<string, string | undefined> = process.env,
): string | null {
  for (const key of [
    "VERCEL_GIT_COMMIT_SHA",
    "RAILWAY_GIT_COMMIT_SHA",
    "GIT_COMMIT_SHA",
    "GIT_COMMIT",
  ] as const) {
    const raw = env[key]?.trim();
    if (raw) return raw.slice(0, 64);
  }
  return null;
}
