import { NextResponse } from "next/server";

import { resolveDeployCommitFromEnv } from "@/lib/deploy-commit";
import { getUpstreamApiBase } from "@/lib/public-api-base";

export const dynamic = "force-dynamic";

/**
 * Health timeout is authoritative: a real upstream failure here must surface
 * as 502/degraded. Celery timeout is intentionally >= 5s (worker introspection
 * has been observed at ~4.3-4.5s) and is soft-fail-only — celery-status never
 * blocks or crashes the route; it is optional diagnostics attached to a
 * healthy response.
 */
const HEALTH_TIMEOUT_MS = 10_000;
const CELERY_TIMEOUT_MS = 5_000;

type JsonRecord = Record<string, unknown>;

/** Parse a Response body as JSON without throwing on empty/invalid bodies. */
async function safeReadJson(res: Response): Promise<JsonRecord | null> {
  try {
    const text = await res.text();
    if (!text) return null;
    return JSON.parse(text) as JsonRecord;
  } catch {
    return null;
  }
}

/**
 * Public proxy: API liveness + db_ok + ops flags (no secrets).
 *
 * `?mode=liveness` returns an immediate `{ status: "ok", mode: "liveness" }`
 * without contacting the upstream API/db/celery at all — a fast frontend
 * reachability probe. It is opt-in only; the **default** (no query param)
 * response is unchanged in shape and still round-trips upstream `db_ok` for
 * Gate E / evidence-doc backward compatibility.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get("mode") === "liveness") {
    return NextResponse.json({ status: "ok", mode: "liveness" });
  }

  const base = getUpstreamApiBase();
  if (!base) {
    return NextResponse.json({ detail: "API base URL not configured" }, { status: 503 });
  }
  const root = base.replace(/\/$/, "");

  // Fetch health (authoritative, strict timeout) and celery-status (optional,
  // soft-fail) in parallel so a slow celery introspection call can never push
  // total latency past the platform request timeout on its own.
  const [healthResult, celeryResult] = await Promise.allSettled([
    fetch(`${root}/api/v1/health?db=1&ops=1`, {
      cache: "no-store",
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    }),
    fetch(`${root}/api/v1/health/celery-status`, {
      cache: "no-store",
      signal: AbortSignal.timeout(CELERY_TIMEOUT_MS),
    }),
  ]);

  if (healthResult.status === "rejected") {
    const err = healthResult.reason;
    const msg = err instanceof Error ? err.message : "fetch failed";
    return NextResponse.json(
      { detail: `Cannot reach API (${msg}).`, status: "degraded", db_ok: false },
      { status: 502 },
    );
  }

  const healthRes = healthResult.value;
  if (!healthRes.ok) {
    const body = await healthRes.text();
    return new NextResponse(body, {
      status: healthRes.status,
      headers: { "Content-Type": healthRes.headers.get("content-type") ?? "application/json" },
    });
  }

  const health = await safeReadJson(healthRes);
  if (health === null) {
    return NextResponse.json(
      { detail: "API health response was not valid JSON.", status: "degraded", db_ok: false },
      { status: 502 },
    );
  }

  // celery-status is diagnostics only: any failure (timeout, non-2xx, bad
  // JSON) degrades to `{}` + a `celery_warning` string. It never changes the
  // response status and never throws.
  let celery: JsonRecord = {};
  let celeryWarning: string | null = null;
  if (celeryResult.status === "rejected") {
    const err = celeryResult.reason;
    celeryWarning = `celery-status unreachable: ${err instanceof Error ? err.message : "fetch failed"}`;
  } else if (!celeryResult.value.ok) {
    celeryWarning = `celery-status returned HTTP ${celeryResult.value.status}`;
  } else {
    const parsed = await safeReadJson(celeryResult.value);
    if (parsed === null) {
      celeryWarning = "celery-status response was not valid JSON";
    } else {
      celery = parsed;
    }
  }

  const apiCommit =
    typeof health.git_commit === "string" && health.git_commit !== "unknown"
      ? health.git_commit
      : null;
  const frontendCommit = resolveDeployCommitFromEnv();
  const resolvedApi = apiCommit ?? (typeof health.git_commit === "string" ? health.git_commit : "unknown");
  const resolvedFrontend = frontendCommit ?? "unknown";
  const shortFe = resolvedFrontend.slice(0, 7);
  const shortApi = resolvedApi.slice(0, 7);
  let commitInterpretation =
    "Compare scaffold HEAD, Vercel frontend_commit, and Railway api_commit/git_commit separately.";
  if (resolvedFrontend !== "unknown" && resolvedApi !== "unknown") {
    commitInterpretation =
      shortFe === shortApi
        ? "Frontend (Vercel) and API (Railway) commits match on short SHA — aligned deploy for this slice."
        : "Frontend (Vercel) and API (Railway) commits differ — common after frontend-only or backend-only PRs; verify Alembic head separately.";
  } else if (resolvedFrontend === "unknown" || resolvedApi === "unknown") {
    commitInterpretation =
      "One or both deploy SHAs unknown — check Vercel/Railway deploy logs; migration verification is independent of frontend deploy.";
  }
  return NextResponse.json({
    ...health,
    celery,
    ...(celeryWarning ? { celery_warning: celeryWarning } : {}),
    // Explicit deploy traceability: Vercel FE vs Railway API (git_commit stays API for compat).
    frontend_commit: resolvedFrontend,
    api_commit: resolvedApi,
    backend_git_commit: resolvedApi,
    deployment_note:
      "git_commit and api_commit reflect Railway API; frontend_commit reflects Vercel. Scaffold HEAD may differ during partial deploys.",
    commit_interpretation: commitInterpretation,
  });
}
