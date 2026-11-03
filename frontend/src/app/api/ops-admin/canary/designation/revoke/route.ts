import { proxyFounderCanary } from "@/lib/founder-canary-proxy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Founder-session proxy for designation revoke — no browser OPS token. */
export async function POST(req: Request) {
  return proxyFounderCanary(req, "/api/v1/admin/canary/designation/revoke");
}
