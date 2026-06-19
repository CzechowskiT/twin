import { NextResponse } from "next/server";

import { resolveDeployCommitFromEnv } from "@/lib/deploy-commit";
import { getUpstreamApiBase } from "@/lib/public-api-base";

export const dynamic = "force-dynamic";

/** Public proxy: API liveness + db_ok + ops flags (no secrets). */
export async function GET() {
  const base = getUpstreamApiBase();
  if (!base) {
    return NextResponse.json({ detail: "API base URL not configured" }, { status: 503 });
  }
  const root = base.replace(/\/$/, "");
  const healthTimeoutMs = 10_000;
  const celeryTimeoutMs = 4_000;
  let healthRes: Response;
  let celeryRes: Response;
  try {
    healthRes = await fetch(`${root}/api/v1/health?db=1&ops=1`, {
      cache: "no-store",
      signal: AbortSignal.timeout(healthTimeoutMs),
    });
    celeryRes = await fetch(`${root}/api/v1/health/celery-status`, {
      cache: "no-store",
      signal: AbortSignal.timeout(celeryTimeoutMs),
    }).catch(() => new Response(null, { status: 504 }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "fetch failed";
    return NextResponse.json(
      { detail: `Cannot reach API (${msg}).`, status: "degraded", db_ok: false },
      { status: 502 },
    );
  }
  if (!healthRes.ok) {
    const body = await healthRes.text();
    return new NextResponse(body, {
      status: healthRes.status,
      headers: { "Content-Type": healthRes.headers.get("content-type") ?? "application/json" },
    });
  }
  const health = (await healthRes.json()) as Record<string, unknown>;
  let celery: Record<string, unknown> = {};
  if (celeryRes.ok) {
    celery = (await celeryRes.json()) as Record<string, unknown>;
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
    // Explicit deploy traceability: Vercel FE vs Railway API (git_commit stays API for compat).
    frontend_commit: resolvedFrontend,
    api_commit: resolvedApi,
    backend_git_commit: resolvedApi,
    deployment_note:
      "git_commit and api_commit reflect Railway API; frontend_commit reflects Vercel. Scaffold HEAD may differ during partial deploys.",
    commit_interpretation: commitInterpretation,
  });
}
